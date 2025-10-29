// backend/server.mjs

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import Redis from 'ioredis';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto'; // ✅ مضافة

import { ROLES } from '../shared/roles.js';
import { sanitizeUserForClient } from '../shared/userTypes.js';

import { joeRouter } from './src/routes/joeRouter.js';
import { factoryRouter } from './src/routes/factoryRouter.js';
import { publicSiteRouter } from './src/routes/publicSiteRouter.js';
import { dashboardDataRouter } from './src/routes/dashboardDataRouter.js';

dotenv.config();

// =========================
// basic express setup
// =========================
const app = express();
const PORT = process.env.PORT || 10000;
app.set('trust proxy', 1);

// أمن أساسي
app.use(helmet());

// Rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

// ✅ CORS CONFIG
// إذا عندك دومين ثابت للداشبورد ("https://xelitesolutions.com") حطه هون بدل الـ *
app.use(cors({
  origin: '*', // بدنا نخففها لاحقاً لدومينك بس
  credentials: true
}));

// JSON body
app.use(express.json({ limit: '2mb' }));

// uploads
const upload = multer({ dest: 'uploads/' });

// =========================
// Mongo setup
// =========================
const DB_NAME = process.env.DB_NAME || 'future_system';
let mongoClient = null;
let mongoDb = null;

async function initMongo() {
  if (mongoDb) return mongoDb;
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[Mongo] MONGO_URI missing in env');
    throw new Error('MONGO_URI missing');
  }
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  mongoDb = mongoClient.db(DB_NAME);
  console.log('[Mongo] Connected');
  return mongoDb;
}

// =========================
// Redis setup
// =========================
let redis = null;
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL);
    redis.on('error', (err) => {
      console.warn('[Redis WARNING]', err?.message || err);
    });
    console.log('[Redis] init requested:', process.env.REDIS_URL);
  } catch (err) {
    console.warn('[Redis init failed]', err?.message || err);
  }
} else {
  console.log('[Redis] disabled (no REDIS_URL)');
}

// =========================
// Google OAuth setup
// =========================
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleOAuthClient = (googleClientId && googleClientSecret)
  ? new OAuth2Client(googleClientId, googleClientSecret)
  : null;

// =========================
// Helpers
// =========================

function cryptoRandom() {
  // عملنا توليد توكن سيشن عالطريقة الصح
  return crypto.randomBytes(32).toString('hex');
}

// يعطيك middleware يشيك الصلاحية
function requireRole(minRole) {
  const rolePriority = {
    super_admin: 3,
    admin: 2,
    user: 1,
  };
  return async (req, res, next) => {
    try {
      const db = await initMongo();
      const token = req.headers['x-session-token'];
      if (!token) return res.status(401).json({ error: 'NO_TOKEN' });

      const sessionDoc = await db.collection('sessions').findOne({ token, active: true });
      if (!sessionDoc) return res.status(401).json({ error: 'INVALID_SESSION' });

      const userDoc = await db.collection('users').findOne({ _id: new ObjectId(sessionDoc.userId) });
      if (!userDoc) return res.status(401).json({ error: 'NO_USER' });

      req.user = userDoc;

      if (rolePriority[userDoc.role] < rolePriority[minRole]) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      const now = new Date();
      await db.collection('users').updateOne(
        { _id: userDoc._id },
        {
          $set: {
            lastSeenAt: now,
            activeSessionSince: sessionDoc.startedAt || now
          }
        }
      );

      next();
    } catch (err) {
      console.error('requireRole err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  };
}

// =========================
// AUTH ROUTES
// =========================

// (1) Bootstrap super admin
app.post('/api/auth/bootstrap-super', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'MISSING_FIELDS' });

    const db = await initMongo();
    const exist = await db.collection('users').findOne({ role: 'super_admin' });
    const now = new Date();

    if (exist) {
      // إذا السوبر أدمن موجود، نعمل له update (بمعنى تأكيد بياناته)
      console.log('[Auth] Super admin already exists');
      await db.collection('users').updateOne(
        { _id: exist._id },
        {
          $set: {
            email,
            phone: phone || exist.phone || null,
            lastLoginAt: now,
            activeSessionSince: now
          }
        }
      );
      return res.json({
        ok: true,
        mode: 'UPDATED_EXISTING_SUPER_ADMIN',
        superAdminId: exist._id.toString()
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      phone: phone || null,
      passwordHash: hash,
      role: 'super_admin',
      createdAt: now,
      lastLoginAt: now,
      activeSessionSince: now,
    };

    const result = await db.collection('users').insertOne(newUser);

    return res.json({
      ok: true,
      mode: 'CREATED_NEW_SUPER_ADMIN',
      superAdminId: result.insertedId.toString()
    });
  } catch (err) {
    console.error('bootstrap-super err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// (2) login email/phone + password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    const db = await initMongo();
    const userDoc = await db.collection('users').findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!userDoc) return res.status(401).json({ error: 'BAD_CREDENTIALS' });

    const match = await bcrypt.compare(password, userDoc.passwordHash || '');
    if (!match) return res.status(401).json({ error: 'BAD_CREDENTIALS' });

    const token = cryptoRandom();
    const now = new Date();

    await db.collection('sessions').insertOne({
      token,
      userId: userDoc._id,
      startedAt: now,
      active: true
    });

    await db.collection('users').updateOne(
      { _id: userDoc._id },
      { $set: { lastLoginAt: now, activeSessionSince: now } }
    );

    return res.json({
      ok: true,
      sessionToken: token,
      user: sanitizeUserForClient({ ...userDoc, activeSessionSince: now, lastLoginAt: now })
    });
  } catch (err) {
    console.error('login err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// (3) login with google
app.post('/api/auth/google', async (req, res) => {
  try {
    if (!googleOAuthClient) {
      return res.status(400).json({ error: 'GOOGLE_DISABLED' });
    }

    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'MISSING_ID_TOKEN' });

    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: googleClientId
    });
    const payload = ticket.getPayload();
    const email = payload.email;

    const db = await initMongo();
    let userDoc = await db.collection('users').findOne({ email });
    const now = new Date();

    if (!userDoc) {
      // مستخدم جديد عادي
      const newUser = {
        email,
        phone: null,
        passwordHash: null,
        role: 'user',
        createdAt: now,
        lastLoginAt: now,
        activeSessionSince: now,
      };
      const ins = await db.collection('users').insertOne(newUser);
      userDoc = { ...newUser, _id: ins.insertedId };
    } else {
      await db.collection('users').updateOne(
        { _id: userDoc._id },
        { $set: { lastLoginAt: now, activeSessionSince: now } }
      );
    }

    const token = cryptoRandom();
    await db.collection('sessions').insertOne({
      token,
      userId: userDoc._id,
      startedAt: now,
      active: true
    });

    return res.json({
      ok: true,
      sessionToken: token,
      user: sanitizeUserForClient({ ...userDoc, activeSessionSince: now, lastLoginAt: now })
    });
  } catch (err) {
    console.error('google login err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// =========================
// USERS MGMT (admin panel)
// =========================

// list users + stats
app.get('/api/admin/users', requireRole('admin'), async (req, res) => {
  try {
    const db = await initMongo();
    const arr = await db.collection('users')
      .find({})
      .sort({ lastLoginAt: -1 })
      .toArray();

    const totalActiveNow = await db.collection('sessions').countDocuments({ active: true });
    const totalSupers = arr.filter(u => u.role === 'super_admin').length;
    const totalAdmins = arr.filter(u => u.role === 'admin').length;
    const totalUsers = arr.filter(u => u.role === 'user').length;

    const mapped = arr.map(u => sanitizeUserForClient(u));

    return res.json({
      ok: true,
      stats: {
        totalActiveNow,
        totalSupers,
        totalAdmins,
        totalUsers,
      },
      users: mapped
    });
  } catch (err) {
    console.error('GET /api/admin/users err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// setRole
app.post('/api/admin/users/setRole', requireRole('super_admin'), async (req, res) => {
  try {
    const { userId, newRole } = req.body;
    if (!userId || !newRole) return res.status(400).json({ error: 'MISSING_FIELDS' });

    const db = await initMongo();
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { role: newRole } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admin/users/setRole err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// =========================
// attach routers
// =========================

app.use('/api/joe', joeRouter(initMongo, redis));
app.use('/api/factory', factoryRouter(initMongo, redis));
app.use('/api/dashboard', dashboardDataRouter(initMongo, redis));
app.use('/api/public-site', publicSiteRouter(initMongo));

// system health (بسيط، للوحة الـ dashboard-x)
app.get('/api/system/metrics', async (req, res) => {
  try {
    const db = await initMongo();

    const totalUsers = await db.collection('users').countDocuments({});
    const totalSessionsNow = await db.collection('sessions').countDocuments({ active: true });

    return res.json({
      ok: true,
      service: 'InfinityX Backend / Future Systems Core',
      joeOnline: true,
      factoryOnline: true,
      usersTotal: totalUsers,
      activeSessions: totalSessionsNow,
      redisOnline: !!redis,
      mongoOnline: true
    });
  } catch (err) {
    console.error('/api/system/metrics err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// root
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'InfinityX Backend / Future Systems Core',
    msg: 'Running',
    joeOnline: true,
    factoryOnline: true
  });
});

// start server
app.listen(PORT, () => {
  console.log(`InfinityX Backend running on ${PORT}`);
});
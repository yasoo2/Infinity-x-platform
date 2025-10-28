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
import crypto from 'crypto';

import { ROLES } from '../shared/roles.js';
import { sanitizeUserForClient } from '../shared/userTypes.js';

import { joeRouter } from './src/routes/joeRouter.js';
import { factoryRouter } from './src/routes/factoryRouter.js';
import { publicSiteRouter } from './src/routes/publicSiteRouter.js';
import { dashboardDataRouter } from './src/routes/dashboardDataRouter.js';

dotenv.config();

// -------------------------
// express setup
// -------------------------
const app = express();
const PORT = process.env.PORT || 10000;
app.set('trust proxy', 1);

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

const upload = multer({ dest: 'uploads/' });

// -------------------------
// Mongo
// -------------------------
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

// -------------------------
// Redis
// -------------------------
let redis = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  console.log('[Redis] init requested:', process.env.REDIS_URL);
} else {
  console.log('[Redis] disabled (no REDIS_URL)');
}

// -------------------------
// Google OAuth setup
// -------------------------
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleOAuthClient = (googleClientId && googleClientSecret)
  ? new OAuth2Client(googleClientId, googleClientSecret)
  : null;

// -------------------------
// helpers
// -------------------------
function cryptoRandom() {
  return crypto.randomBytes(32).toString('hex');
}

// لو احتجنا لاحقاً role check داخل راوترات ثانية
function requireRole(minRole) {
  const rolePriority = {
    [ROLES.SUPER_ADMIN]: 3,
    [ROLES.ADMIN]: 2,
    [ROLES.USER]: 1,
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

      // update activity (للعرض في لوحة X)
      await db.collection('users').updateOne(
        { _id: userDoc._id },
        { $set: {
          lastSeenAt: new Date(),
          activeSessionSince: sessionDoc.startedAt || new Date()
        }}
      );

      next();
    } catch (err) {
      console.error('requireRole err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  };
}

// -------------------------
// AUTH ROUTES
// -------------------------

// (A) أول سوبر أدمن (bootstrap)
app.post('/api/auth/bootstrap-super', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'MISSING_FIELDS' });

    const db = await initMongo();
    const exist = await db.collection('users').findOne({ role: ROLES.SUPER_ADMIN });
    if (exist) {
      console.log('[Auth] Super admin already exists');
      return res.json({ ok: true, msg: 'Super admin already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const now = new Date();
    const newUser = {
      email,
      phone: phone || null,
      passwordHash: hash,
      role: ROLES.SUPER_ADMIN,
      createdAt: now,
      lastLoginAt: now,
      activeSessionSince: now,
    };

    const result = await db.collection('users').insertOne(newUser);

    return res.json({
      ok: true,
      superAdminId: result.insertedId.toString()
    });
  } catch (err) {
    console.error('bootstrap-super err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// (B) لوجين طبيعي (إيميل/موبايل + باسورد)
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

// (C) لوجين بجوجل
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
      const newUser = {
        email,
        phone: null,
        passwordHash: null,
        role: ROLES.USER,
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

// (D) الإندبوينت المؤقت: إصلاح/فرض السوبر أدمِن
// IMPORTANT: بعد ما ندخل ونمشي الأمور، بتحذف هذا الراوت من السيرفر عشان الأمان.
app.post('/api/auth/dev-force-super', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    const db = await initMongo();
    const now = new Date();
    const hash = await bcrypt.hash(password, 10);

    const existingSuper = await db.collection('users').findOne({ role: ROLES.SUPER_ADMIN });

    if (existingSuper) {
      // عدّل السوبر أدمِن الحالي ليصير على بياناتك انت
      await db.collection('users').updateOne(
        { _id: existingSuper._id },
        {
          $set: {
            email,
            phone: phone || existingSuper.phone || null,
            passwordHash: hash,
            lastLoginAt: now,
            activeSessionSince: now
          }
        }
      );

      return res.json({
        ok: true,
        mode: 'UPDATED_EXISTING_SUPER_ADMIN',
        superAdminId: existingSuper._id.toString()
      });
    } else {
      // ما في سوبر أدمِن؟ بننشئ واحد جديد إلك
      const newUser = {
        email,
        phone: phone || null,
        passwordHash: hash,
        role: ROLES.SUPER_ADMIN,
        createdAt: now,
        lastLoginAt: now,
        activeSessionSince: now,
      };
      const ins = await db.collection('users').insertOne(newUser);

      return res.json({
        ok: true,
        mode: 'CREATED_NEW_SUPER_ADMIN',
        superAdminId: ins.insertedId.toString()
      });
    }
  } catch (err) {
    console.error('dev-force-super err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// -------------------------
// USERS MGMT (admin panel)
// -------------------------
app.get('/api/admin/users', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const db = await initMongo();
    const arr = await db.collection('users')
      .find({})
      .sort({ lastLoginAt: -1 })
      .toArray();

    const totalActiveNow = await db.collection('sessions').countDocuments({ active: true });
    const totalSupers = arr.filter(u => u.role === ROLES.SUPER_ADMIN).length;
    const totalAdmins = arr.filter(u => u.role === ROLES.ADMIN).length;
    const totalUsers = arr.filter(u => u.role === ROLES.USER).length;

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

app.post('/api/admin/users/setRole', requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
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

// -------------------------
// attach feature routers
// -------------------------
app.use('/api/joe', joeRouter(initMongo, redis));
app.use('/api/factory', factoryRouter(initMongo, redis));
app.use('/api/dashboard', dashboardDataRouter(initMongo, redis));
app.use('/api/public-site', publicSiteRouter(initMongo));

// -------------------------
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'InfinityX Backend / Future Systems Core',
    msg: 'Running',
    joeOnline: true,
    factoryOnline: true
  });
});

// -------------------------
app.listen(PORT, async () => {
  console.log(`InfinityX Backend running on ${PORT}`);
});
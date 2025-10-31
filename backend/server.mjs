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
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { ROLES } from '../shared/roles.js';
import { sanitizeUserForClient } from '../shared/userTypes.js';

// راوترات
import { joeRouter } from './src/routes/joeRouter.js';
import { factoryRouter } from './src/routes/factoryRouter.js';
import { publicSiteRouter } from './src/routes/publicSiteRouter.js';
import { dashboardDataRouter } from './src/routes/dashboardDataRouter.js';
import { SimpleWorkerManager } from './src/workers/SimpleWorkerManager.mjs';
import selfDesignRouter from './src/routes/selfDesign.mjs';
import storeIntegrationRouter from './src/routes/storeIntegration.mjs';
import universalStoreRouter from './src/routes/universalStore.mjs';
import pageBuilderRouter from './src/routes/pageBuilder.mjs';
import githubManagerRouter from './src/routes/githubManager.mjs';
import integrationManagerRouter from './src/routes/integrationManager.mjs';
import selfEvolutionRouter from './src/routes/selfEvolution.mjs';
import joeChatRouter from './src/routes/joeChat.mjs';
import browserControlRouter from './src/routes/browserControl.mjs';
import chatHistoryRouter from './src/routes/chatHistory.mjs';

dotenv.config();

// =========================
// إعداد السيرفر الأساسي
// =========================
const app = express();
const PORT = process.env.PORT || 10000;
app.set('trust proxy', 1);

// helmet + rateLimit
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

// -------------------------
// CORS CONFIG
// -------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://admin.xelitesolutions.com',
  'https://dashboard.xelitesolutions.com',
  'https://xelitesolutions.com',
  'https://www.xelitesolutions.com'
];

// نسمح مؤقت لأي Origin إذا مو موجود بالقائمة (حتى ما نوقف التطوير)
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // لو ما كان موجود بالقائمة نسمح برضو بس بنطبع تحذير
    console.warn('[CORS] Origin not in whitelist:', origin);
    cb(null, true);
  },
  credentials: true,
}));

// لقراءة JSON من البودي
app.use(express.json({ limit: '2mb' }));

// Multer للملفات (ممكن جو يرفع/يحمل snapshots)
const upload = multer({ dest: 'uploads/' });

// =========================
// MongoDB
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
// Redis (اختياري حاليًّا)
// =========================
const useRedis = true; // إذا بدك توقفه مؤقت = false
let redis = null;

if (useRedis && process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  console.log('[Redis] init requested:', process.env.REDIS_URL);

  redis.on('error', (err) => {
    console.error('[Redis] error:', err?.message || err);
  });
} else {
  console.log('[Redis] disabled or missing REDIS_URL');
}

// =========================
// Google OAuth
// =========================
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleOAuthClient = (googleClientId && googleClientSecret)
  ? new OAuth2Client(googleClientId, googleClientSecret)
  : null;

// =========================
// Helpers
// =========================

// دالة تعمل random token للجلسة
function cryptoRandom() {
  return crypto.randomBytes(32).toString('hex');
}

// ترتيب الأولوية بين الرولز
const rolePriority = {
  [ROLES.SUPER_ADMIN]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.USER]: 1,
};

// ميدلوير يتحقق من التوكن ويجيب المستخدم ويشيك إذا صلاحياته كافية
function requireRole(minRole) {
  return async (req, res, next) => {
    try {
      const db = await initMongo();

      const token = req.headers['x-session-token'];
      if (!token) return res.status(401).json({ error: 'NO_TOKEN' });

      const sessionDoc = await db.collection('sessions').findOne({
        token,
        active: true
      });

      if (!sessionDoc) return res.status(401).json({ error: 'INVALID_SESSION' });

      const userDoc = await db.collection('users').findOne({
        _id: new ObjectId(sessionDoc.userId)
      });

      if (!userDoc) return res.status(401).json({ error: 'NO_USER' });

      // تحقّق رول
      if (rolePriority[userDoc.role] < rolePriority[minRole]) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      // تحديث نشاط المستخدم
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

      req.user = userDoc;
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

// bootstrap-super
// أول سوبر أدمن / أو تحديث السوبر أدمن الحالي
app.post('/api/auth/bootstrap-super', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    const db = await initMongo();
    const exist = await db.collection('users').findOne({ role: ROLES.SUPER_ADMIN });

    const now = new Date();
    const hash = await bcrypt.hash(password, 10);

    if (exist) {
      // إذا عندنا سوبر أدمن، منحدّث بياناته
      await db.collection('users').updateOne(
        { _id: exist._id },
        {
          $set: {
            email,
            phone: phone || exist.phone || null,
            passwordHash: hash,
            lastLoginAt: now,
            activeSessionSince: now,
          }
        }
      );

      return res.json({
        ok: true,
        mode: 'UPDATED_EXISTING_SUPER_ADMIN',
        superAdminId: exist._id.toString()
      });
    } else {
      // ما في سوبر، مننشئ واحد جديد
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
    console.error('bootstrap-super err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// login (emailOrPhone + password)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    const db = await initMongo();

    const userDoc = await db.collection('users').findOne({
      $or: [
        { email: emailOrPhone },
        { phone: emailOrPhone }
      ]
    });

    if (!userDoc) {
      return res.status(401).json({ error: 'BAD_CREDENTIALS' });
    }

    const match = await bcrypt.compare(password, userDoc.passwordHash || '');
    if (!match) {
      return res.status(401).json({ error: 'BAD_CREDENTIALS' });
    }

    const now = new Date();
    const token = cryptoRandom();

    await db.collection('sessions').insertOne({
      token,
      userId: userDoc._id,
      startedAt: now,
      active: true
    });

    await db.collection('users').updateOne(
      { _id: userDoc._id },
      {
        $set: {
          lastLoginAt: now,
          activeSessionSince: now
        }
      }
    );

    return res.json({
      ok: true,
      sessionToken: token,
      user: sanitizeUserForClient({
        ...userDoc,
        lastLoginAt: now,
        activeSessionSince: now
      })
    });

  } catch (err) {
    console.error('login err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'PASSWORD_TOO_SHORT' });
    }

    const db = await initMongo();

    const existingUser = await db.collection('users').findOne({
      $or: [
        { email: email },
        ...(phone ? [{ phone: phone }] : [])
      ]
    });

    if (existingUser) {
      return res.status(409).json({ error: 'EMAIL_EXISTS' });
    }

    const now = new Date();
    const hash = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      phone: phone || null,
      passwordHash: hash,
      role: ROLES.USER,
      createdAt: now,
      lastLoginAt: null,
      activeSessionSince: null,
    };

    const result = await db.collection('users').insertOne(newUser);

    return res.json({
      ok: true,
      userId: result.insertedId.toString(),
      message: 'User created successfully'
    });

  } catch (err) {
    console.error('register err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// login with Google
app.post('/api/auth/google', async (req, res) => {
  try {
    if (!googleOAuthClient) {
      return res.status(400).json({ error: 'GOOGLE_DISABLED' });
    }

    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'MISSING_ID_TOKEN' });
    }

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
      // مستخدم جديد
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
        {
          $set: {
            lastLoginAt: now,
            activeSessionSince: now
          }
        }
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
      user: sanitizeUserForClient({
        ...userDoc,
        lastLoginAt: now,
        activeSessionSince: now
      })
    });

  } catch (err) {
    console.error('google login err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// =========================
// إدارة المستخدمين (لوحة X)
// =========================

// احصائيات المستخدمين + أونلاين + آخر دخول
app.get('/api/admin/users', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const db = await initMongo();

    const arr = await db.collection('users')
      .find({})
      .sort({ lastLoginAt: -1 })
      .toArray();

    const totalActiveNow = await db.collection('sessions').countDocuments({
      active: true
    });

    const totalSupers = arr.filter(u => u.role === ROLES.SUPER_ADMIN).length;
    const totalAdmins = arr.filter(u => u.role === ROLES.ADMIN).length;
    const totalUsers = arr.filter(u => u.role === ROLES.USER).length;

    return res.json({
      ok: true,
      stats: {
        totalActiveNow,
        totalSupers,
        totalAdmins,
        totalUsers,
      },
      users: arr.map(u => sanitizeUserForClient(u))
    });

  } catch (err) {
    console.error('GET /api/admin/users err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// تعديل رول المستخدم (بس السوبر أدمن)
app.post('/api/admin/users/setRole', requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const { userId, newRole } = req.body;
    if (!userId || !newRole) {
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    const db = await initMongo();
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          role: newRole
        }
      }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admin/users/setRole err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// =========================
// system metrics (للوحة X)
// =========================
app.get('/api/system/metrics', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const db = await initMongo();

    const totalUsers = await db.collection('users').countDocuments({});
    const totalSessionsNow = await db.collection('sessions').countDocuments({
      active: true
    });

    const recentActivity = await db.collection('joe_activity')
      .find({})
      .sort({ ts: -1 })
      .limit(10)
      .toArray();

    res.json({
      ok: true,
      system: {
        usersTotal: totalUsers,
        activeSessions: totalSessionsNow,
        redisOnline: !!redis,
        mongoOnline: true
      },
      joeRecent: recentActivity.map(e => ({
        ts: e.ts,
        action: e.action,
        detail: e.detail
      }))
    });
  } catch (err) {
    console.error('/api/system/metrics err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// =========================
// راوترات جو / المصنع / الداشبورد / الموقع العام
// =========================
app.use('/api/joe', joeRouter(initMongo, redis));
app.use('/api/factory', factoryRouter(initMongo, redis));
app.use('/api/dashboard', dashboardDataRouter(initMongo, redis));
app.use('/api/public-site', publicSiteRouter(initMongo));
app.use('/api/self-design', selfDesignRouter);
app.use('/api/store', storeIntegrationRouter);
app.use('/api/universal-store', universalStoreRouter);
app.use('/api/page-builder', pageBuilderRouter);
app.use('/api/github-manager', githubManagerRouter);
app.use('/api/integrations', integrationManagerRouter);
app.use('/api/self-evolution', selfEvolutionRouter);
app.use('/api/joe', joeChatRouter);
app.use('/api/browser', browserControlRouter);
app.use('/api/chat-history', chatHistoryRouter);

// هذه للوحة المصنع: عرض آخر jobs
app.get('/api/factory/jobs', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const db = await initMongo();
    const jobs = await db.collection('factory_jobs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    res.json({
      ok: true,
      jobs: jobs.map(j => ({
        id: j._id.toString(),
        projectType: j.projectType,
        status: j.status,
        createdAt: j.createdAt,
        shortDescription: j.shortDescription || ''
      }))
    });
  } catch (err) {
    console.error('/api/factory/jobs err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// =========================
// روت فحص سريع
// =========================
app.get('/', async (req, res) => {
  res.json({
    ok: true,
    service: 'InfinityX Backend / Future Systems Core',
    msg: 'Running',
    joeOnline: true,
    factoryOnline: true
  });
});

// =========================
// Initialize Worker Manager
// =========================
const workerManager = new SimpleWorkerManager({
  maxConcurrent: 3
});

// Start Worker Manager
workerManager.start().then(() => {
  console.log('✅ Worker Manager started successfully');
}).catch((error) => {
  console.error('❌ Worker Manager failed to start:', error);
});

// Worker Manager stats endpoint
app.get('/api/worker/stats', (req, res) => {
  res.json({
    ok: true,
    stats: workerManager.getStats()
  });
});

// =========================
// Start server
// =========================
app.listen(PORT, () => {
  console.log(`🚀 InfinityX Backend running on port ${PORT}`);
  console.log(`📊 Worker Manager: ${workerManager.isRunning ? 'ONLINE' : 'OFFLINE'}`);
});
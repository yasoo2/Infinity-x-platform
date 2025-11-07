// backend/server.mjs - النسخة الكاملة والمعدلة - Fixed Imports
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
import http from 'http';  // ← نقلناه هنا لأعلى
import { ROLES } from './shared/roles.js';
import { sanitizeUserForClient } from './shared/userTypes.js';
// راوترات
import { joeRouter } from './src/routes/joeRouter.js';
import { factoryRouter } from './src/routes/factoryRouter.js';
import { publicSiteRouter } from './src/routes/publicSiteRouter.js';
import { dashboardDataRouter } from './src/routes/dashboardDataRouter.js';
import { SimpleWorkerManager } from './src/workers/SimpleWorkerManager.mjs';
import { BullMQWorkerManager } from './src/workers/BullMQWorkerManager.mjs';
import { getUpstashRedis, testRedisConnection } from './src/utils/upstashRedis.mjs';
import { cacheManager } from './src/utils/cacheManager.mjs';
import selfDesignRouter from './src/routes/selfDesign.mjs';
import storeIntegrationRouter from './src/routes/storeIntegration.mjs';
import universalStoreRouter from './src/routes/universalStore.mjs';
import pageBuilderRouter from './src/routes/pageBuilder.mjs';
import githubManagerRouter from './src/routes/githubManager.mjs';
import integrationManagerRouter from './src/routes/integrationManager.mjs';
import selfEvolutionRouter from './src/routes/selfEvolution.mjs';
import joeChatRouter from './src/routes/joeChat.mjs';
import joeChatAdvancedRouter from './src/routes/joeChatAdvanced.mjs';
import browserControlRouter from './src/routes/browserControl.mjs';
import chatHistoryRouter from './src/routes/chatHistory.mjs';
import fileUploadRouter from './src/routes/fileUpload.mjs';
import BrowserWebSocketServer from './src/services/browserWebSocket.mjs';
import testGrokRouter from './src/routes/testGrok.mjs';
import liveStreamRouter from './src/routes/liveStreamRouter.mjs';
import LiveStreamWebSocketServer from './src/services/liveStreamWebSocket.mjs';
// Advanced Systems - New Features
import SandboxManager from './src/sandbox/SandboxManager.mjs';
import AdvancedToolsManager from './src/tools/AdvancedToolsManager.mjs';
import PlanningSystem from './src/planning/PlanningSystem.mjs';
import SchedulingSystem from './src/scheduling/SchedulingSystem.mjs';
import AdvancedBrowserManager from './src/browser/AdvancedBrowserManager.mjs';
import SecurityManager from './src/security/SecurityManager.mjs';
import sandboxRoutes from './src/routes/sandboxRoutes.mjs';
import planningRoutes from './src/routes/planningRoutes.mjs';
// إعدادات قاعدة البيانات
import { initMongo, getDB, closeMongoConnection } from './src/db.mjs';

dotenv.config();

// =========================
// إعداد السيرفر الأساسي
// =========================
const app = express();
const PORT = process.env.PORT || 10000;
app.set('trust proxy', 1);

// إعدادات الأمان
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'TOO_MANY_REQUESTS' }
}));

// -------------------------
// CORS CONFIG - Fixed for preflight requests
// -------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://admin.xelitesolutions.com',
  'https://dashboard.xelitesolutions.com',
  'https://xelitesolutions.com',
  'https://www.xelitesolutions.com',
  'https://api.xelitesolutions.com'
];
app.use(cors({
  origin: '*', // Allow all origins - for production, use allowedOrigins whitelist
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-Requested-With'],
  exposedHeaders: ['X-Session-Token'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// middleware للـ logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// لقراءة JSON من البودي
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Multer للملفات
const upload = multer({ dest: 'uploads/' });

// =========================
// Redis (Disabled - Using Upstash REST API instead)
// =========================
// Old ioredis connection disabled to avoid connection errors
// Now using Upstash REST API via @upstash/redis
let redis = null;
console.log('✅ Redis: Using Upstash REST API (see upstashRedis.mjs)');

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
// Health Checks
// =========================
app.get('/api/v1/health', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    workers: false
  };
 
  try {
    const db = await initMongo();
    await db.command({ ping: 1 });
    checks.database = true;
  } catch (err) {
    console.error('Health check - DB failed:', err);
  }
 
  if (redis) {
    try {
      await redis.ping();
      checks.redis = true;
    } catch (err) {
      console.error('Health check - Redis failed:', err);
    }
  }
 
  checks.workers = workerManager?.isRunning || false;
 
  const isHealthy = checks.database && (!redis || checks.redis);
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  });
});

// =========================
// AUTH ROUTES
// =========================
// bootstrap-super
app.post('/api/v1/auth/bootstrap-super', async (req, res) => {
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
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    console.log('[LOGIN] Attempt with:', emailOrPhone);
   
    if (!emailOrPhone || !password) {
      console.log('[LOGIN] Missing fields');
      return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    const db = await initMongo();
    console.log('[LOGIN] DB connected');
    const userDoc = await db.collection('users').findOne({
      $or: [
        { email: emailOrPhone },
        { phone: emailOrPhone }
      ]
    });
    if (!userDoc) {
      console.log('[LOGIN] User not found:', emailOrPhone);
      return res.status(401).json({ error: 'BAD_CREDENTIALS' });
    }
    console.log('[LOGIN] User found:', userDoc.email, 'has passwordHash:', !!userDoc.passwordHash);
   
    const match = await bcrypt.compare(password, userDoc.passwordHash || '');
    console.log('[LOGIN] Password match:', match);
   
    if (!match) {
      console.log('[LOGIN] Password mismatch for:', emailOrPhone);
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
app.post('/api/v1/auth/register', async (req, res) => {
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
app.post('/api/v1/auth/google', async (req, res) => {
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
        lastLoginAt: now

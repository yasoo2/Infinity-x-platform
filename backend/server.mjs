// backend/server.mjs - النسخة الكاملة والمعدلة - Fixed Syntax & Imports
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
import http from 'http';
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

/// =========================
// بدء تشغيل السيرفر
// ============================
const app = express();
const PORT = process.env.PORT || 4000; // Use Render's PORT env var, fallback to 4000 for local dev
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
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Session-Token', 'Content-Range', 'X-Content-Range'],
  maxAge: 86400,
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
function cryptoRandom() {
  return crypto.randomBytes(32).toString('hex');
}

const rolePriority = {
  [ROLES.SUPER_ADMIN]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.USER]: 1,
};

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
app.get('/api/v1/admin/users', requireRole(ROLES.ADMIN), async (req, res) => {
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
app.post('/api/v1/admin/users/setRole', requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
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
app.use('/api/v1/system', requireRole(ROLES.ADMIN), dashboardDataRouter(initMongo, redis));

// =========================
// راوترات جو / المصنع / الداشبورد / الموقع العام
// =========================
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'InfinityX Backend', status: 'Running' });
});
app.use("/api/v1/joe/control", joeRouter(initMongo, redis));
app.use('/api/v1/factory', factoryRouter(initMongo, redis));
app.use('/api/v1/dashboard', dashboardDataRouter(initMongo, redis));
app.use('/api/v1/public-site', publicSiteRouter(initMongo));
app.use('/api/v1/self-design', selfDesignRouter);
app.use('/api/v1/store', storeIntegrationRouter);
app.use('/api/v1/universal-store', universalStoreRouter);
app.use('/api/v1/page-builder', pageBuilderRouter);
app.use('/api/v1/github-manager', githubManagerRouter);
app.use('/api/v1/integrations', integrationManagerRouter);
app.use('/api/v1/self-evolution', selfEvolutionRouter);
app.use("/api/v1/joe/chat", requireRole(ROLES.USER), joeChatRouter);
app.post('/api/v1/joe/chat-advanced', async (req, res) => {
  const { joeAdvancedEngine } = await import('./src/lib/joeAdvancedEngine.mjs');
  const { message, context = [] } = req.body;
  try {
    const result = await joeAdvancedEngine.processMessageManus(message, context);
    res.json({ ok: true, response: result.response, toolsUsed: result.toolsUsed || [] });
  } catch (error) {
    console.error('❌ Direct JOE Advanced error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});
// app.use("/api/v1/joe/chat-advanced", joeChatAdvancedRouter); // Disabled for direct testing
// app.use("/api/joe/chat-advanced", joeChatAdvancedRouter); // Disabled for direct testing
app.use('/api/v1/browser', requireRole(ROLES.ADMIN), browserControlRouter);
app.use('/api/v1/chat-history', chatHistoryRouter);
// app.get('/api/test-route', (req, res) => res.json({ ok: true, message: 'Test route works!' })); // Removed test route
app.use('/api/chat-history', chatHistoryRouter); // For compatibility
app.use('/api/v1/file', fileUploadRouter);
app.use('/api/v1', testGrokRouter);
app.use('/api/live-stream', liveStreamRouter);

// Advanced Systems Routes (New Features)
app.use('/api/v1/sandbox', sandboxRoutes);
app.use('/api/v1/planning', planningRoutes);

// =========================
// Serve Frontend Static Files
// =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.join(__dirname, '../dashboard-x/dist');

// Serve static files from dashboard-x/dist
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  console.log('✅ Serving frontend from:', frontendDistPath);
  
  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Skip if it's an API route
    if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
      return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.warn('⚠️ Frontend dist folder not found at:', frontendDistPath);
  console.warn('⚠️ Run "cd dashboard-x && pnpm build" to build the frontend');
}

// هذه للوحة المصنع: عرض آخر jobs
app.get('/api/v1/factory/jobs', requireRole(ROLES.ADMIN), async (req, res) => {
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
    console.error('/api/v1/factory/jobs err', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// =========================
// Initialize Worker Manager
// =========================
let workerManager;

// Try BullMQ first, fallback to SimpleWorkerManager
async function initializeWorkerManager() {
  // Initialize Upstash Redis first
  const redis = getUpstashRedis();
  if (redis) {
    const testResult = await testRedisConnection();
    if (testResult.ok) {
      console.log('✅ Upstash Redis is ready');
      console.log('✅ Cache Manager:', cacheManager.isEnabled() ? 'ENABLED' : 'DISABLED');
    } else {
      console.warn('⚠️ Upstash Redis test failed:', testResult.error);
    }
  }

  // Try BullMQ if REDIS_URL is available (ioredis)
  if (process.env.REDIS_URL) {
    // التحقق من اتصال Redis قبل محاولة بدء BullMQ
    if (BullMQWorkerManager.isConnected()) {
      try {
        console.log('🔄 Attempting to start BullMQ Worker Manager...');
        workerManager = new BullMQWorkerManager();
        await workerManager.start();
        console.log('✅ BullMQ Worker Manager started successfully');
        return;
      } catch (error) {
        console.warn('⚠️ BullMQ failed, falling back to SimpleWorkerManager:', error.message);
      }
    } else {
      console.warn('⚠️ Redis connection failed. Skipping BullMQ Worker Manager.');
    }
  }

  // Fallback to SimpleWorkerManager
  try {
    console.log('🔄 Starting SimpleWorkerManager...');
    workerManager = new SimpleWorkerManager({ maxConcurrent: 3 });
    await workerManager.start();
    console.log('✅ SimpleWorkerManager started successfully');
  } catch (error) {
    console.error('❌ All Worker Managers failed to start:', error);
    workerManager = {
      isRunning: false,
      getStats: () => ({ error: 'Worker Manager not available' })
    };
  }
}

// Start Worker Manager
initializeWorkerManager();

// Worker Manager stats endpoint
app.get('/api/v1/worker/stats', (req, res) => {
  res.json({
    ok: true,
    stats: workerManager?.getStats?.() || { error: 'Worker Manager not available' }
  });
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
    factoryOnline: true,
    timestamp: new Date().toISOString()
  });
});



// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// =========================
// Graceful Shutdown
// =========================
async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
 
  if (workerManager && workerManager.stop) {
    await workerManager.stop().catch(console.error);
  }
 
  await closeMongoConnection();
 
  if (redis) {
    await redis.quit().catch(console.error);
  }
 
  console.log('Shutdown completed');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// =========================
// Start server
// =========================
const server = http.createServer(app);

// Initialize Browser WebSocket
const browserWS = new BrowserWebSocketServer(server);
console.log('🌐 Browser WebSocket initialized at /ws/browser');

// Initialize Live Stream WebSocket
const liveStreamWS = new LiveStreamWebSocketServer(server);
console.log('🎬 Live Stream WebSocket initialized at /ws/live-stream');

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 InfinityX Backend running on port ${PORT}`);
  console.log(`📊 Worker Manager: ${workerManager?.isRunning ? 'ONLINE' : 'OFFLINE'}`);
  console.log(`🌐 Health check available at: http://0.0.0.0:${PORT}/health`);
  console.log(`🖥️ Browser WebSocket available at: ws://0.0.0.0:${PORT}/ws/browser`);
});

export default app;

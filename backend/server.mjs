// backend/server.mjs - النسخة الكاملة والمصححة (بدون حذف)
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

// ✅ Routes & Services
import { ROLES } from './shared/roles.js';
import { sanitizeUserForClient } from './shared/userTypes.js';
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
import testGrokRouter from './src/routes/testGrok.mjs';
import liveStreamRouter from './src/routes/liveStreamRouter.mjs';

// ✅ Advanced Systems
import SandboxManager from './src/sandbox/SandboxManager.mjs';
import AdvancedToolsManager from './src/tools/AdvancedToolsManager.mjs';
import PlanningSystem from './src/planning/PlanningSystem.mjs';
import SchedulingSystem from './src/scheduling/SchedulingSystem.mjs';
import AdvancedBrowserManager from './src/browser/AdvancedBrowserManager.mjs';
import SecurityManager from './src/security/SecurityManager.mjs';
import sandboxRoutes from './src/routes/sandboxRoutes.mjs';
import planningRoutes from './src/routes/planningRoutes.mjs';

// ✅ WebSocket Services
import BrowserWebSocketServer from './src/services/browserWebSocket.mjs';
import LiveStreamWebSocketServer from './src/services/liveStreamWebSocket.mjs';

// ✅ DB
import { initMongo, closeMongoConnection } from './src/db.mjs';

dotenv.config();

// =========================
// Init Express App
// =========================
const app = express();
const PORT = process.env.PORT || 4000;
app.set('trust proxy', 1);

// =========================
// Security Middlewares
// =========================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'TOO_MANY_REQUESTS' }
}));

// =========================
// CORS (Safe & Production-Ready)
// =========================
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
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// =========================
// Logging Middleware
// =========================
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// =========================
// Body Parsing
// =========================
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// =========================
// Google OAuth
// =========================
const googleOAuthClient = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  : null;

// =========================
// Utility: Crypto Random
// =========================
const cryptoRandom = () => crypto.randomBytes(32).toString('hex');

// =========================
// Role Middleware
// =========================
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

      const session = await db.collection('sessions').findOne({ token, active: true });
      if (!session) return res.status(401).json({ error: 'INVALID_SESSION' });

      const user = await db.collection('users').findOne({ _id: new ObjectId(session.userId) });
      if (!user) return res.status(401).json({ error: 'NO_USER' });

      if (rolePriority[user.role] < rolePriority[minRole]) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error('requireRole error:', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  };
}

// =========================
// Health Check
// =========================
app.get('/api/v1/health', async (req, res) => {
  const checks = { database: false, redis: false, workers: false };

  try {
    const db = await initMongo();
    await db.command({ ping: 1 });
    checks.database = true;
  } catch (err) {
    console.error('Health check - DB failed:', err);
  }

  checks.workers = workerManager?.isRunning || false;

  const isHealthy = checks.database;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  });
});

// =========================
// Auth Routes
// =========================
app.post('/api/v1/auth/bootstrap-super', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'MISSING_FIELDS' });

    const db = await initMongo();
    const exist = await db.collection('users').findOne({ role: ROLES.SUPER_ADMIN });
    const hash = await bcrypt.hash(password, 10);

    if (exist) {
      await db.collection('users').updateOne(
        { _id: exist._id },
        { $set: { email, phone: phone || null, passwordHash: hash } }
      );
      return res.json({ ok: true, mode: 'UPDATED_EXISTING_SUPER_ADMIN' });
    } else {
      const newUser = {
        email,
        phone: phone || null,
        passwordHash: hash,
        role: ROLES.SUPER_ADMIN,
        createdAt: new Date(),
      };
      const result = await db.collection('users').insertOne(newUser);
      return res.json({ ok: true, mode: 'CREATED_NEW_SUPER_ADMIN', superAdminId: result.insertedId });
    }
  } catch (err) {
    console.error('bootstrap-super error:', err);
    res.status(500).json({ error: 'SERVER_ERR' });
  }
});

// =========================
// Apply Routes
// =========================
app.use('/api/v1/joe/control', joeRouter(initMongo));
app.use('/api/v1/factory', factoryRouter(initMongo));
app.use('/api/v1/dashboard', dashboardDataRouter(initMongo));
app.use('/api/v1/public-site', publicSiteRouter(initMongo));
app.use('/api/v1/self-design', selfDesignRouter);
app.use('/api/v1/store', storeIntegrationRouter);
app.use('/api/v1/universal-store', universalStoreRouter);
app.use('/api/v1/page-builder', pageBuilderRouter);
app.use('/api/v1/github-manager', githubManagerRouter);
app.use('/api/v1/integrations', integrationManagerRouter);
app.use('/api/v1/self-evolution', selfEvolutionRouter);
app.use('/api/v1/joe/chat', requireRole(ROLES.USER), joeChatRouter);
app.use('/api/v1/joe/chat-advanced', joeChatAdvancedRouter);
app.use('/api/v1/browser', requireRole(ROLES.ADMIN), browserControlRouter);
app.use('/api/v1/chat-history', chatHistoryRouter);
app.use('/api/v1/file', fileUploadRouter);
app.use('/api/v1', testGrokRouter);
app.use('/api/live-stream', liveStreamRouter);

// ✅ Advanced Routes
app.use('/api/v1/sandbox', sandboxRoutes);
app.use('/api/v1/planning', planningRoutes);
// =========================
// Frontend Static Files
// =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.join(__dirname, '../dashboard-x/dist');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
      return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.warn('⚠️ Frontend dist folder not found at:', frontendDistPath);
}

// =========================
// Worker Manager
// =========================
let workerManager;

async function initializeWorkerManager() {
  try {
    workerManager = new SimpleWorkerManager({ maxConcurrent: 3 });
    await workerManager.start();
    console.log('✅ SimpleWorkerManager started');
  } catch (error) {
    console.error('❌ Worker Manager failed:', error);
    workerManager = { isRunning: false };
  }
}

initializeWorkerManager();

// =========================
// Graceful Shutdown
// =========================
async function gracefulShutdown() {
  console.log('Shutting down gracefully...');
  if (workerManager?.stop) await workerManager.stop().catch(console.error);
  await closeMongoConnection();
  console.log('Shutdown completed');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err));

// =========================
// Start HTTP Server + WebSocket
// =========================
const server = http.createServer(app);

// ✅ WebSocket Servers
new BrowserWebSocketServer(server);
new LiveStreamWebSocketServer(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 InfinityX Backend running on port ${PORT}`);
  console.log(`🩺 Health check: http://0.0.0.0:${PORT}/api/v1/health`);
  console.log(`🌐 Browser WS: ws://0.0.0.0:${PORT}/ws/browser`);
  console.log(`🎬 LiveStream WS: ws://0.0.0.0:${PORT}/ws/live-stream`);
});

export default app;

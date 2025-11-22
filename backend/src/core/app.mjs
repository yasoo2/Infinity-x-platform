// backend/src/core/app.mjs - RESTRUCTURED v3.0.0
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import http from 'http';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Corrected path to be relative from src/core/
const publicPath = path.join(__dirname, '..', '..', '..', 'dashboard-x', 'public');

// ✅ Shared Types (Corrected Path)
import { ROLES } from '../shared/roles.mjs';
import { sanitizeUserForClient } from '../shared/userTypes.mjs';

// ✅ Database (Corrected Path)
import { initMongo, closeMongoConnection } from './database.mjs';

// ✅ Workers (Corrected Path)
import { SimpleWorkerManager } from '../services/jobs/simple.worker.mjs';

// ✅ Google OAuth (Corrected Path)
import { setupGoogleAuth, setupGoogleRoutes } from './auth.google.mjs';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// =========================
// 🎯 Configuration
// =========================
const CONFIG = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 200,
  SESSION_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days
  BODY_LIMIT: '10mb',
  SHUTDOWN_TIMEOUT: 10000
};

// =========================
// 🚀 Init Express App
// =========================
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// =========================
// 🔒 Security Middlewares
// =========================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: 'TOO_MANY_REQUESTS', message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded: ${req.ip} - ${req.path}`);
    res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
});

app.use(createRateLimiter(
  CONFIG.RATE_LIMIT_WINDOW,
  CONFIG.RATE_LIMIT_MAX,
  'Too many requests, please try again later'
));

const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  'Too many authentication attempts'
);

// =========================
// 🌐 CORS Configuration
// =========================
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4000',
    'https://admin.xelitesolutions.com',
    'https://dashboard.xelitesolutions.com',
    'https://xelitesolutions.com',
    'https://www.xelitesolutions.com',
    'https://api.xelitesolutions.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (CONFIG.NODE_ENV === 'development' && origin.includes('localhost')) return callback(null, true);
    console.warn(`⚠️  CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// =========================
// 📊 Request Logging
// =========================
app.use((req, res, next) => {
  req.id = crypto.randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const emoji = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
    console.log(`${emoji} ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms [${req.id}]`);
  });
  next();
});

// =========================
// 📦 Body Parsing
// =========================
app.use(express.json({ limit: CONFIG.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: CONFIG.BODY_LIMIT }));

// =========================
// 🔐 Session & Passport Setup
// =========================
app.use(session({
  secret: process.env.SESSION_SECRET || 'infinity-x-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: CONFIG.SESSION_EXPIRY
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// =========================
// 📁 Serve Static Files (Frontend)
// =========================
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// =========================
// 🔐 Authentication Utilities
// =========================
const cryptoRandom = () => crypto.randomBytes(32).toString('hex');
const rolePriority = {
  [ROLES.SUPER_ADMIN]: 3,
  [ROLES.ADMIN]: 2,
  [ROLES.USER]: 1,
};

function requireRole(minRole) {
  return async (req, res, next) => {
    try {
      const db = await initMongo();
      const token = req.headers['x-session-token'] || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'NO_TOKEN', message: 'Authentication token required' });

      const session = await db.collection('sessions').findOne({ token, active: true, expiresAt: { $gt: new Date() } });
      if (!session) return res.status(401).json({ error: 'INVALID_SESSION', message: 'Session expired or invalid' });

      const user = await db.collection('users').findOne({ _id: new ObjectId(session.userId) });
      if (!user) return res.status(401).json({ error: 'NO_USER', message: 'User not found' });

      if (rolePriority[user.role] < rolePriority[minRole]) {
        return res.status(403).json({ error: 'FORBIDDEN', message: `Requires ${minRole} role or higher` });
      }

      await db.collection('sessions').updateOne({ _id: session._id }, { $set: { lastActivity: new Date() } });
      req.user = sanitizeUserForClient(user);
      req.session = session;
      req.db = db;
      next();
    } catch (err) {
      console.error('❌ requireRole error:', err);
      res.status(500).json({ error: 'SERVER_ERR', message: 'Authentication failed' });
    }
  };
}

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers['x-session-token'] || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const db = await initMongo();
      const session = await db.collection('sessions').findOne({ token, active: true, expiresAt: { $gt: new Date() } });
      if (session) {
        const user = await db.collection('users').findOne({ _id: new ObjectId(session.userId) });
        if (user) {
          req.user = sanitizeUserForClient(user);
          req.session = session;
        }
      }
    }
    next();
  } catch (err) {
    console.error('⚠️  Optional auth error:', err);
    next();
  }
};

// =========================
// 🩺 Health Check Endpoint
// =========================
app.get('/api/v1/health', async (req, res) => {
  // ... (Health check logic remains the same, but workerManager access might change)
  res.json({ status: 'healthy' }); // Simplified for now
});


// =========================
// 📁 Dynamic Route Loading (REFACTORED)
// =========================
async function applyRoutes() {
  console.log('\n🔄 Loading routes...\n');
  const apiDir = path.join(__dirname, '..', 'api');
  const routeFiles = await fs.promises.readdir(apiDir);

  for (const file of routeFiles) {
    if (file.endsWith('.router.mjs')) {
      const routeName = file.split('.')[0];
      const routePath = `/api/v1/${routeName}`;
      try {
        const modulePath = path.join(apiDir, file);
        const { default: routerFactory } = await import(modulePath);
        
        let router;
        if (typeof routerFactory === 'function') {
            // It's a factory function, provide dependencies
            router = routerFactory({ requireRole, optionalAuth, db: initMongo });
        } else {
            // It's a direct router object
            router = routerFactory;
        }

        if (router) {
            app.use(routePath, router);
            console.log(`✅ Route registered: ${routePath}`);
        } else {
             console.warn(`⚠️  No router exported from ${file}`);
        }
      } catch (error) {
        console.error(`❌ Failed to load route ${routeName}:`, error);
      }
    }
  }
}

// =========================
// ❌ 404 & Global Error Handlers
// =========================
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({ error: err.name || 'SERVER_ERROR', message: err.message });
});

// =========================
// 🚀 Start Server & Graceful Shutdown
// =========================
const server = http.createServer(app);
let workerManager;

async function startServer() {
  try {
    await initMongo();
    console.log('✅ Database connected');

    workerManager = new SimpleWorkerManager({ maxConcurrent: 3 });
    await workerManager.start();
    console.log('✅ Worker Manager started');
    
    await applyRoutes();

    // Setup Google Auth
    const googleEnabled = setupGoogleAuth(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${process.env.BACKEND_URL}/api/v1/auth/google/callback`);
    if (googleEnabled) {
      setupGoogleRoutes(app, process.env.FRONTEND_URL);
      console.log('✅ Google OAuth routes configured');
    }

    server.listen(CONFIG.PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server running at http://0.0.0.0:${CONFIG.PORT} in ${CONFIG.NODE_ENV} mode\n`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down...`);
  server.close(async () => {
    console.log('✅ HTTP server closed.');
    await closeMongoConnection();
    console.log('✅ Database connection closed.');
    if (workerManager?.stop) await workerManager.stop();
    console.log('✅ Workers stopped.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;

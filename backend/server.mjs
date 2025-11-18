// backend/server.mjs - النسخة النهائية المحسّنة (مع إصلاح تحميل الـ Routes)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import http from 'http';

// ✅ Shared Types
import { ROLES } from './shared/roles.js';
import { sanitizeUserForClient } from './shared/userTypes.js';

// ✅ Database
import { initMongo, closeMongoConnection } from './src/db.mjs';

// ✅ Workers
import { SimpleWorkerManager } from './src/workers/SimpleWorkerManager.mjs';

dotenv.config();

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

// Rate Limiting
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

// Global rate limiter
app.use(createRateLimiter(
  CONFIG.RATE_LIMIT_WINDOW,
  CONFIG.RATE_LIMIT_MAX,
  'Too many requests, please try again later'
));

// Strict rate limiter for auth endpoints
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
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    if (CONFIG.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
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
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const emoji = res.statusCode >= 500 ? '❌' : 
                  res.statusCode >= 400 ? '⚠️' : 
                  res.statusCode >= 300 ? '🔄' : '✅';
    
    const logMessage = `${emoji} ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms [${req.id}]`;
    
    if (duration > 1000) {
      console.warn(`🐌 Slow request: ${logMessage}`);
    } else if (res.statusCode >= 400) {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  });
  
  next();
});

// =========================
// 📦 Body Parsing
// =========================
app.use(express.json({ limit: CONFIG.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: CONFIG.BODY_LIMIT }));

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
      
      if (!token) {
        return res.status(401).json({ 
          error: 'NO_TOKEN', 
          message: 'Authentication token required' 
        });
      }

      const session = await db.collection('sessions').findOne({ 
        token, 
        active: true,
        expiresAt: { $gt: new Date() }
      });
      
      if (!session) {
        return res.status(401).json({ 
          error: 'INVALID_SESSION', 
          message: 'Session expired or invalid' 
        });
      }

      const user = await db.collection('users').findOne({ 
        _id: new ObjectId(session.userId) 
      });
      
      if (!user) {
        return res.status(401).json({ 
          error: 'NO_USER', 
          message: 'User not found' 
        });
      }

      if (rolePriority[user.role] < rolePriority[minRole]) {
        return res.status(403).json({ 
          error: 'FORBIDDEN', 
          message: `Requires ${minRole} role or higher`,
          required: minRole,
          current: user.role
        });
      }

      // Update last activity
      await db.collection('sessions').updateOne(
        { _id: session._id },
        { $set: { lastActivity: new Date() } }
      );

      req.user = sanitizeUserForClient(user);
      req.session = session;
      req.db = db;
      next();
    } catch (err) {
      console.error('❌ requireRole error:', err);
      res.status(500).json({ 
        error: 'SERVER_ERR', 
        message: 'Authentication failed' 
      });
    }
  };
}

// Optional authentication
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers['x-session-token'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const db = await initMongo();
    const session = await db.collection('sessions').findOne({ 
      token, 
      active: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (session) {
      const user = await db.collection('users').findOne({ 
        _id: new ObjectId(session.userId) 
      });
      
      if (user) {
        req.user = sanitizeUserForClient(user);
        req.session = session;
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
  const checks = { 
    database: false, 
    workers: false,
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    environment: CONFIG.NODE_ENV,
    version: '2.0.0',
    timestamp: new Date().toISOString()
  };

  try {
    const db = await initMongo();
    await db.command({ ping: 1 });
    checks.database = true;
  } catch (err) {
    console.error('❌ Health check - DB failed:', err);
  }

  checks.workers = workerManager?.isRunning || false;
  
  const isHealthy = checks.database;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    checks
  });
});

// =========================
// 🏠 Root Endpoint
// =========================
app.get('/', (req, res) => {
  res.json({
    name: 'InfinityX Backend API',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth/*',
      joe: '/api/v1/joe/*',
      dashboard: '/api/v1/dashboard/*',
      factory: '/api/v1/factory/*',
      store: '/api/v1/store/*',
      integrations: '/api/v1/integrations/*'
    }
  });
});

// =========================
// 🔐 Authentication Routes
// =========================

// Bootstrap Super Admin
app.post('/api/v1/auth/bootstrap-super', authLimiter, async (req, res) => {
  try {
    const { email, phone, password, secretKey } = req.body;
    
    if (CONFIG.NODE_ENV === 'production' && secretKey !== process.env.BOOTSTRAP_SECRET) {
      return res.status(403).json({ 
        error: 'FORBIDDEN',
        message: 'Invalid secret key' 
      });
    }
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'MISSING_FIELDS',
        message: 'Email and password are required' 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'INVALID_EMAIL',
        message: 'Invalid email format' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters' 
      });
    }

    const db = await initMongo();
    const exist = await db.collection('users').findOne({ 
      role: ROLES.SUPER_ADMIN 
    });
    
    const hash = await bcrypt.hash(password, 12);

    if (exist) {
      await db.collection('users').updateOne(
        { _id: exist._id },
        { 
          $set: { 
            email, 
            phone: phone || null, 
            passwordHash: hash,
            updatedAt: new Date()
          } 
        }
      );
      console.log('✅ Super Admin updated');
      return res.json({ 
        ok: true, 
        mode: 'UPDATED_EXISTING_SUPER_ADMIN',
        userId: exist._id
      });
    } else {
      const newUser = {
        email,
        phone: phone || null,
        passwordHash: hash,
        role: ROLES.SUPER_ADMIN,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection('users').insertOne(newUser);
      console.log('✅ Super Admin created');
      return res.json({ 
        ok: true, 
        mode: 'CREATED_NEW_SUPER_ADMIN', 
        superAdminId: result.insertedId 
      });
    }
  } catch (err) {
    console.error('❌ bootstrap-super error:', err);
    res.status(500).json({ 
      error: 'SERVER_ERR',
      message: 'Failed to bootstrap super admin' 
    });
  }
});

// Login
app.post('/api/v1/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'MISSING_FIELDS',
        message: 'Email and password are required' 
      });
    }

    const db = await initMongo();
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      await bcrypt.compare(password, '$2a$12$invalidhashtopreventtimingattack');
      return res.status(401).json({ 
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password' 
      });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password' 
      });
    }

    const token = cryptoRandom();
    const session = {
      userId: user._id,
      token,
      active: true,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + CONFIG.SESSION_EXPIRY),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };

    await db.collection('sessions').insertOne(session);

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    res.json({
      success: true,
      token,
      user: sanitizeUserForClient(user),
      expiresAt: session.expiresAt
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ 
      error: 'SERVER_ERR',
      message: 'Login failed' 
    });
  }
});

// Logout
app.post('/api/v1/auth/logout', requireRole(ROLES.USER), async (req, res) => {
  try {
    await req.db.collection('sessions').updateOne(
      { _id: req.session._id },
      { $set: { active: false, loggedOutAt: new Date() } }
    );

    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (err) {
    console.error('❌ Logout error:', err);
    res.status(500).json({ 
      error: 'SERVER_ERR',
      message: 'Logout failed' 
    });
  }
});

// Get Current User
app.get('/api/v1/auth/me', requireRole(ROLES.USER), async (req, res) => {
  res.json({
    success: true,
    user: req.user,
    session: {
      createdAt: req.session.createdAt,
      expiresAt: req.session.expiresAt,
      lastActivity: req.session.lastActivity
    }
  });
});

// Refresh Session
app.post('/api/v1/auth/refresh', requireRole(ROLES.USER), async (req, res) => {
  try {
    const newExpiresAt = new Date(Date.now() + CONFIG.SESSION_EXPIRY);
    
    await req.db.collection('sessions').updateOne(
      { _id: req.session._id },
      { 
        $set: { 
          expiresAt: newExpiresAt,
          lastActivity: new Date()
        } 
      }
    );

    res.json({
      success: true,
      expiresAt: newExpiresAt
    });
  } catch (err) {
    console.error('❌ Refresh error:', err);
    res.status(500).json({ 
      error: 'SERVER_ERR',
      message: 'Session refresh failed' 
    });
  }
});

// =========================
// 📁 Dynamic Route Loading
// =========================

async function safeImport(modulePath, moduleName) {
  try {
    const module = await import(modulePath);
    console.log(`✅ Loaded: ${moduleName}`);
    return module;
  } catch (error) {
    console.warn(`⚠️  Failed to load ${moduleName}:`, error.message);
    return null;
  }
}

function isExpressRouter(obj) {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.use === 'function' && 
         typeof obj.get === 'function' && 
         typeof obj.post === 'function' &&
         Array.isArray(obj.stack);
}

function isFactoryFunction(obj) {
  return typeof obj === 'function';
}

const safeUseRoute = (path, routerModule, routerName) => {
  if (!routerModule) {
    console.warn(`⚠️  Route not available: ${path} (${routerName})`);
    return;
  }

  try {
    // Try to get the router from different export patterns
    let router = null;
    
    // Pattern 1: Named export matching routerName
    if (routerModule[routerName]) {
      router = routerModule[routerName];
    }
    // Pattern 2: Default export
    else if (routerModule.default) {
      router = routerModule.default;
    }
    // Pattern 3: 'router' export
    else if (routerModule.router) {
      router = routerModule.router;
    }
    // Pattern 4: First non-__esModule key
    else {
      const keys = Object.keys(routerModule).filter(k => k !== '__esModule');
      if (keys.length > 0) {
        router = routerModule[keys[0]];
      }
    }

    if (!router) {
      console.error(`❌ No router found for ${path}`);
      return;
    }

    // Check if it's already a router
    if (isExpressRouter(router)) {
      app.use(path, router);
      console.log(`✅ Route registered: ${path} (direct router)`);
      return;
    }

    // Check if it's a factory function
    if (isFactoryFunction(router)) {
      try {
        // Call factory with initMongo if it expects parameters
        const routerInstance = router.length > 0 ? router(initMongo) : router();
        
        if (isExpressRouter(routerInstance)) {
          app.use(path, routerInstance);
          console.log(`✅ Route registered: ${path} (factory)`);
        } else {
          console.error(`❌ Factory for ${path} returned invalid router:`, typeof routerInstance);
        }
      } catch (err) {
        console.error(`❌ Factory failed for ${path}:`, err.message);
      }
      return;
    }

    console.error(`❌ Invalid router type for ${path}:`, typeof router);

  } catch (error) {
    console.error(`❌ Failed to register route ${path}:`, error.message);
  }
};

async function applyRoutes() {
  console.log('🔄 Loading routes...');

  const routes = [
    { path: '/api/v1/joe/control', module: './src/routes/joeRouter.js', name: 'joeRouter' },
    { path: '/api/v1/factory', module: './src/routes/factoryRouter.js', name: 'factoryRouter' },
    { path: '/api/v1/dashboard', module: './src/routes/dashboardDataRouter.js', name: 'dashboardDataRouter' },
    { path: '/api/v1/public-site', module: './src/routes/publicSiteRouter.js', name: 'publicSiteRouter' },
    { path: '/api/v1/self-design', module: './src/routes/selfDesign.mjs', name: 'selfDesignRouter' },
    { path: '/api/v1/store', module: './src/routes/storeIntegration.mjs', name: 'storeIntegrationRouter' },
    { path: '/api/v1/universal-store', module: './src/routes/universalStore.mjs', name: 'universalStoreRouter' },
    { path: '/api/v1/page-builder', module: './src/routes/pageBuilder.mjs', name: 'pageBuilderRouter' },
    { path: '/api/v1/github-manager', module: './src/routes/githubManager.mjs', name: 'githubManagerRouter' },
    { path: '/api/v1/integrations', module: './src/routes/integrationManager.mjs', name: 'integrationManagerRouter' },
    { path: '/api/v1/self-evolution', module: './src/routes/selfEvolution.mjs', name: 'selfEvolutionRouter' },
    { path: '/api/v1/joe/chat', module: './src/routes/joeChat.mjs', name: 'joeChatRouter' },
    { path: '/api/v1/joe/chat-advanced', module: './src/routes/joeChatAdvanced.mjs', name: 'joeChatAdvancedRouter' },
    { path: '/api/v1/chat-history', module: './src/routes/chatHistory.mjs', name: 'chatHistoryRouter' },
    { path: '/api/v1/file', module: './src/routes/fileUpload.mjs', name: 'fileUploadRouter' },
    { path: '/api/v1', module: './src/routes/testGrok.mjs', name: 'testGrokRouter' },
    { path: '/api/live-stream', module: './src/routes/liveStreamRouter.mjs', name: 'liveStreamRouter' },
    { path: '/api/v1/sandbox', module: './src/routes/sandboxRoutes.mjs', name: 'sandboxRoutes' },
    { path: '/api/v1/planning', module: './src/routes/planningRoutes.mjs', name: 'planningRoutes' }
  ];

  // Load all routes
  for (const route of routes) {
    const routerModule = await safeImport(route.module, route.name);
    safeUseRoute(route.path, routerModule, route.name);
  }

  // WebSocket
  try {
    const wsModule = await import('./src/services/liveStreamWebSocket.mjs');
    const LiveStreamWebSocketServer = wsModule.default;
    if (LiveStreamWebSocketServer) {
      new LiveStreamWebSocketServer(server);
      console.log('✅ WebSocket servers initialized');
    }
  } catch (error) {
    console.warn('⚠️  Failed to load WebSocket:', error.message);
  }
}

// =========================
// ❌ 404 Handler
// =========================
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    suggestion: 'Check /api/v1/health for available endpoints',
    requestId: req.id
  });
});

// =========================
// ⚠️ Global Error Handler
// =========================
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err);
  
  const statusCode = err.status || err.statusCode || 500;
  const errorResponse = {
    error: err.name || 'SERVER_ERROR',
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    requestId: req.id
  };

  if (CONFIG.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

// =========================
// 👷 Worker Manager
// =========================
let workerManager;

async function initializeWorkerManager() {
  try {
    console.log('🔄 Starting workers...');
    workerManager = new SimpleWorkerManager({ maxConcurrent: 3 });
    await workerManager.start();
    console.log('✅ Worker Manager started');
  } catch (error) {
    console.error('❌ Worker Manager failed:', error);
    workerManager = { isRunning: false };
  }
}

// =========================
// 🛑 Graceful Shutdown
// =========================
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  try {
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    if (workerManager?.stop) {
      await workerManager.stop();
      console.log('✅ Workers stopped');
    }
    
    await closeMongoConnection();
    console.log('✅ Database connection closed');
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }

  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, CONFIG.SHUTDOWN_TIMEOUT);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// =========================
// 🚀 Start Server
// =========================
const server = http.createServer(app);

async function startServer() {
  try {
    console.log('🔄 Connecting to database...');
    await initMongo();
    console.log('✅ Database connected');

    await initializeWorkerManager();
    await applyRoutes();

    server.listen(CONFIG.PORT, '0.0.0.0', () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 InfinityX Backend Server Started Successfully!');
      console.log('='.repeat(60));
      console.log(`📡 HTTP Server: http://0.0.0.0:${CONFIG.PORT}`);
      console.log(`🩺 Health Check: http://0.0.0.0:${CONFIG.PORT}/api/v1/health`);
      console.log(`🌍 Environment: ${CONFIG.NODE_ENV}`);
      console.log(`⏱️  Started at: ${new Date().toISOString()}`);
      console.log('='.repeat(60) + '\n');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
export { requireRole, optionalAuth, CONFIG };
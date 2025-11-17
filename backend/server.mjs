  // backend/server.mjs - النسخة المُصلحة والمُحسّنة
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

  // ✅ Routes - Import with error handling
  let joeRouter, factoryRouter, publicSiteRouter, dashboardDataRouter;
  let selfDesignRouter, storeIntegrationRouter, universalStoreRouter;
  let pageBuilderRouter, githubManagerRouter, integrationManagerRouter;
  let selfEvolutionRouter, joeChatRouter, joeChatAdvancedRouter;
  let chatHistoryRouter, fileUploadRouter, testGrokRouter, liveStreamRouter;
  let sandboxRoutes, planningRoutes;

  // Safe import function
  async function safeImport(modulePath, moduleName) {
    try {
      const module = await import(modulePath);
      console.log(`✅ Loaded: ${moduleName}`);
      return module.default || module;
    } catch (error) {
      console.warn(`⚠️  Failed to load ${moduleName}:`, error.message);
      return null;
    }
  }

  // Load all routes
  async function loadRoutes() {
    joeRouter = await safeImport('./src/routes/joeRouter.js', 'joeRouter');
    factoryRouter = await safeImport('./src/routes/factoryRouter.js', 'factoryRouter');
    publicSiteRouter = await safeImport('./src/routes/publicSiteRouter.js', 'publicSiteRouter');
    dashboardDataRouter = await safeImport('./src/routes/dashboardDataRouter.js', 'dashboardDataRouter');
    selfDesignRouter = await safeImport('./src/routes/selfDesign.mjs', 'selfDesignRouter');
    storeIntegrationRouter = await safeImport('./src/routes/storeIntegration.mjs', 'storeIntegrationRouter');
    universalStoreRouter = await safeImport('./src/routes/universalStore.mjs', 'universalStoreRouter');
    pageBuilderRouter = await safeImport('./src/routes/pageBuilder.mjs', 'pageBuilderRouter');
    githubManagerRouter = await safeImport('./src/routes/githubManager.mjs', 'githubManagerRouter');
    integrationManagerRouter = await safeImport('./src/routes/integrationManager.mjs', 'integrationManagerRouter');
    selfEvolutionRouter = await safeImport('./src/routes/selfEvolution.mjs', 'selfEvolutionRouter');
    joeChatRouter = await safeImport('./src/routes/joeChat.mjs', 'joeChatRouter');
    joeChatAdvancedRouter = await safeImport('./src/routes/joeChatAdvanced.mjs', 'joeChatAdvancedRouter');
    chatHistoryRouter = await safeImport('./src/routes/chatHistory.mjs', 'chatHistoryRouter');
    fileUploadRouter = await safeImport('./src/routes/fileUpload.mjs', 'fileUploadRouter');
    testGrokRouter = await safeImport('./src/routes/testGrok.mjs', 'testGrokRouter');
    liveStreamRouter = await safeImport('./src/routes/liveStreamRouter.mjs', 'liveStreamRouter');
    sandboxRoutes = await safeImport('./src/routes/sandboxRoutes.mjs', 'sandboxRoutes');
    planningRoutes = await safeImport('./src/routes/planningRoutes.mjs', 'planningRoutes');
  }

  // ✅ WebSocket Services
  let LiveStreamWebSocketServer;
  async function loadWebSocketServices() {
    try {
      const module = await import('./src/services/liveStreamWebSocket.mjs');
      LiveStreamWebSocketServer = module.default;
      console.log('✅ Loaded: LiveStreamWebSocketServer');
    } catch (error) {
      console.warn('⚠️  Failed to load LiveStreamWebSocketServer:', error.message);
    }
  }

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
    'http://localhost:4000',
    'https://admin.xelitesolutions.com',
    'https://dashboard.xelitesolutions.com',
    'https://xelitesolutions.com',
    'https://www.xelitesolutions.com',
    'https://api.xelitesolutions.com'
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
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
      const emoji = res.statusCode >= 500 ? '❌' : res.statusCode >= 400 ? '⚠️' : '✅';
      console.log(`${emoji} [${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // =========================
  // Body Parsing
  // =========================
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
        
        if (!token) {
          return res.status(401).json({ error: 'NO_TOKEN', message: 'Authentication token required' });
        }

        const session = await db.collection('sessions').findOne({ 
          token, 
          active: true 
        });
        
        if (!session) {
          return res.status(401).json({ error: 'INVALID_SESSION', message: 'Session expired or invalid' });
        }

        const user = await db.collection('users').findOne({ 
          _id: new ObjectId(session.userId) 
        });
        
        if (!user) {
          return res.status(401).json({ error: 'NO_USER', message: 'User not found' });
        }

        if (rolePriority[user.role] < rolePriority[minRole]) {
          return res.status(403).json({ 
            error: 'FORBIDDEN', 
            message: `Requires ${minRole} role or higher` 
          });
        }

        req.user = sanitizeUserForClient(user);
        req.session = session;
        next();
      } catch (err) {
        console.error('❌ requireRole error:', err);
        res.status(500).json({ error: 'SERVER_ERR', message: 'Authentication failed' });
      }
    };
  }

  // =========================
  // Health Check
  // =========================
  app.get('/api/v1/health', async (req, res) => {
    const checks = { 
      database: false, 
      workers: false,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
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
      checks,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // =========================
  // Root Endpoint
  // =========================
  app.get('/', (req, res) => {
    res.json({
      name: 'InfinityX Backend API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth/*',
        joe: '/api/v1/joe/*',
        dashboard: '/api/v1/dashboard/*'
      }
    });
  });

  // =========================
  // Auth Routes
  // =========================
  app.post('/api/v1/auth/bootstrap-super', async (req, res) => {
    try {
      const { email, phone, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'MISSING_FIELDS',
          message: 'Email and password are required' 
        });
      }

      const db = await initMongo();
      const exist = await db.collection('users').findOne({ role: ROLES.SUPER_ADMIN });
      const hash = await bcrypt.hash(password, 10);

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

  // Login endpoint
  app.post('/api/v1/auth/login', async (req, res) => {
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

      // Create session
      const token = cryptoRandom();
      const session = {
        userId: user._id,
        token,
        active: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      await db.collection('sessions').insertOne(session);

      res.json({
        success: true,
        token,
        user: sanitizeUserForClient(user)
      });
    } catch (err) {
      console.error('❌ Login error:', err);
      res.status(500).json({ 
        error: 'SERVER_ERR',
        message: 'Login failed' 
      });
    }
  });

  // Logout endpoint
  app.post('/api/v1/auth/logout', requireRole(ROLES.USER), async (req, res) => {
    try {
      const db = await initMongo();
      await db.collection('sessions').updateOne(
        { _id: req.session._id },
        { $set: { active: false, loggedOutAt: new Date() } }
      );

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      console.error('❌ Logout error:', err);
      res.status(500).json({ 
        error: 'SERVER_ERR',
        message: 'Logout failed' 
      });
    }
  });

  // Get current user
  app.get('/api/v1/auth/me', requireRole(ROLES.USER), async (req, res) => {
    res.json({
      success: true,
      user: req.user
    });
  });

  // =========================
  // Apply Routes (with safe checks)
  // =========================
  async function applyRoutes() {
    await loadRoutes();
    await loadWebSocketServices();

    // Helper function to safely apply routes
    const safeUseRoute = (path, router, routerName) => {
      if (router) {
        // Check if router is a function (factory pattern)
        if (typeof router === 'function') {
          app.use(path, router(initMongo));
        } else {
          app.use(path, router);
        }
        console.log(`✅ Route registered: ${path}`);
      } else {
        console.warn(`⚠️  Route not available: ${path} (${routerName})`);
      }
    };

    // Apply all routes
    safeUseRoute('/api/v1/joe/control', joeRouter, 'joeRouter');
    safeUseRoute('/api/v1/factory', factoryRouter, 'factoryRouter');
    safeUseRoute('/api/v1/dashboard', dashboardDataRouter, 'dashboardDataRouter');
    safeUseRoute('/api/v1/public-site', publicSiteRouter, 'publicSiteRouter');
    safeUseRoute('/api/v1/self-design', selfDesignRouter, 'selfDesignRouter');
    safeUseRoute('/api/v1/store', storeIntegrationRouter, 'storeIntegrationRouter');
    safeUseRoute('/api/v1/universal-store', universalStoreRouter, 'universalStoreRouter');
    safeUseRoute('/api/v1/page-builder', pageBuilderRouter, 'pageBuilderRouter');
    safeUseRoute('/api/v1/github-manager', githubManagerRouter, 'githubManagerRouter');
    safeUseRoute('/api/v1/integrations', integrationManagerRouter, 'integrationManagerRouter');
    safeUseRoute('/api/v1/self-evolution', selfEvolutionRouter, 'selfEvolutionRouter');
    safeUseRoute('/api/v1/joe/chat', joeChatRouter, 'joeChatRouter');
    safeUseRoute('/api/v1/joe/chat-advanced', joeChatAdvancedRouter, 'joeChatAdvancedRouter');
    safeUseRoute('/api/v1/chat-history', chatHistoryRouter, 'chatHistoryRouter');
    safeUseRoute('/api/v1/file', fileUploadRouter, 'fileUploadRouter');
    safeUseRoute('/api/v1', testGrokRouter, 'testGrokRouter');
    safeUseRoute('/api/live-stream', liveStreamRouter, 'liveStreamRouter');
    safeUseRoute('/api/v1/sandbox', sandboxRoutes, 'sandboxRoutes');
    safeUseRoute('/api/v1/planning', planningRoutes, 'planningRoutes');
  }

  // =========================
  // 404 Handler
  // =========================
  app.use((req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      availableEndpoints: '/api/v1/health'
    });
  });

  // =========================
  // Global Error Handler
  // =========================
  app.use((err, req, res, next) => {
    console.error('❌ Global Error:', err);
    
    res.status(err.status || 500).json({
      error: err.name || 'SERVER_ERROR',
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

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

  // =========================
  // Graceful Shutdown
  // =========================
  async function gracefulShutdown() {
    console.log('\n🛑 Shutting down gracefully...');
    
    try {
      if (workerManager?.stop) {
        await workerManager.stop();
        console.log('✅ Workers stopped');
      }
      
      await closeMongoConnection();
      console.log('✅ Database connection closed');
      
      server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
  });
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown();
  });

  // =========================
  // Start Server
  // =========================
  const server = http.createServer(app);

  async function startServer() {
    try {
      // 1. Initialize database
      console.log('🔄 Connecting to database...');
      await initMongo();
      console.log('✅ Database connected');

      // 2. Initialize workers
      console.log('🔄 Starting workers...');
      await initializeWorkerManager();

      // 3. Apply routes
      console.log('🔄 Loading routes...');
      await applyRoutes();

      // 4. Initialize WebSocket
      if (LiveStreamWebSocketServer) {
        new LiveStreamWebSocketServer(server);
        console.log('✅ WebSocket servers initialized');
      }

      // 5. Start HTTP server
      server.listen(PORT, '0.0.0.0', () => {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 InfinityX Backend Server Started Successfully!');
        console.log('='.repeat(60));
        console.log(`📡 HTTP Server: http://0.0.0.0:${PORT}`);
        console.log(`🩺 Health Check: http://0.0.0.0:${PORT}/api/v1/health`);
        console.log(`🎬 LiveStream WS: ws://0.0.0.0:${PORT}/ws/live-stream`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('='.repeat(60) + '\n');
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  // Start the server
  startServer();

  export default app;
  // backend/server.mjs - النسخة المُصلحة بالكامل
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
  // CORS
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

        const session = await db.collection('sessions').findOne({ token, active: true });
        if (!session) {
          return res.status(401).json({ error: 'INVALID_SESSION', message: 'Session expired or invalid' });
        }

        const user = await db.collection('users').findOne({ _id: new ObjectId(session.userId) });
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

      const token = cryptoRandom();
      const session = {
        userId: user._id,
        token,
        active: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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

  app.get('/api/v1/auth/me', requireRole(ROLES.USER), async (req, res) => {
    res.json({
      success: true,
      user: req.user
    });
  });

  // =========================
  // Dynamic Route Loading
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

  // ✅ FIXED: Better router detection
  const safeUseRoute = (path, routerModule, routerName) => {
    if (!routerModule) {
      console.warn(`⚠️  Route not available: ${path} (${routerName})`);
      return;
    }

    try {
      let router = null;

      // Case 1: Module with default export
      if (routerModule.default) {
        router = routerModule.default;
      }
      // Case 2: Module with named export 'router'
      else if (routerModule.router) {
        router = routerModule.router;
      }
      // Case 3: Direct router object
      else if (routerModule.stack) {
        router = routerModule;
      }
      // Case 4: Module itself is the router
      else {
        router = routerModule;
      }

      // Check if router is a factory function
      if (typeof router === 'function') {
        // Check if it's a factory that needs initMongo
        const routerInstance = router.length > 0 ? router(initMongo) : router();
        app.use(path, routerInstance);
        console.log(`✅ Route registered: ${path} (factory)`);
      } 
      // Check if it's an Express Router
      else if (router && typeof router === 'object' && router.stack) {
        app.use(path, router);
        console.log(`✅ Route registered: ${path} (router)`);
      }
      else {
        console.error(`❌ Invalid router type for ${path}:`, typeof router);
        console.error(`   Module keys:`, Object.keys(routerModule));
      }
    } catch (error) {
      console.error(`❌ Failed to register route ${path}:`, error.message);
    }
  };

  async function applyRoutes() {
    console.log('🔄 Loading routes...');

    // Load all routes
    const routes = {
      joeRouter: await safeImport('./src/routes/joeRouter.js', 'joeRouter'),
      factoryRouter: await safeImport('./src/routes/factoryRouter.js', 'factoryRouter'),
      publicSiteRouter: await safeImport('./src/routes/publicSiteRouter.js', 'publicSiteRouter'),
      dashboardDataRouter: await safeImport('./src/routes/dashboardDataRouter.js', 'dashboardDataRouter'),
      selfDesignRouter: await safeImport('./src/routes/selfDesign.mjs', 'selfDesignRouter'),
      storeIntegrationRouter: await safeImport('./src/routes/storeIntegration.mjs', 'storeIntegrationRouter'),
      universalStoreRouter: await safeImport('./src/routes/universalStore.mjs', 'universalStoreRouter'),
      pageBuilderRouter: await safeImport('./src/routes/pageBuilder.mjs', 'pageBuilderRouter'),
      githubManagerRouter: await safeImport('./src/routes/githubManager.mjs', 'githubManagerRouter'),
      integrationManagerRouter: await safeImport('./src/routes/integrationManager.mjs', 'integrationManagerRouter'),
      selfEvolutionRouter: await safeImport('./src/routes/selfEvolution.mjs', 'selfEvolutionRouter'),
      joeChatRouter: await safeImport('./src/routes/joeChat.mjs', 'joeChatRouter'),
      joeChatAdvancedRouter: await safeImport('./src/routes/joeChatAdvanced.mjs', 'joeChatAdvancedRouter'),
      chatHistoryRouter: await safeImport('./src/routes/chatHistory.mjs', 'chatHistoryRouter'),
      fileUploadRouter: await safeImport('./src/routes/fileUpload.mjs', 'fileUploadRouter'),
      testGrokRouter: await safeImport('./src/routes/testGrok.mjs', 'testGrokRouter'),
      liveStreamRouter: await safeImport('./src/routes/liveStreamRouter.mjs', 'liveStreamRouter'),
      sandboxRoutes: await safeImport('./src/routes/sandboxRoutes.mjs', 'sandboxRoutes'),
      planningRoutes: await safeImport('./src/routes/planningRoutes.mjs', 'planningRoutes')
    };

    // Apply all routes
    safeUseRoute('/api/v1/joe/control', routes.joeRouter, 'joeRouter');
    safeUseRoute('/api/v1/factory', routes.factoryRouter, 'factoryRouter');
    safeUseRoute('/api/v1/dashboard', routes.dashboardDataRouter, 'dashboardDataRouter');
    safeUseRoute('/api/v1/public-site', routes.publicSiteRouter, 'publicSiteRouter');
    safeUseRoute('/api/v1/self-design', routes.selfDesignRouter, 'selfDesignRouter');
    safeUseRoute('/api/v1/store', routes.storeIntegrationRouter, 'storeIntegrationRouter');
    safeUseRoute('/api/v1/universal-store', routes.universalStoreRouter, 'universalStoreRouter');
    safeUseRoute('/api/v1/page-builder', routes.pageBuilderRouter, 'pageBuilderRouter');
    safeUseRoute('/api/v1/github-manager', routes.githubManagerRouter, 'githubManagerRouter');
    safeUseRoute('/api/v1/integrations', routes.integrationManagerRouter, 'integrationManagerRouter');
    safeUseRoute('/api/v1/self-evolution', routes.selfEvolutionRouter, 'selfEvolutionRouter');
    safeUseRoute('/api/v1/joe/chat', routes.joeChatRouter, 'joeChatRouter');
    safeUseRoute('/api/v1/joe/chat-advanced', routes.joeChatAdvancedRouter, 'joeChatAdvancedRouter');
    safeUseRoute('/api/v1/chat-history', routes.chatHistoryRouter, 'chatHistoryRouter');
    safeUseRoute('/api/v1/file', routes.fileUploadRouter, 'fileUploadRouter');
    safeUseRoute('/api/v1', routes.testGrokRouter, 'testGrokRouter');
    safeUseRoute('/api/live-stream', routes.liveStreamRouter, 'liveStreamRouter');
    safeUseRoute('/api/v1/sandbox', routes.sandboxRoutes, 'sandboxRoutes');
    safeUseRoute('/api/v1/planning', routes.planningRoutes, 'planningRoutes');

    // Load WebSocket
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
      console.log('🔄 Connecting to database...');
      await initMongo();
      console.log('✅ Database connected');

      console.log('🔄 Starting workers...');
      await initializeWorkerManager();

      await applyRoutes();

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

  startServer();

  export default app;
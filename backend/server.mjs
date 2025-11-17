  // backend/server.mjs - النسخة الكاملة والمُصلحة
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
  // CORS Configuration
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
  // Request Logging Middleware
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
  // Role-Based Access Control
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
          return res.status(401).json({ 
            error: 'NO_TOKEN', 
            message: 'Authentication token required' 
          });
        }

        const session = await db.collection('sessions').findOne({ 
          token, 
          active: true 
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
            message: `Requires ${minRole} role or higher` 
          });
        }

        req.user = sanitizeUserForClient(user);
        req.session = session;
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

  // =========================
  // Health Check Endpoint
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
      version: '2.0.0'
    });
  });

  // =========================
  // Root Endpoint
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
  // Authentication Routes
  // =========================
  
  // Bootstrap Super Admin
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
      const exist = await db.collection('users').findOne({ 
        role: ROLES.SUPER_ADMIN 
      });
      
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

  // Login
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

  // Logout
  app.post('/api/v1/auth/logout', requireRole(ROLES.USER), async (req, res) => {
    try {
      const db = await initMongo();
      await db.collection('sessions').updateOne(
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
      user: req.user
    });
  });

  // =========================
  // Dynamic Route Loading
  // =========================
  
  // Safe module import with error handling
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

  // ✅ Smart router extraction function
  function extractRouter(routerModule, routerName) {
    if (!routerModule) return null;

    // Priority 1: Named export matching the router name
    if (routerModule[routerName]) {
      return routerModule[routerName];
    }

    // Priority 2: Default export
    if (routerModule.default) {
      return routerModule.default;
    }

    // Priority 3: 'router' named export
    if (routerModule.router) {
      return routerModule.router;
    }

    // Priority 4: Direct router object (has stack property)
    if (routerModule.stack) {
      return routerModule;
    }

    // Priority 5: First exported value (excluding __esModule)
    const keys = Object.keys(routerModule).filter(k => k !== '__esModule');
    if (keys.length > 0) {
      return routerModule[keys[0]];
    }

    return null;
  }

  // ✅ Safe route registration with smart router detection
  const safeUseRoute = (path, routerModule, routerName) => {
    if (!routerModule) {
      console.warn(`⚠️  Route not available: ${path} (${routerName})`);
      return;
    }

    try {
      const router = extractRouter(routerModule, routerName);

      if (!router) {
        console.error(`❌ No valid router found for ${path}`);
        console.error(`   Module keys:`, Object.keys(routerModule));
        return;
      }

      // Handle factory functions
      if (typeof router === 'function') {
        try {
          // Check if function expects parameters (like initMongo)
          const routerInstance = router.length > 0 ? router(initMongo) : router();
          app.use(path, routerInstance);
          console.log(`✅ Route registered: ${path} (factory)`);
        } catch (err) {
          console.error(`❌ Factory function failed for ${path}:`, err.message);
        }
      } 
      // Handle Express Router objects
      else if (router && typeof router === 'object' && router.stack) {
        app.use(path, router);
        console.log(`✅ Route registered: ${path} (router)`);
      }
      else {
        console.error(`❌ Invalid router type for ${path}:`, typeof router);
        console.error(`   Router value:`, router);
      }
    } catch (error) {
      console.error(`❌ Failed to register route ${path}:`, error.message);
      console.error(`   Stack:`, error.stack);
    }
  };

  // Load and apply all routes
  async function applyRoutes() {
    console.log('🔄 Loading routes...');

    // Load all route modules
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

    // Apply all routes with smart extraction
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

    // Load WebSocket server
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
      suggestion: 'Check /api/v1/health for available endpoints'
    });
  });

  // =========================
  // Global Error Handler
  // =========================
  app.use((err, req, res, next) => {
    console.error('❌ Global Error:', err);
    
    const statusCode = err.status || err.statusCode || 500;
    const errorResponse = {
      error: err.name || 'SERVER_ERROR',
      message: err.message || 'Internal Server Error',
      timestamp: new Date().toISOString()
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
  });

  // =========================
  // Worker Manager
  // =========================
  let workerManager;

  async function initializeWorkerManager() {
    try {
      console.log('🔄 Starting workers...');
      workerManager = new SimpleWorkerManager({ maxConcurrent: 3 });
      await workerManager.start();
      console.log('✅ Worker Manager started');
      console.log('✅ SimpleWorkerManager started');
    } catch (error) {
      console.error('❌ Worker Manager failed:', error);
      workerManager = { isRunning: false };
    }
  }

  // =========================
  // Graceful Shutdown
  // =========================
  async function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    
    try {
      // Stop accepting new requests
      server.close(() => {
        console.log('✅ HTTP server closed');
      });

      // Stop workers
      if (workerManager?.stop) {
        await workerManager.stop();
        console.log('✅ Workers stopped');
      }
      
      // Close database connection
      await closeMongoConnection();
      console.log('✅ Database connection closed');
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }

    // Force shutdown after timeout
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  // Process event handlers
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
  // Start Server
  // =========================
  const server = http.createServer(app);

  async function startServer() {
    try {
      // Connect to database
      console.log('🔄 Connecting to database...');
      await initMongo();
      console.log('✅ Database connected');

      // Initialize workers
      await initializeWorkerManager();

      // Load all routes
      await applyRoutes();

      // Start HTTP server
      server.listen(PORT, '0.0.0.0', () => {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 InfinityX Backend Server Started Successfully!');
        console.log('='.repeat(60));
        console.log(`📡 HTTP Server: http://0.0.0.0:${PORT}`);
        console.log(`🩺 Health Check: http://0.0.0.0:${PORT}/api/v1/health`);
        console.log(`🎬 LiveStream WS: ws://0.0.0.0:${PORT}/ws/live-stream`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`⏱️  Started at: ${new Date().toISOString()}`);
        console.log('='.repeat(60) + '\n');
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      console.error('Stack:', error.stack);
      process.exit(1);
    }
  }

  // Start the server
  startServer();

  // Export for testing
  export default app;
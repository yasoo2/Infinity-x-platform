// ملف: backend/server.mjs (الإصدار النهائي والمصحح)

// --- Pre-load environment variables ---
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '.env') });
}

// --- Import modules ---
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import compression from 'compression';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import xssClean from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

// --- Core Components ---
import { initMongo, closeMongoConnection } from './src/core/database.mjs';
import { connectDB } from './src/db.mjs';
import { setupSuperAdmin } from './src/core/setup-admin.mjs';
import PlanningSystem from './src/planning/PlanningSystem.mjs';
import SchedulingSystem from './src/scheduling/SchedulingSystem.mjs';
import { setupAuth, requireRole, optionalAuth } from './src/middleware/auth.mjs';
import { getMode } from './src/core/runtime-mode.mjs';
import eventBus from './src/core/event-bus.mjs';

// --- Services ---
import toolManager from './src/services/tools/tool-manager.service.mjs';
import SandboxManager from './src/sandbox/SandboxManager.mjs';
import MemoryManager from './src/services/memory/memory.service.mjs';
import { JoeAgentWebSocketServer } from './src/services/joeAgentWebSocket.mjs';
import BrowserWebSocketServer from './src/services/browserWebSocket.mjs';
import { collaborationSystem } from './src/systems/collaboration.service.mjs';
import toolDiscoveryFactory from './src/services/tools/tool-discovery.tool.mjs';
import toolIntegrationFactory from './src/services/tools/tool-integration.tool.mjs';
import toolPipIntegrationFactory from './src/services/tools/tool-pip-integration.tool.mjs';
import toolBulkSeederFactory from './src/services/tools/tool-bulk-seeder.mjs';
import toolDiagnosticsFactory from './src/services/tools/tool-code-diagnostics.tool.mjs';
import toolSearchFactory from './src/services/tools/tool-code-search.tool.mjs';
import toolRefactorFactory from './src/services/tools/tool-code-refactor.tool.mjs';
import toolAutoFixFactory from './src/services/tools/tool-auto-fix.tool.mjs';
import toolSystemConnectorsFactory from './src/services/tools/tool-system-connectors.tool.mjs';
import { liveStreamingService } from './src/services/liveStreamingService.mjs';
import LiveStreamWebSocketServer from './src/services/liveStreamWebSocket.mjs';

const CONFIG = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

const app = express();
const server = http.createServer(app);

// --- CORS Configuration ---
const defaultWhitelist = [
  'https://xelitesolutions.com',
  'https://www.xelitesolutions.com',
  'https://api.xelitesolutions.com',
  // 'https://backend-api.onrender.com', // Removed: Old backend URL
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4000',
  'http://localhost:4001',
];

// The whitelist is a combination of the default list and any origins specified in the environment variable.
const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : [];

// Combine default whitelist with environment-specified origins, removing duplicates
const whitelist = [...new Set([...defaultWhitelist, ...envOrigins])];

console.log('📋 CORS whitelist configured:', whitelist);

// --- Apply standard 'cors' middleware ---
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    const host = u.host;
    if (host.startsWith('localhost')) return true;
    if (host.endsWith('.onrender.com')) return true;
    if (host.endsWith('xelitesolutions.com') || host.endsWith('www.xelitesolutions.com')) return true;
    return whitelist.includes(origin);
  } catch {
    return whitelist.includes(origin);
  }
};

// Removed cors() middleware in favor of a single, deterministic CORS layer below

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('etag', 'strong');

// Apply helmet with CORS-friendly configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", ...whitelist],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  }
}));

app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(mongoSanitize());
app.use(xssClean());
app.use(hpp());

// --- Extra CORS hardening: echo exact Origin, set Vary, handle preflight ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'X-New-Token, x-new-token');
    res.header('Access-Control-Max-Age', '86400');
    const defaultAllowedHeaders = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
    const reqHeaders = req.headers['access-control-request-headers'];
    res.header('Access-Control-Allow-Headers', reqHeaders ? reqHeaders : defaultAllowedHeaders);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    if (req.method === 'OPTIONS') {
      console.info('CORS preflight OK', { path: req.path, origin, headers: req.headers });
      // Some proxies/CDNs expect 200 for preflight
      return res.status(200).end();
    }
  }
  next();
});

app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'X-New-Token, x-new-token');
    res.header('Access-Control-Max-Age', '86400');
    res.header('Vary', 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method');
    const reqHeaders = req.headers['access-control-request-headers'];
    const defaultAllowedHeaders = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
    res.header('Access-Control-Allow-Headers', reqHeaders ? reqHeaders : defaultAllowedHeaders);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    console.info('Global OPTIONS handled', { path: req.path, origin, headers: req.headers });
    return res.status(200).end();
  }
  // Respond 200 to satisfy preflight status requirements; actual request will still be blocked
  return res.status(200).end();
});

// --- Serve Static Frontend Files ---
const publicSitePath = path.join(__dirname, '..', 'public-site');
const dashboardPath = path.join(__dirname, '..', 'dashboard-x');

const finalDashboardPath = path.join(__dirname, '..', 'dashboard-x', 'dist');
app.use('/dashboard', express.static(finalDashboardPath, { maxAge: '1d', immutable: true, etag: true }));

app.get('/dashboard*', (req, res) => {
    const indexPath = path.join(finalDashboardPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indexPath);
    } else {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(dashboardPath, 'index.html'));
    }
});

app.get('/', (req, res) => {
    const indexPath = path.join(finalDashboardPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indexPath);
    } else {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(publicSitePath, 'index.html'));
    }
});

app.use(express.static(publicSitePath, { maxAge: '1d', immutable: true, etag: true }));
app.use(express.static(finalDashboardPath, { maxAge: '1d', immutable: true, etag: true }));

async function setupDependencies() {
    let db;
    let planningSystem = null;
    let schedulingSystem = null;
    try {
        try {
            db = await initMongo();
            await connectDB(); // Initialize Mongoose connection
            await setupSuperAdmin(() => Promise.resolve(db));
        } catch (e) {
            if (process.env.NODE_ENV === 'test') {
                throw e;
            }
            console.warn('⚠️ Database unavailable. Continuing in degraded mode without MongoDB.', e?.message || String(e));
            db = null;
        }
        if (db) {
            planningSystem = new PlanningSystem(db);
            schedulingSystem = new SchedulingSystem(db);
        } else {
            planningSystem = null;
            schedulingSystem = null;
        }

        const sandboxManager = await new SandboxManager().initializeConnections();
        const memoryManager = new MemoryManager();
        // Local LLaMA removed from Joe system

        const dependencies = {
            db,
            sandboxManager,
            memoryManager,
            eventBus,
            planningSystem,
            schedulingSystem,
            requireRole: requireRole(db),
            optionalAuth: optionalAuth(db),
            liveStreamingService,
            JWT_SECRET: process.env.JWT_SECRET || 'a-very-weak-secret-for-dev',
            github: {
              token: process.env.GITHUB_TOKEN || null,
              username: process.env.GITHUB_USERNAME || 'yasoo2'
            },
            cloudflare: {
              apiToken: process.env.CLOUDFLARE_API_TOKEN || null,
              accountId: process.env.CLOUDFLARE_ACCOUNT_ID || null
            }
        };

        await toolManager.initialize(dependencies);
        dependencies.toolManager = toolManager;
        await collaborationSystem.initialize(server);
        dependencies.io = collaborationSystem.io;
        dependencies.collaborationSystem = collaborationSystem;
        const discoveryTools = (typeof toolDiscoveryFactory === 'function') ? toolDiscoveryFactory(dependencies) : toolDiscoveryFactory;
        const integrationTools = (typeof toolIntegrationFactory === 'function') ? toolIntegrationFactory(dependencies) : toolIntegrationFactory;
        const pipIntegrationTools = (typeof toolPipIntegrationFactory === 'function') ? toolPipIntegrationFactory({ ...dependencies, toolManager }) : toolPipIntegrationFactory;
        const bulkSeederTools = (typeof toolBulkSeederFactory === 'function') ? toolBulkSeederFactory({ ...dependencies, toolManager }) : toolBulkSeederFactory;
        const diagnosticsTools = (typeof toolDiagnosticsFactory === 'function') ? toolDiagnosticsFactory(dependencies) : toolDiagnosticsFactory;
        const searchTools = (typeof toolSearchFactory === 'function') ? toolSearchFactory(dependencies) : toolSearchFactory;
        const refactorTools = (typeof toolRefactorFactory === 'function') ? toolRefactorFactory(dependencies) : toolRefactorFactory;
        const autoFixTools = (typeof toolAutoFixFactory === 'function') ? toolAutoFixFactory(dependencies) : toolAutoFixFactory;
        const systemConnectorTools = (typeof toolSystemConnectorsFactory === 'function') ? toolSystemConnectorsFactory(dependencies) : toolSystemConnectorsFactory;
        toolManager._registerModule(discoveryTools);
        toolManager._registerModule(integrationTools);
        toolManager._registerModule(pipIntegrationTools);
        toolManager._registerModule(bulkSeederTools);
        toolManager._registerModule(diagnosticsTools);
        toolManager._registerModule(searchTools);
        toolManager._registerModule(refactorTools);
        toolManager._registerModule(autoFixTools);
        toolManager._registerModule(systemConnectorTools);
        const joeAgentServer = new JoeAgentWebSocketServer(server, dependencies);
        dependencies.joeAgentServer = joeAgentServer;
        const browserWSServer = new BrowserWebSocketServer(server);
        dependencies.browserWSServer = browserWSServer;
        const liveStreamWSServer = new LiveStreamWebSocketServer(server);
        dependencies.liveStreamWSServer = liveStreamWSServer;

        try {
          if (!liveStreamingService.isStreaming) {
            liveStreamingService.startStreaming();
            console.log('📡 Live stream started automatically.');
          }
        } catch (e) {
          console.warn('⚠️ Failed to auto-start live stream:', e?.message || String(e));
        }

        return dependencies;
    } catch (error) {
        console.error('❌ Could not initialize dependencies. Aborting startup.', error);
        throw error;
    }
}

async function applyRoutes(dependencies) {
  const apiDir = path.join(__dirname, 'src', 'api');
  const routeFiles = await fs.promises.readdir(apiDir);

  for (const file of routeFiles) {
    if (file.endsWith('.router.mjs')) {
        const routeName = file.split('.')[0];
        const routePath = `/api/v1/${routeName}`;
        if ((routeName === 'planning' && !dependencies.planningSystem) || (routeName === 'scheduling' && !dependencies.schedulingSystem)) {
            console.warn(`⚠️ Skipping loading of ${routeName} router because the system is not initialized.`);
            continue;
        }
        try {
            const { default: routerFactory } = await import(path.join(apiDir, file));
            const router = routerFactory(dependencies);
            app.use(routePath, router);
        } catch (error) {
            console.error(`❌ Failed to load route ${routeName}:`, error);
        }
    }
  }
}

/**
 * Bootstraps the application server.
 *
 * @param {Object} [options]
 * @param {Function} [options.dependencyInitializer=setupDependencies] Allows tests to inject a failing initializer.
 * @param {Function} [options.exit=process.exit] Optional exit handler for testability.
 * @returns {Promise<unknown>} resolved dependency container when startup succeeds.
 */
async function startServer({ dependencyInitializer = setupDependencies, exit = process.exit } = {}) {
  try {
    console.log('🔄 Starting server setup...');
    server.listen(CONFIG.PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on http://localhost:${CONFIG.PORT}`);
    });
    try {
      server.keepAliveTimeout = 65000;
      server.headersTimeout = 66000;
      server.requestTimeout = 300000;
    } catch { /* noop */ }

    // Lightweight runtime-mode status endpoint expected by frontend (available immediately)
    app.get('/api/v1/runtime-mode/status', (_req, res) => {
      try {
        const mode = getMode();
        res.json({ success: true, mode, offlineReady: false, stage: '', version: '2.0.4' });
      } catch (e) {
        res.status(500).json({ success: false, error: 'RUNTIME_STATUS_FAILED', message: e?.message || String(e) });
      }
    });

    // Minimal health endpoint to avoid 404s in clients
    app.get('/api/v1/health', (_req, res) => {
      try {
        res.json({ success: true, status: 'ok' });
      } catch (e) {
        res.status(500).json({ success: false, error: 'HEALTH_FAILED', message: e?.message || String(e) });
      }
    });

    // AI Providers: lightweight runtime management (OpenAI/Gemini)
    app.get('/api/v1/ai/providers', (_req, res) => {
      try {
        const providers = [
          { name: 'openai', active: !!process.env.OPENAI_API_KEY },
          { name: 'gemini', active: !!process.env.GEMINI_API_KEY },
        ];
        res.json({ success: true, providers });
      } catch (e) {
        res.status(500).json({ success: false, error: 'AI_PROVIDERS_FAILED', message: e?.message || String(e) });
      }
    });

    app.post('/api/v1/ai/validate', async (req, res) => {
      try {
        const provider = String(req?.body?.provider || '').toLowerCase();
        const apiKey = String(req?.body?.apiKey || '').trim();
        if (!provider || !apiKey) return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'provider and apiKey are required' });
        if (provider === 'openai') {
          try {
            const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
            if (r.ok) return res.json({ success: true });
            const body = await r.text();
            return res.status(r.status).json({ success: false, error: 'OPENAI_VALIDATE_FAILED', details: body });
          } catch (e) {
            return res.status(500).json({ success: false, error: 'OPENAI_VALIDATE_ERROR', message: e?.message || String(e) });
          }
        }
        if (provider === 'gemini') {
          // Minimal ping
          return res.json({ success: !!apiKey });
        }
        return res.status(400).json({ success: false, error: 'UNSUPPORTED_PROVIDER' });
      } catch (e) {
        res.status(500).json({ success: false, error: 'AI_VALIDATE_FAILED', message: e?.message || String(e) });
      }
    });

    app.post('/api/v1/ai/activate', async (req, res) => {
      try {
        const provider = String(req?.body?.provider || '').toLowerCase();
        const apiKey = String(req?.body?.apiKey || '').trim();
        if (!provider || !apiKey) return res.status(400).json({ success: false, error: 'BAD_REQUEST', message: 'provider and apiKey are required' });
        if (provider === 'openai') {
          process.env.OPENAI_API_KEY = apiKey;
          return res.json({ success: true, provider });
        }
        if (provider === 'gemini') {
          process.env.GEMINI_API_KEY = apiKey;
          return res.json({ success: true, provider });
        }
        return res.status(400).json({ success: false, error: 'UNSUPPORTED_PROVIDER' });
      } catch (e) {
        res.status(500).json({ success: false, error: 'AI_ACTIVATE_FAILED', message: e?.message || String(e) });
      }
    });

    app.use('/api/v1', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
    
    app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
    app.use((err, req, res, _next) => {
        void _next;
        console.error('❌ Global Error:', err);
        res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    });

    // Initialize dependencies asynchronously to avoid blocking port binding
    Promise.resolve().then(async () => {
      let dependencies;
      try {
        dependencies = await dependencyInitializer();
      } catch (error) {
        console.error('❌ Could not initialize dependencies. Continuing without optional systems.', error?.message || String(error));
        return;
      }
      try {
        setupAuth(dependencies.db);
        await applyRoutes(dependencies);
      } catch (e) {
        console.error('❌ Failed to apply routes or auth:', e?.message || String(e));
      }
      // Background initialization (non-blocking)
      try {
        const seedPreset = String(process.env.JOE_TOOL_SEED || 'core');
        await toolManager.execute('seedCuratedTools', { preset: seedPreset });
        console.log('🧩 Tool seeds initialized:', seedPreset);
      } catch (e) {
        console.warn('⚠️ Tool seed initialization skipped:', e?.message || String(e));
      }
    });

    return undefined;

  } catch (error) {
    console.error('❌ Fatal: Failed to start server:', error);
    try {
      await Promise.resolve(exit(1));
    } catch (exitError) {
      console.error('⚠️ Exit handler failed:', exitError);
    }
    throw error;
  }
}

async function gracefulShutdown(signal) { 
    console.log(`🔌 Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        console.log('Closed out remaining connections.');
        await Promise.all([
            closeMongoConnection().then(() => console.log('MongoDB connection closed.')),
        ]);
        process.exit(0);
    });
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export { setupDependencies, startServer };
export default app;

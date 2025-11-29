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
import fs from 'fs';

// --- Core Components ---
import { initMongo, closeMongoConnection } from './src/core/database.mjs';
import { connectDB } from './src/db.mjs';
import { setupSuperAdmin } from './src/core/setup-admin.mjs';
import PlanningSystem from './src/planning/PlanningSystem.mjs';
import SchedulingSystem from './src/scheduling/SchedulingSystem.mjs';
import { setupAuth, requireRole, optionalAuth } from './src/middleware/auth.mjs';
import eventBus from './src/core/event-bus.mjs';

// --- Services ---
import toolManager from './src/services/tools/tool-manager.service.mjs';
import SandboxManager from './src/sandbox/SandboxManager.mjs';
import MemoryManager from './src/services/memory/memory.service.mjs';
import { JoeAgentWebSocketServer } from './src/services/joeAgentWebSocket.mjs';

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
  // 'https://backend-api.onrender.com', // Removed: Old backend URL
  'https://api.xelitesolutions.com',
  'https://admin.xelitesolutions.com',
  'http://localhost:3000',
  'http://localhost:5173',
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
    const protocol = u.protocol;
    if (host.startsWith('localhost')) return true;
    if (host.endsWith('xelitesolutions.com')) return protocol === 'https:';
    return whitelist.includes(origin);
  } catch {
    return whitelist.includes(origin);
  }
};

// Removed cors() middleware in favor of a single, deterministic CORS layer below

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Apply helmet with CORS-friendly configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));

app.use(express.json({ limit: '50mb' }));

// --- Extra CORS hardening: echo exact Origin, set Vary, handle preflight ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'X-New-Token, x-new-token');
    const reqHeaders = req.headers['access-control-request-headers'];
    if (reqHeaders) res.header('Access-Control-Allow-Headers', reqHeaders);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

// --- Serve Static Frontend Files ---
const publicSitePath = path.join(__dirname, '..', 'public-site');
const dashboardPath = path.join(__dirname, '..', 'dashboard-x');

const finalDashboardPath = path.join(__dirname, '..', 'dashboard-x', 'dist');
app.use('/dashboard', express.static(finalDashboardPath));

app.get('/dashboard*', (req, res) => {
    const indexPath = path.join(finalDashboardPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.sendFile(path.join(dashboardPath, 'index.html'));
    }
});

app.get('/', (req, res) => {
    const indexPath = path.join(finalDashboardPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.sendFile(path.join(publicSitePath, 'index.html'));
    }
});

app.use(express.static(publicSitePath));
app.use(express.static(finalDashboardPath));

async function setupDependencies() {
    let db;
    let planningSystem = null;
    let schedulingSystem = null;
    try {
        db = await initMongo();
        await connectDB(); // Initialize Mongoose connection
        await setupSuperAdmin(() => Promise.resolve(db));
        planningSystem = new PlanningSystem(db);
        schedulingSystem = new SchedulingSystem(db);
    } catch (error) {
        console.error('Could not connect to MongoDB. Continuing without database connection.', error);
        db = null;
    }
    const sandboxManager = await new SandboxManager().initializeConnections();
    const memoryManager = new MemoryManager();
    
    const dependencies = {
        db,
        sandboxManager,
        memoryManager,
        eventBus,
        planningSystem,
        schedulingSystem,
        requireRole: requireRole(db),
        optionalAuth: optionalAuth(db),
        JWT_SECRET: process.env.JWT_SECRET || 'a-very-weak-secret-for-dev',
    };

    await toolManager.initialize(dependencies);
    dependencies.toolManager = toolManager;
    const joeAgentServer = new JoeAgentWebSocketServer(server, dependencies);
    dependencies.joeAgentServer = joeAgentServer;

    return dependencies;
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

async function startServer() {
  try {
    console.log('🔄 Starting server setup...');
    const dependencies = await setupDependencies();
    setupAuth(dependencies.db);
    await applyRoutes(dependencies);
    
    app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
    app.use((err, req, res, _next) => {
        void _next;
        console.error('❌ Global Error:', err);
        res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    });

    server.listen(CONFIG.PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on http://localhost:${CONFIG.PORT}`);
    });

  } catch (error) {
    console.error('❌ Fatal: Failed to start server:', error);
    process.exit(1);
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

startServer();

export default app;

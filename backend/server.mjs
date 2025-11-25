
// --- Pre-load environment variables ---
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '.env') });
}

// --- Now, import the rest of the app ---
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import fs from 'fs';
// import { register, collectDefaultMetrics } from 'prom-client'; // Removed as dependency was uninstalled

// --- Core Components ---
import { initMongo, closeMongoConnection } from './src/core/database.mjs';
import { setupSuperAdmin } from './src/core/setup-admin.mjs';
import { setupAuth, requireRole, optionalAuth } from './src/middleware/auth.mjs';
import eventBus from './src/core/event-bus.mjs';

// --- Services ---
import toolManager from './src/services/tools/tool-manager.service.mjs';
import SandboxManager from './src/sandbox/SandboxManager.mjs';
import MemoryManager from './src/services/memory/memory.service.mjs';
import { JoeAgentWebSocketServer } from './src/services/joeAgentWebSocket.mjs';

const CONFIG = {
  PORT: process.env.PORT || 4001,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// collectDefaultMetrics(); // Removed as dependency was uninstalled

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));

// --- Serve Static Frontend Files ---
const publicSitePath = path.join(__dirname, '..', 'public-site');
const dashboardPath = path.join(__dirname, '..', 'dashboard-x'); // Assuming the build output is not in 'dist' yet, or we'll build it there.

// --- Serve Static Frontend Files ---
// 1. Serve dashboard-x at /dashboard (Must be before public-site to avoid conflict)
// We will serve the dashboard from the root of the dashboard-x folder for now, 
// assuming the build process will place the final files there or in 'dist'.
// For now, we will assume the dashboard is built into 'dashboard-x/dist' as is common.
const finalDashboardPath = path.join(__dirname, '..', 'dashboard-x', 'dist');
app.use('/dashboard', express.static(finalDashboardPath));

// 2. Fallback for SPA routing: serve index.html for unmatched routes in dashboard
app.get('/dashboard*', (req, res) => {
    const indexPath = path.join(finalDashboardPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // If the dashboard hasn't been built yet, serve the placeholder index.html
        res.sendFile(path.join(__dirname, '..', 'dashboard-x', 'index.html'));
    }
});

// 3. Serve public-site (landing page and login) at root
// Serve the Dashboard (which will contain the new landing logic) at the root path
app.get('/', (req, res) => {
    const indexPath = path.join(finalDashboardPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Fallback to the public site if dashboard is not built
        res.sendFile(path.join(publicSitePath, 'index.html'));
    }
});

// Serve other static files from public-site (for login.html, etc.)
app.use(express.static(publicSitePath));

// Serve static files from the built dashboard (must be after public-site to avoid conflict)
app.use(express.static(finalDashboardPath));

async function setupDependencies() {
    let db;
    try {
        db = await initMongo();
        // Run Super Admin setup after successful DB connection
        await setupSuperAdmin(() => Promise.resolve(db));
    } catch (error) {
        console.error('Could not connect to MongoDB. Continuing without database connection.', error);
        db = null;
    }
    const sandboxManager = await new SandboxManager().initializeConnections();
    const memoryManager = new MemoryManager();
    
    // The dependencies object that will be passed around
    const dependencies = {
        db,
        sandboxManager,
        memoryManager,
        eventBus,
        requireRole: requireRole(db),
        optionalAuth: optionalAuth(db),
    };

    // Pass the dependencies to the ToolManager
    await toolManager.initialize(dependencies);
    dependencies.toolManager = toolManager; // Add toolManager itself to dependencies

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
        try {
            const { default: routerFactory } = await import(path.join(apiDir, file));
            const router = routerFactory(dependencies);
            app.use(routePath, router);
        } catch (error) {
            console.error(`❌ Failed to load route ${routeName}:`, error);
        }
    }
  }
  
  // app.get('/metrics', async (req, res) => {
  //     // Removed as dependency was uninstalled
  // });
}

async function startServer() {
  try {
    console.log('🔄 Starting server setup...');
    const dependencies = await setupDependencies();
    setupAuth(dependencies.db);
    await applyRoutes(dependencies);
    
    app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
    app.use((err, req, res, next) => {
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
    console.log(`
🔌 Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        console.log('Closed out remaining connections.');
        await Promise.all([
            closeMongoConnection().then(() => console.log('MongoDB connection closed.')),
            // Add other service shutdowns here if needed (e.g., Redis)
        ]);
        process.exit(0);
    });
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;

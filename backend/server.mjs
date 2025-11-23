
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

// --- Core Components ---
import { initMongo, closeMongoConnection } from './src/core/database.mjs';
import { setupAuth, requireRole, optionalAuth } from './src/middleware/auth.mjs';
import eventBus from './src/core/event-bus.mjs';

// --- Services ---
import toolManager from './src/services/tools/tool-manager.service.mjs';
import SandboxManager from './src/sandbox/SandboxManager.mjs';
import MemoryManager from './src/services/memory/memory.service.mjs';
import { JoeAgentWebSocketServer } from './src/services/joeAgentWebSocket.mjs'; // ✨ Import the new WebSocket Server

// =========================
// 🎯 Configuration
// =========================
const CONFIG = {
  PORT: process.env.PORT || 4001,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// =========================
// 🚀 Main App Initialization
// =========================
const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);
app.disable('x-powered-by');

// =========================
// 📦 Core Middlewares
// =========================
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));

// =========================
// 🚀 Service & Dependency Injection Setup
// =========================
async function setupDependencies() {
    // Initialize core services first
    await toolManager.initialize();
    const sandboxManager = new SandboxManager();
    await sandboxManager.initialize();

    const db = await initMongo();
    const memoryManager = new MemoryManager({ db }); 
    
    // ✨ Initialize the Joe Agent WebSocket Server with the HTTP server
    const joeAgentServer = new JoeAgentWebSocketServer(server);

    return {
        db,
        memoryManager,
        sandboxManager,
        joeAgentServer, // Expose the new service
        toolManager,
        requireRole: requireRole(db),
        optionalAuth: optionalAuth(db),
        eventBus
    };
}

// =========================
// 📁 Dynamic Route Loading
// =========================
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
}

// =========================
// 🚀 Server Start & Shutdown
// =========================
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
      console.log(`🤖 Joe Agent v2 is active at ws://localhost:${CONFIG.PORT}/ws/joe-agent`);
    });

  } catch (error) {
    console.error('❌ Fatal: Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown logic
async function gracefulShutdown(signal) { 
    console.log(`\n🔌 Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
        console.log('Closed out remaining connections.');
        closeMongoConnection().then(() => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;

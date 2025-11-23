
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
import eventBus from './src/core/event-bus.mjs'; // Import the Event Bus

// --- Services ---
import toolManager from './src/services/tools/tool-manager.service.mjs';
import SandboxManager from './src/sandbox/SandboxManager.mjs';
import { AdvancedWorkerManager } from './src/services/ai/project-generator.service.mjs';
import JoeAdvancedService from './src/services/ai/joe-advanced.service.mjs'; 
import MemoryManager from './src/services/memory/memory.service.mjs';
import RealtimeService from './src/services/realtime.service.mjs'; // ✨ Import the new Realtime Service

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
// ✨ Create the HTTP server instance here so we can pass it to the WebSocket server
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
    
    const workerManager = new AdvancedWorkerManager({ sandboxManager });

    // ✨ Initialize the Realtime Service with the HTTP server
    const realtimeService = new RealtimeService(server);

    return {
        db,
        memoryManager,
        workerManager,
        sandboxManager,
        realtimeService, // Expose the new service
        joeAdvancedService: JoeAdvancedService,
        toolManager,
        requireRole: requireRole(db),
        optionalAuth: optionalAuth(db),
        eventBus // Expose the event bus
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
    
    await dependencies.workerManager.start();

    app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
    app.use((err, req, res, next) => {
        console.error('❌ Global Error:', err);
        res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    });

    // ✨ Listen on the HTTP server, not the Express app
    server.listen(CONFIG.PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on http://localhost:${CONFIG.PORT}`);
      console.log(`📡 Quantum Tunnel is open at ws://localhost:${CONFIG.PORT}/ws/quantum-tunnel`);
    });

  } catch (error) {
    console.error('❌ Fatal: Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown logic remains the same...
async function gracefulShutdown(signal) { /* ... */ }
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;

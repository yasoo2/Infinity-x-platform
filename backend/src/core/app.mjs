
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { WebSocketServer } from 'ws';

// --- Core Components ---
import { initMongo, closeMongoConnection } from './database.mjs';
import { setupAuth, requireRole, optionalAuth } from '../middleware/auth.mjs';
import liveStreamWebSocket from '../services/liveStreamWebSocket.mjs';

// --- Services ---
// NOTE: MemoryManager and JoeAdvancedService are instantiated in setupDependencies
// to avoid circular dependency issues if they need the db instance.
import SandboxManager from '../services/sandbox/SandboxManager.mjs';
import FileProcessingService from '../services/files/file-processing.service.mjs';
import { SimpleWorkerManager } from '../services/jobs/simple.worker.mjs';
import JoeAdvancedService from '../services/ai/joe-advanced.service.mjs'; // Direct import
import MemoryManager from '../services/memory/memory.service.mjs'; // Direct import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// =========================
// 🎯 Configuration
// =========================
const CONFIG = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-key'
};

// =========================
// 🚀 Main App Initialization
// =========================
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true }); // Let the HTTP server handle upgrades

app.set('trust proxy', 1);
app.disable('x-powered-by');

// =========================
// 📦 Core Middlewares
// =========================
app.use(helmet());
app.use(cors({ origin: '*', credentials: true })); // Loosened for development
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =========================
// 🚀 Service & Dependency Injection Setup
// =========================
async function setupDependencies() {
    const db = await initMongo();

    // Pass db to services that need it
    const memoryManager = new MemoryManager({ db }); 
    const joeAdvancedService = new JoeAdvancedService({ memoryManager }); // Pass memory manager to AI

    const sandboxManager = new SandboxManager();
    const fileProcessingService = new FileProcessingService({ memoryManager });

    // Background job worker
    const workerManager = new SimpleWorkerManager({ maxConcurrent: 3 });

    console.log('✅ All services instantiated.');

    return {
        db,
        memoryManager,
        sandboxManager,
        fileProcessingService,
        joeAdvancedService,
        workerManager,
        requireRole: requireRole(db), // Pass db to auth middleware factory
        optionalAuth: optionalAuth(db),
    };
}

// =========================
// 📁 Dynamic Route Loading
// =========================
async function applyRoutes(dependencies) {
  console.log('\n🔄 Loading routes...');
  const apiDir = path.join(__dirname, '..', 'api');
  const routeFiles = await fs.promises.readdir(apiDir);

  for (const file of routeFiles) {
    if (file.endsWith('.router.mjs')) {
      const routeName = file.split('.')[0];
      const routePath = `/api/v1/${routeName}`;
      try {
        const modulePath = path.join(apiDir, file);
        const { default: routerFactory } = await import(modulePath);
        
        if (typeof routerFactory !== 'function') {
             console.warn(`⚠️  No router factory exported from ${file}. Skipping.`);
             continue;
        }

        // Inject the entire dependency container into the factory
        const router = routerFactory(dependencies);
        app.use(routePath, router);
        console.log(`✅ Route registered: ${routePath}`);

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
    const dependencies = await setupDependencies();
    
    // Setup core authentication strategies
    setupAuth(dependencies.db);

    // Load all API routes and inject dependencies
    await applyRoutes(dependencies);
    
    // Start the background job workers
    await dependencies.workerManager.start();

    // Handle WebSocket Upgrades
    server.on('upgrade', (request, socket, head) => {
        // Hand off to the specific websocket handler
        liveStreamWebSocket.handleUpgrade(request, socket, head, (ws) => {
            liveStreamWebSocket.emit('connection', ws, request);
        });
    });
    console.log('✅ WebSocket server integrated.');

    // Handle 404s
    app.use((req, res) => {
        res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });
    });

    // Global error handler
    app.use((err, req, res, next) => {
        console.error('❌ Global Error:', err);
        res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    });

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
    await closeMongoConnection();
    // Optionally, add workerManager.stop()
    console.log('✅ All services stopped. Server shut down gracefully.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;

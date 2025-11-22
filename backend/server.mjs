
// --- Pre-load environment variables ---
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load .env file in non-production environments
if (process.env.NODE_ENV !== 'production') {
    const envPath = path.resolve(__dirname, '.env');
    const result = dotenv.config({ path: envPath });

    if (result.error) {
      console.warn(`[server.mjs] Warning: Could not find or load .env file from ${envPath}. This is expected in some environments. Proceeding without it.`);
    } else {
      console.log(`[server.mjs] Loaded environment variables from ${envPath}`);
    }
}

// --- Now, import the rest of the app ---
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';

// --- Core Components ---
import { initMongo, closeMongoConnection } from './src/core/database.mjs';
import { setupAuth, requireRole, optionalAuth } from './src/middleware/auth.mjs';
import liveStreamWebSocket from './src/services/liveStreamWebSocket.mjs';

// --- Services ---
import SandboxManager from './src/sandbox/SandboxManager.mjs';
import FileProcessingService from './src/services/files/file-processing.service.mjs';
import { SimpleWorkerManager } from './src/services/jobs/simple.worker.mjs';
import JoeAdvancedService from './src/services/ai/joe-advanced.service.mjs'; 
import MemoryManager from './src/services/memory/memory.service.mjs'; 

// =========================
// 🎯 Configuration
// =========================
const CONFIG = {
  PORT: process.env.PORT || 4001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-key',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
};

// =========================
// 🚀 Main App Initialization
// =========================
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.set('trust proxy', 1);
app.disable('x-powered-by');

// =========================
// 📦 Core Middlewares
// =========================
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// =========================
// 🚀 Service & Dependency Injection Setup
// =========================
async function setupDependencies() {
    const db = await initMongo();
    const memoryManager = new MemoryManager({ db }); 
    const sandboxManager = new SandboxManager();
    const joeAdvancedService = JoeAdvancedService; 
    const fileProcessingService = new FileProcessingService({ memoryManager });
    const workerManager = new SimpleWorkerManager({ 
        maxConcurrent: 3, 
        openaiApiKey: CONFIG.OPENAI_API_KEY 
    });

    return {
        db,
        memoryManager,
        sandboxManager,
        fileProcessingService,
        joeAdvancedService,
        workerManager,
        requireRole: requireRole(db),
        optionalAuth: optionalAuth(db),
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
        const modulePath = path.join(apiDir, file);
        const { default: routerFactory } = await import(modulePath);
        
        if (typeof routerFactory !== 'function') {
             console.warn(`⚠️  No router factory exported from ${file}. Skipping.`);
             continue;
        }

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
    const dependencies = await setupDependencies();
    setupAuth(dependencies.db);
    await applyRoutes(dependencies);
    await dependencies.workerManager.start();

    server.on('upgrade', (request, socket, head) => {
        liveStreamWebSocket.handleUpgrade(request, socket, head, (ws) => {
            liveStreamWebSocket.emit('connection', ws, request);
        });
    });

    app.use((req, res) => {
        res.status(404).json({ error: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });
    });

    app.use((err, req, res, next) => {
        console.error('❌ Global Error:', err);
        res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    });

    server.listen(CONFIG.PORT, '0.0.0.0', () => {
      console.log(`✅ Server is running on http://localhost:${CONFIG.PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await closeMongoConnection();
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;

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
  PORT: process.env.PORT || 4001,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// collectDefaultMetrics(); // Removed as dependency was uninstalled

const app = express();
const server = http.createServer(app);

// --- CORS Configuration ---
const whitelist = [
  'https://xelitesolutions.com',
  'https://www.xelitesolutions.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://5178-iavhwtgdu2snl4ndzssze-a66a9dda.manus-asia.computer',
];

const corsOptions = {
  origin(origin, callback) {
    console.log('CORS check origin:', origin);

    // Requests without Origin header (e.g. curl, Postman, same-server)
    if (!origin) {
      return callback(null, true);
    }

    if (whitelist.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
};

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());

// Apply CORS (including preflight)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
app

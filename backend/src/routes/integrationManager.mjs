// backend/src/routes/integrationManager.mjs
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { Octokit } from '@octokit/rest';
import axios from 'axios';
import pRetry from 'p-retry';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import pino from 'pino';

// =======================
// CONFIG & UTILS
// =======================

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
});

const PLATFORMS = {
  render: { baseUrl: 'https://api.render.com/v1', timeout: 10000 },
  cloudflare: { baseUrl: 'https://api.cloudflare.com/client/v4', timeout: 15000 },
};

// Redis connection (optional - will work without it)
let redis = null;
let deployQueue = null;

try {
  if (process.env.REDIS_URL) {
    redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });
    deployQueue = new Queue('integration-deploy', { connection: redis });
    console.log('✅ Redis connected for integrationManager');
  } else {
    console.log('⚠️ Redis not configured - running without queue');
  }
} catch (error) {
  console.log('⚠️ Redis connection failed - running without queue:', error.message);
}

// =======================
// MIDDLEWARES
// =======================

const router = express.Router();
router.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { ok: false, error: 'Too many requests' },
});
router.use(apiLimiter);

const validate = (validations) => [
  ...validations,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, error: errors.array()[0].msg });
    }
    next();
  },
];

const verifyGitHubWebhook = (payload, signature, secret) => {
  if (!signature || !secret) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

// =======================
// CACHING
// =======================

const getCache = async (key) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

const setCache = async (key, value, ttl = 30) => {
  await redis.setex(key, ttl, JSON.stringify(value));
};

// =======================
// SERVICES
// =======================

const createClient = (baseURL, timeout) =>
  axios.create({ baseURL, timeout, validateStatus: (status) => status < 500 });

const deployToRender = async (apiKey, serviceId, clearCache = false) => {
  const client = createClient(PLATFORMS.render.baseUrl, PLATFORMS.render.timeout);
  return pRetry(
    () => client.post(`/services/${serviceId}/deploys`, { clearCache }, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    }),
    { retries: 3, minTimeout: 1000 }
  );
};

const getRenderStatus = async (apiKey, serviceId) => {
  const cacheKey = `render:status:${serviceId}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const client = createClient(PLATFORMS.render.baseUrl, PLATFORMS.render.timeout);
  const res = await client.get(`/services/${serviceId}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  const result = {
    name: res.data.name,
    status: res.data.suspended ? 'suspended' : res.data.serviceDetails?.status || 'unknown',
    url: res.data.serviceDetails?.url,
  };

  await setCache(cacheKey, result, 20);
  return result;
};

const deployToCloudflare = async (apiToken, accountId, projectName, branch = 'main') => {
  const client = createClient(PLATFORMS.cloudflare.baseUrl, PLATFORMS.cloudflare.timeout);
  return pRetry(
    () => client.post(`/accounts/${accountId}/pages/projects/${projectName}/deployments`, { branch }, {
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' }
    }),
    { retries: 3 }
  );
};

// =======================
// BACKGROUND WORKER (Optional - only if Redis is available)
// =======================

if (redis && deployQueue) {
  new Worker('integration-deploy', async (job) => {
    const { data, id: jobId } = job;
    logger.info({ jobId }, 'Auto-deploy job started');

    const results = { github: { ok: true }, render: {}, cloudflare: {} };

    if (data.render) {
      try {
        const res = await deployToRender(data.render.apiKey, data.render.serviceId, data.render.clearCache);
        results.render = { ok: true, deployId: res.data.id };
      } catch (err) {
        results.render = { ok: false, error: err.message };
      }
    }

    if (data.cloudflare) {
      try {
        const res = await deployToCloudflare(
          data.cloudflare.apiToken,
          data.cloudflare.accountId,
          data.cloudflare.projectName,
          data.cloudflare.branch
        );
        results.cloudflare = { ok: true, deploymentId: res.data.result?.id };
      } catch (err) {
        results.cloudflare = { ok: false, error: err.message };
      }
    }

    return results;
  }, { connection: redis });
  console.log('✅ Integration Worker started');
} else {
  console.log('⚠️ Integration Worker disabled - Redis not available');
}

// =======================
// ROUTES
// =======================

// Health Check
router.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), time: new Date().toISOString() });
});

// GitHub Webhook
router.post('/webhook/github', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = req.body;

  if (!verifyGitHubWebhook(payload, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
    return res.status(401).json({ ok: false, error: 'Invalid signature' });
  }

  if (req.headers['x-github-event'] === 'push' && payload.ref === 'refs/heads/main') {
    const jobId = uuidv4();
    await deployQueue.add('deploy', {
      render: payload.renderConfig,
      cloudflare: payload.cloudflareConfig,
    }, { jobId });

    logger.info({ jobId, repo: payload.repository.full_name }, 'Deploy triggered via webhook');
    return res.json({ ok: true, jobId, message: 'Deployment queued' });
  }

  res.json({ ok: true });
});

// Track Job
router.get('/deploy/status/:jobId', async (req, res) => {
  const job = await deployQueue.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ ok: false, error: 'Job not found' });

  const state = await job.getState();
  const result = job.returnvalue || job.failedReason;

  res.json({ ok: true, jobId: req.params.jobId, state, result });
});

// Render Deploy
router.post('/render/deploy',
  validate([
    body('apiKey').isString().notEmpty(),
    body('serviceId').isString().notEmpty(),
    body('clearCache').optional().isBoolean(),
  ]),
  async (req, res) => {
    try {
      const { apiKey, serviceId, clearCache } = req.body;
      const response = await deployToRender(apiKey, serviceId, clearCache);

      res.json({
        ok: true,
        deployId: response.data.id,
        dashboard: `https://dashboard.render.com/web/${serviceId}/deploys/${response.data.id}`,
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Render deploy failed');
      res.json({ ok: false, error: error.message });
    }
  }
);

// Render Status
router.post('/render/status',
  validate([
    body('apiKey').isString().notEmpty(),
    body('serviceId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const status = await getRenderStatus(req.body.apiKey, req.body.serviceId);
      res.json({ ok: true, service: status });
    } catch (error) {
      res.json({ ok: false, error: error.message });
    }
  }
);

// Cloudflare Deploy
router.post('/cloudflare/deploy',
  validate([
    body('apiToken').isString().notEmpty(),
    body('accountId').isString().notEmpty(),
    body('projectName').isString().notEmpty(),
    body('branch').optional().isString(),
  ]),
  async (req, res) => {
    try {
      const { apiToken, accountId, projectName, branch = 'main' } = req.body;
      const response = await deployToCloudflare(apiToken, accountId, projectName, branch);

      res.json({
        ok: true,
        deploymentId: response.data.result?.id,
        url: response.data.result?.url,
      });
    } catch (error) {
      logger.error({ error: error.message }, 'Cloudflare deploy failed');
      res.json({ ok: false, error: error.message });
    }
  }
);

// Auto Deploy (Manual)
router.post('/auto-deploy',
  validate([
    body('githubToken').optional().isString(),
    body('githubOwner').optional().isString(),
    body('githubRepo').optional().isString(),
    body('renderApiKey').optional().isString(),
    body('renderServiceId').optional().isString(),
    body('cloudflareApiToken').optional().isString(),
    body('cloudflareAccountId').optional().isString(),
    body('cloudflareProjectName').optional().isString(),
  ]),
  async (req, res) => {
    const jobId = uuidv4();
    const data = {
      render: req.body.renderApiKey ? {
        apiKey: req.body.renderApiKey,
        serviceId: req.body.renderServiceId,
        clearCache: req.body.clearCache || false,
      } : null,
      cloudflare: req.body.cloudflareApiToken ? {
        apiToken: req.body.cloudflareApiToken,
        accountId: req.body.cloudflareAccountId,
        projectName: req.body.cloudflareProjectName,
        branch: req.body.branch || 'main',
      } : null,
    };

    await deployQueue.add('deploy', data, { jobId });
    res.json({ ok: true, jobId, message: 'Deployment queued' });
  }
);

// Google Search (unchanged with fallback)
router.post('/google/search', async (req, res) => {
  try {
    const { query, apiKey, searchEngineId } = req.body;
    if (!query) return res.json({ ok: false, error: 'Query required' });

    if (apiKey && searchEngineId) {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: { key: apiKey, cx: searchEngineId, q: query },
      });
      const results = response.data.items?.map(i => ({
        title: i.title,
        link: i.link,
        snippet: i.snippet,
      })) || [];
      res.json({ ok: true, results });
    } else {
      res.json({
        ok: true,
        results: [{
          title: `Mock: ${query}`,
          link: `https://google.com/search?q=${encodeURIComponent(query)}`,
          snippet: 'Use real API key for live results',
        }],
      });
    }
  } catch (error) {
    logger.error({ error: error.message }, 'Google search failed');
    res.json({ ok: false, error: error.message });
  }
});

export default router;
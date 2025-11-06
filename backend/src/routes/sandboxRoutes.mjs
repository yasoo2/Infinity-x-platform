/**
 * sandboxRoutes.mjs
 * REST API routes for sandbox execution
 */

import express from 'express';
import SandboxManager from '../sandbox/SandboxManager.mjs';

// Simple auth middleware (replace with your actual auth system)
const requireAuth = (req, res, next) => {
  // For now, allow all requests - implement proper auth later
  next();
};

const router = express.Router();
const sandboxManager = new SandboxManager({
  maxConcurrent: 10,
  timeout: 60000 // 60 seconds
});

// Initialize sandbox on startup
await sandboxManager.initialize();

/**
 * POST /api/v1/sandbox/execute/shell
 * Execute a shell command in the sandbox
 */
router.post('/execute/shell', requireAuth, async (req, res) => {
  try {
    const { command, sessionId, timeout } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const result = await sandboxManager.executeShell(command, {
      sessionId,
      timeout
    });

    res.json({
      ok: true,
      result
    });
  } catch (err) {
    console.error('Sandbox shell execution error:', err);
    res.status(500).json({
      error: 'SANDBOX_EXECUTION_ERROR',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/sandbox/execute/python
 * Execute Python code in the sandbox
 */
router.post('/execute/python', requireAuth, async (req, res) => {
  try {
    const { code, sessionId, timeout } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = await sandboxManager.executePython(code, {
      sessionId,
      timeout
    });

    res.json({
      ok: true,
      result
    });
  } catch (err) {
    console.error('Sandbox Python execution error:', err);
    res.status(500).json({
      error: 'SANDBOX_EXECUTION_ERROR',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/sandbox/execute/node
 * Execute Node.js code in the sandbox
 */
router.post('/execute/node', requireAuth, async (req, res) => {
  try {
    const { code, sessionId, timeout } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = await sandboxManager.executeNode(code, {
      sessionId,
      timeout
    });

    res.json({
      ok: true,
      result
    });
  } catch (err) {
    console.error('Sandbox Node.js execution error:', err);
    res.status(500).json({
      error: 'SANDBOX_EXECUTION_ERROR',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/sandbox/session/create
 * Create a new sandbox session
 */
router.post('/session/create', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await sandboxManager.createSession(sessionId);

    res.json({
      ok: true,
      session
    });
  } catch (err) {
    console.error('Sandbox session creation error:', err);
    res.status(500).json({
      error: 'SESSION_CREATION_ERROR',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/sandbox/file/write
 * Write a file to the sandbox
 */
router.post('/file/write', requireAuth, async (req, res) => {
  try {
    const { sessionId, filePath, content } = req.body;

    if (!sessionId || !filePath || !content) {
      return res.status(400).json({ error: 'sessionId, filePath, and content are required' });
    }

    const result = await sandboxManager.writeFile(sessionId, filePath, content);

    res.json({
      ok: true,
      result
    });
  } catch (err) {
    console.error('Sandbox file write error:', err);
    res.status(500).json({
      error: 'FILE_WRITE_ERROR',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/sandbox/file/read
 * Read a file from the sandbox
 */
router.get('/file/read', requireAuth, async (req, res) => {
  try {
    const { sessionId, filePath } = req.query;

    if (!sessionId || !filePath) {
      return res.status(400).json({ error: 'sessionId and filePath are required' });
    }

    const result = await sandboxManager.readFile(sessionId, filePath);

    res.json({
      ok: true,
      result
    });
  } catch (err) {
    console.error('Sandbox file read error:', err);
    res.status(500).json({
      error: 'FILE_READ_ERROR',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/sandbox/files/list
 * List files in a sandbox directory
 */
router.get('/files/list', requireAuth, async (req, res) => {
  try {
    const { sessionId, dirPath } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const result = await sandboxManager.listFiles(sessionId, dirPath);

    res.json({
      ok: true,
      result
    });
  } catch (err) {
    console.error('Sandbox file list error:', err);
    res.status(500).json({
      error: 'FILE_LIST_ERROR',
      message: err.message
    });
  }
});

/**
 * DELETE /api/v1/sandbox/session/cleanup
 * Clean up a sandbox session
 */
router.delete('/session/cleanup', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const result = await sandboxManager.cleanupSession(sessionId);

    res.json({
      ok: true,
      result
    });
  } catch (err) {
    console.error('Sandbox session cleanup error:', err);
    res.status(500).json({
      error: 'SESSION_CLEANUP_ERROR',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/sandbox/stats
 * Get sandbox statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = sandboxManager.getStats();
    const activeProcesses = sandboxManager.getActiveProcesses();

    res.json({
      ok: true,
      stats,
      activeProcesses
    });
  } catch (err) {
    console.error('Sandbox stats error:', err);
    res.status(500).json({
      error: 'STATS_ERROR',
      message: err.message
    });
  }
});

/**
 * DELETE /api/v1/sandbox/process/kill
 * Kill a specific process
 */
router.delete('/process/kill', requireAuth, async (req, res) => {
  try {
    const { processId } = req.body;

    if (!processId) {
      return res.status(400).json({ error: 'processId is required' });
    }

    const result = sandboxManager.killProcess(processId);

    res.json({
      ok: true,
      result
    });
  } catch (err) {
    console.error('Sandbox process kill error:', err);
    res.status(500).json({
      error: 'PROCESS_KILL_ERROR',
      message: err.message
    });
  }
});

export default router;

import express from 'express';
import toolManager from '../services/tools/tool-manager.service.mjs';
import { ObjectId } from 'mongodb';

// Renamed to factory and set as default export for consistency with the new architecture
const joeRouterFactory = ({ requireRole, db }) => {
  const router = express.Router();

  // GET /api/v1/joe/ping
  router.get('/ping', (req, res) => {
    res.send('pong from joeRouter');
  });

  // POST /api/v1/joe/command - Queue a command for a worker to execute
  router.post('/command', requireRole('USER'), async (req, res) => {
    try {
      const mongoDb = await db();
      const { commandText, lang, voice } = req.body;
      const sessionToken = req.session.token;

      if (!commandText) {
        return res.status(400).json({ error: 'MISSING_FIELDS', message: 'commandText is required' });
      }

      const now = new Date();
      const result = await mongoDb.collection('joe_commands').insertOne({
        createdAt: now,
        sessionToken, // Link to the session
        userId: req.user._id, // Link to the user
        lang: lang || 'en',
        voice: !!voice,
        commandText,
        status: 'QUEUED' // The initial status
      });

      await mongoDb.collection('joe_activity').insertOne({
        ts: now,
        action: 'RECEIVED_COMMAND',
        detail: commandText,
        userId: req.user._id
      });

      res.status(202).json({
        success: true,
        requestId: result.insertedId.toString(),
        message: 'Command accepted and queued for processing.'
      });
    } catch (err) {
      console.error('❌ /api/joe/command error', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  });

  // GET /api/v1/joe/activity-stream - Get the latest activity
  router.get('/activity-stream', requireRole('ADMIN'), async (req, res) => {
    try {
      const mongoDb = await db();
      const activities = await mongoDb.collection('joe_activity')
        .find({})
        .sort({ ts: -1 })
        .limit(50) // Increased limit
        .toArray();

      res.json({ success: true, events: activities });
    } catch (err) {
      console.error('❌ /api/joe/activity-stream error', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  });

  // GET /api/v1/joe/suggestions - Get pending suggestions for approval
  router.get('/suggestions', requireRole('ADMIN'), async (req, res) => {
    try {
      const mongoDb = await db();
      const plans = await mongoDb.collection('joe_plans')
        .find({ status: 'PENDING' })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      res.json({ success: true, suggestions: plans });
    } catch (err) {
      console.error('❌ /api/joe/suggestions error', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  });

  // POST /api/v1/joe/execute - Analyze instruction and auto-run relevant tools
  router.post('/execute', requireRole('USER'), async (req, res) => {
    try {
      const { instruction, context } = req.body || {};
      if (!instruction) {
        return res.status(400).json({ success: false, error: 'MISSING_INSTRUCTION' });
      }
      const out = await toolManager.execute('autoPlanAndExecute', { instruction, context });
      return res.json(out);
    } catch (err) {
      console.error('❌ /api/joe/execute error', err);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  });

  // POST /api/v1/joe/suggestions/decision - Approve or deny a suggestion
  router.post('/suggestions/decision', requireRole('ADMIN'), async (req, res) => {
    try {
      const mongoDb = await db();
      const { planId, decision } = req.body;
      if (!planId || !['APPROVE', 'DENY'].includes(decision)) {
        return res.status(400).json({ error: 'MISSING_FIELDS', message: 'planId and decision (APPROVE/DENY) are required.' });
      }

      const now = new Date();
      await mongoDb.collection('joe_plans').updateOne(
        { _id: new ObjectId(planId) },
        {
          $set: {
            approved: decision === 'APPROVE',
            status: decision === 'APPROVE' ? 'APPROVED' : 'DENIED',
            decidedAt: now
          }
        }
      );

      await mongoDb.collection('joe_activity').insertOne({
        ts: now,
        action: 'SUGGESTION_DECISION',
        detail: `Plan ${planId} -> ${decision}`,
        userId: req.user._id
      });

      res.json({ success: true });
    } catch (err) {
      console.error('❌ /api/joe/suggestions/decision error', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
    }
  });

  return router;
}

export default joeRouterFactory;

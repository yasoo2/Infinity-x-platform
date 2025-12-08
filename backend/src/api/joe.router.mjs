import express from 'express';
import toolManager from '../services/tools/tool-manager.service.mjs';
import joeAdvanced from '../services/ai/joe-advanced.service.mjs';
import { setKey, setActive } from '../services/ai/runtime-config.mjs';
import { ObjectId } from 'mongodb';

// Renamed to factory and set as default export for consistency with the new architecture
const joeRouterFactory = ({ requireRole, optionalAuth, db }) => {
  const router = express.Router();
  if (optionalAuth) router.use(optionalAuth);

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
      const userId = req.user?._id || null;

      if (!commandText) {
        return res.status(400).json({ error: 'MISSING_FIELDS', message: 'commandText is required' });
      }

      const now = new Date();
      const result = await mongoDb.collection('joe_commands').insertOne({
        createdAt: now,
        sessionToken, // Link to the session
        userId, // Link to the user (nullable for guests)
        lang: lang || 'en',
        voice: !!voice,
        commandText,
        status: 'QUEUED' // The initial status
      });

      await mongoDb.collection('joe_activity').insertOne({
        ts: now,
        action: 'RECEIVED_COMMAND',
        detail: commandText,
        userId
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

  // Unified handler for /api/v1/joe/execute (supports POST and GET)
  const handleExecute = async (req, res) => {
    try {
      const isPost = req.method === 'POST';
      const src = isPost ? (req.body || {}) : (req.query || {});
      const instruction = src.instruction;
      const lang = src.lang;
      const model = src.model;
      const providedSessionId = src.sessionId;
      const provider = src.provider;
      const apiKey = src.apiKey;
      if (!instruction) {
        return res.status(400).json({ success: false, error: 'MISSING_INSTRUCTION' });
      }
      const s = String(instruction || '').toLowerCase();
      const wantsSummary = /(شو|شنو|ايش)\s*(بتقدر|تقدر)\s*(تعمل)|وظائفك|قدراتك|ملخص\s*عن\s*النظام|شو\s*الادوات|ما\s*هي\s*ادواتك|what\s*can\s*you\s*do|your\s*capabilities|system\s*summary|tools\s*you\s*control|functions/.test(s);
      if (wantsSummary) {
        const schemas = toolManager.getToolSchemas();
        const descs = (schemas || []).map(t => ({ n: String(t?.function?.name || '').trim(), d: String(t?.function?.description || '').trim() })).filter(x => x.n);
        const top = descs.slice(0, 10).map(x => `- ${x.n}: ${x.d}`).join('\n') || '- لا توجد أوصاف متاحة.';
        const count = Array.isArray(schemas) ? schemas.length : 0;
        const responsibilities = ['إنتاج وسائط ونشر محلي','تصفح وتحليل الروابط','تدقيق أمني وفحص أسرار','إدخال واستعلام المعرفة','تنسيق وفحص الشيفرة','عمليات GitHub ومزامنة'];
        const response = [`🎨 ملخص النظام`,`🔢 عدد الأدوات/الوظائف: ${count}`,`⚙️ أبرز القدرات:`,responsibilities.map(r=>`- ${r}`).join('\n'),`🛠️ أهم الأدوات:`,top].filter(Boolean).join('\n');
        return res.json({ success: true, response, toolsUsed: [] });
      }
      if (typeof apiKey === 'string' && apiKey.trim()) {
        const prov = String(provider || '').trim().toLowerCase() || 'openai';
        try { setKey(prov, apiKey.trim()); setActive(prov, prov === 'openai' ? (model || 'gpt-4o') : (model || 'gemini-1.5-pro-latest')); } catch { /* noop */ }
        try {
          const mongoDb = await db();
          const userId = req.user?._id || null;
          if (mongoDb && userId) {
            const keyObj = prov === 'openai' ? { openai: apiKey.trim() } : { gemini: apiKey.trim() };
            await mongoDb.collection('ai_user_config').updateOne(
              { userId },
              { $set: { userId, keys: keyObj, activeProvider: prov, activeModel: (prov === 'openai' ? (model || 'gpt-4o') : (model || 'gemini-1.5-pro-latest')), updatedAt: new Date() } },
              { upsert: true }
            );
          }
        } catch { /* noop */ }
      }
      const userId = req.user?._id ? String(req.user._id) : (req.session?.token ? `guest:${req.session.token}` : `guest:${Date.now()}`);
      const sessionId = typeof providedSessionId === 'string' && providedSessionId.trim() ? providedSessionId.trim() : `sess_${Date.now()}`;
      const result = await joeAdvanced.processMessage(userId, instruction, sessionId, { model: model || null, lang: lang || 'ar' });
      const response = result?.response || '';
      const toolsUsed = Array.isArray(result?.toolsUsed) ? result.toolsUsed : [];
      return res.json({ success: true, response, toolsUsed, sessionId });
    } catch (err) {
      console.error('❌ /api/joe/execute error', err);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  };
  router.post('/execute', handleExecute);
  router.get('/execute', handleExecute);

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

  router.get('/stats', requireRole('ADMIN'), async (req, res) => {
    try {
      const snapshot = toolManager.getStatsSnapshot();
      return res.json({ success: true, ...snapshot });
    } catch (err) {
      console.error('❌ /api/joe/stats error', err);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  });

  router.get('/monitor', requireRole('ADMIN'), (req, res) => {
    try {
      const s = toolManager.getStatsSnapshot();
      const rows = (s.ranking || []).slice(0, 25).map(r => `<tr><td>${r.name}</td><td>${r.success}</td><td>${r.failure}</td><td>${r.avgMs}</td><td>${r.lastMs}</td><td>${r.score}</td></tr>`).join('');
      const open = (s.openCircuits || []).map(n => `<li>${n}</li>`).join('') || '<li>None</li>';
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>JOE Monitor</title><style>body{font-family:sans-serif;padding:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>JOE Monitor</h1><p>Tools: ${s.toolsCount} | Schemas: ${s.schemasCount} | Cache: ${s.cacheSize}</p><h2>Open Circuits</h2><ul>${open}</ul><h2>Top Tools</h2><table><thead><tr><th>Name</th><th>Success</th><th>Failure</th><th>Avg ms</th><th>Last ms</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (err) {
      console.error('❌ /api/joe/monitor error', err);
      return res.status(500).send('SERVER_ERROR');
    }
  });

  router.post('/tools/cache/purge', requireRole('ADMIN'), (req, res) => {
    try { toolManager.purgeCache(); return res.json({ success: true }); } catch (err) {
      console.error('❌ /api/joe/tools/cache/purge error', err);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  });

  router.post('/tools/circuits/reset', requireRole('ADMIN'), (req, res) => {
    try { toolManager.resetCircuits(); return res.json({ success: true }); } catch (err) {
      console.error('❌ /api/joe/tools/circuits/reset error', err);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  });

  return router;
}

export default joeRouterFactory;

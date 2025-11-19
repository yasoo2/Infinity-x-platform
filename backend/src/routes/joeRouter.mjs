import express from 'express';
import { ObjectId } from 'mongodb';

export function joeRouter(initMongo, redis) {
  const router = express.Router();

  router.post('/command', async (req, res) => {
    try {
      const db = await initMongo();
      const { sessionToken, lang, voice, commandText } = req.body;

      if (!sessionToken || !commandText) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }

      const now = new Date();
      const ins = await db.collection('joe_commands').insertOne({
        createdAt: now,
        sessionToken,
        lang: lang || 'en',
        voice: !!voice,
        commandText,
        status: 'QUEUED'
      });

      await db.collection('joe_activity').insertOne({
        ts: now,
        action: 'RECEIVED_COMMAND',
        detail: commandText
      });

      return res.json({
        ok: true,
        requestId: ins.insertedId.toString(),
        msg: 'COMMAND_ACCEPTED_AND_QUEUED'
      });
    } catch (err) {
      console.error('/api/joe/command err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  router.get('/activity-stream', async (req, res) => {
    try {
      const db = await initMongo();
      const last = await db.collection('joe_activity')
        .find({})
        .sort({ ts: -1 })
        .limit(30)
        .toArray();

      return res.json({
        ok: true,
        events: last.map(e => ({
          ts: e.ts,
          action: e.action,
          detail: e.detail
        }))
      });
    } catch (err) {
      console.error('/api/joe/activity-stream err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  router.get('/suggestions', async (req, res) => {
    try {
      const db = await initMongo();
      const plans = await db.collection('joe_plans')
        .find({ status: 'PENDING' })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();

      return res.json({
        ok: true,
        suggestions: plans.map(p => ({
          id: p._id.toString(),
          createdAt: p.createdAt,
          type: p.type,
          text: p.text,
          approved: !!p.approved
        }))
      });
    } catch (err) {
      console.error('/api/joe/suggestions err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  router.post('/suggestions/decision', async (req, res) => {
    try {
      const db = await initMongo();
      const { planId, decision } = req.body;
      if (!planId || !decision) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }

      await db.collection('joe_plans').updateOne(
        { _id: new ObjectId(planId) },
        {
          $set: {
            approved: decision === 'APPROVE',
            status: decision === 'APPROVE' ? 'APPROVED' : 'DENIED',
            decidedAt: new Date()
          }
        }
      );

      await db.collection('joe_activity').insertOne({
        ts: new Date(),
        action: 'SUGGESTION_DECISION',
        detail: `plan ${planId} -> ${decision}`
      });

      return res.json({ ok: true });
    } catch (err) {
      console.error('/api/joe/suggestions/decision err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  router.post('/need-secret', async (req, res) => {
    try {
      const db = await initMongo();
      const { sessionToken, needType, description } = req.body;
      if (!sessionToken || !needType || !description) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }

      const now = new Date();
      await db.collection('joe_needs').insertOne({
        ts: now,
        sessionToken,
        needType,
        description,
        resolved: false
      });

      await db.collection('joe_activity').insertOne({
        ts: now,
        action: 'REQUEST_SECRET',
        detail: `${needType}: ${description}`
      });

      return res.json({ ok: true, msg: 'NEED_RECORDED' });
    } catch (err) {
      console.error('/api/joe/need-secret err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  return router;
}

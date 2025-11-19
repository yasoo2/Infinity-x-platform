import express from 'express';

export function factoryRouter(initMongo, redis) {
  const router = express.Router();

  // GET /api/factory/jobs - Get all factory jobs
  router.get('/jobs', async (req, res) => {
    try {
      const db = await initMongo();
      const jobs = await db.collection('factory_jobs')
        .find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      return res.json({ ok: true, jobs });
    } catch (err) {
      console.error('/api/factory/jobs err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  router.post('/build-new', async (req, res) => {
    try {
      const db = await initMongo();
      const { sessionToken, projectType, shortDescription } = req.body;

      if (!sessionToken || !projectType) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }

      const now = new Date();

      const ins = await db.collection('factory_jobs').insertOne({
        createdAt: now,
        sessionToken,
        projectType,
        shortDescription: shortDescription || "",
        status: 'QUEUED'
      });

      await db.collection('joe_activity').insertOne({
        ts: now,
        action: 'FACTORY_BUILD_NEW',
        detail: `type=${projectType} desc=${shortDescription || ""}`
      });

      return res.json({
        ok: true,
        jobId: ins.insertedId.toString(),
        msg: 'FACTORY_JOB_QUEUED'
      });
    } catch (err) {
      console.error('/api/factory/build-new err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  router.post('/link-external', async (req, res) => {
    try {
      const db = await initMongo();
      const { sessionToken, externalUrl, credentials } = req.body;

      if (!sessionToken || !externalUrl) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }

      const now = new Date();
      const ins = await db.collection('factory_links').insertOne({
        createdAt: now,
        sessionToken,
        externalUrl,
        credentials: credentials || null,
        status: 'LINKED_PENDING_ANALYSIS'
      });

      await db.collection('joe_activity').insertOne({
        ts: now,
        action: 'FACTORY_LINK_EXTERNAL',
        detail: `url=${externalUrl}`
      });

      return res.json({
        ok: true,
        linkId: ins.insertedId.toString(),
        msg: 'EXTERNAL_LINK_RECORDED'
      });
    } catch (err) {
      console.error('/api/factory/link-external err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  router.post('/snapshot', async (req, res) => {
    try {
      const db = await initMongo();
      const { externalUrl, dumpData } = req.body;
      if (!externalUrl || !dumpData) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }

      await db.collection('factory_snapshots').insertOne({
        ts: new Date(),
        externalUrl,
        dumpData
      });

      return res.json({ ok: true });
    } catch (err) {
      console.error('/api/factory/snapshot err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  return router;
}

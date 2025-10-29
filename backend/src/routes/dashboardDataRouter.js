import express from 'express';

export function dashboardDataRouter(initMongo, redis) {
  const router = express.Router();

  router.get('/metrics', async (req, res) => {
    try {
      const db = await initMongo();

      const totalUsers = await db.collection('users').countDocuments({});
      const totalSessionsNow = await 
db.collection('sessions').countDocuments({ active: true });

      const recentActivity = await db.collection('joe_activity')
        .find({})
        .sort({ ts: -1 })
        .limit(10)
        .toArray();

      return res.json({
        ok: true,
        system: {
          usersTotal: totalUsers,
          activeSessions: totalSessionsNow,
          redisOnline: !!redis,
          mongoOnline: true
        },
        joeRecent: recentActivity.map(e => ({
          ts: e.ts,
          action: e.action,
          detail: e.detail
        }))
      });
    } catch (err) {
      console.error('/api/dashboard/status err', err);
      res.status(500).json({ error: 'SERVER_ERR' });
    }
  });

  return router;
}

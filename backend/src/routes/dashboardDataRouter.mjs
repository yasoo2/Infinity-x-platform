/**
 * dashboardDataRouter.mjs - لوحة تحكم جو
 * يعرض: عدد المستخدمين، الجلسات النشطة، آخر نشاط
 */

import express from 'express';

export function dashboardDataRouter(initMongo, redis) {
  const router = express.Router();

  router.get('/metrics', async (req, res) => {
    try {
      const db = await initMongo();

      // عدد المستخدمين
      const totalUsers = await db.collection('users').countDocuments({});

      // عدد الجلسات النشطة
      const totalSessionsNow = await db.collection('sessions')
        .countDocuments({ active: true });

      // آخر 10 أنشطة لجو
      const recentActivity = await db.collection('joe_activity')
        .find({})
        .sort({ ts: -1 })
        .limit(10)
        .toArray();

      // حالة Redis
      let redisStatus = false;
      if (redis) {
        try {
          await redis.ping();
          redisStatus = true;
        } catch (e) {
          redisStatus = false;
        }
      }

      return res.json({
        ok: true,
        system: {
          usersTotal: totalUsers,
          activeSessions: totalSessionsNow,
          redisOnline: redisStatus,
          mongoOnline: true
        },
        joeRecent: recentActivity.map(e => ({
          ts: new Date(e.ts).toLocaleString('ar-EG'),
          action: e.action,
          detail: e.detail
        }))
      });

    } catch (err) {
      console.error('/api/dashboard/metrics error:', err);
      res.status(500).json({ ok: false, error: 'SERVER_ERR' });
    }
  });

  return router;
}
import express from 'express';

// RESTRUCTURED to use the factory pattern and dependency injection
const dashboardRouterFactory = ({ requireRole, db }) => {
    const router = express.Router();

    /**
     * @route GET /api/v1/dashboard/metrics
     * @description Provides key metrics for the admin dashboard.
     * @access ADMIN
     */
    router.get('/metrics', requireRole('ADMIN'), async (req, res) => {
        try {
            const mongoDb = await db();

            // Perform queries in parallel for efficiency
            const [totalUsers, activeSessions, recentActivity] = await Promise.all([
                mongoDb.collection('users').countDocuments({}),
                mongoDb.collection('sessions').countDocuments({ active: true, expiresAt: { $gt: new Date() } }),
                mongoDb.collection('joe_activity').find({}).sort({ ts: -1 }).limit(10).toArray()
            ]);

            // The redis check can be abstracted into a health check service later
            const metrics = {
                users: {
                    total: totalUsers
                },
                sessions: {
                    active: activeSessions
                },
                joe: {
                    recentActivity
                },
                status: {
                    database: 'online'
                }
            };

            res.json({ success: true, metrics });

        } catch (error) {
            console.error('❌ /api/dashboard/metrics error:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch dashboard metrics', details: error.message });
        }
    });

    return router;
};

export default dashboardRouterFactory;

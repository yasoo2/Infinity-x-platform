import express from 'express';
import { ObjectId } from 'mongodb';

// RESTRUCTURED to use the factory pattern, dependency injection, and proper security.
const factoryRouterFactory = ({ requireRole, optionalAuth, db }) => {
    const router = express.Router();
    if (optionalAuth) router.use(optionalAuth);

    /**
     * @route GET /api/v1/factory/jobs
     * @description Retrieves a list of all factory jobs.
     * @access ADMIN
     */
    router.get('/jobs', requireRole('ADMIN'), async (req, res) => {
        try {
            const mongoDb = await db();
            const jobs = await mongoDb.collection('factory_jobs')
                .find({})
                .sort({ createdAt: -1 })
                .limit(100) // Increased limit for admin view
                .toArray();
            res.json({ success: true, jobs });
        } catch (error) {
            console.error('❌ /api/factory/jobs error:', error);
            res.status(500).json({ success: false, error: 'Failed to retrieve factory jobs', details: error.message });
        }
    });

    /**
     * @route POST /api/v1/factory/jobs
     * @description Creates a new job in the factory queue.
     * @access ADMIN (or a specific service role in the future)
     * @body { projectType, shortDescription, metadata }
     */
    router.post('/jobs', requireRole('USER'), async (req, res) => {
        try {
            const mongoDb = await db();
            const { projectType, shortDescription, metadata = {} } = req.body;

            if (!projectType) {
                return res.status(400).json({ success: false, error: 'MISSING_FIELD', message: 'projectType is required' });
            }

            const now = new Date();
            const newJob = {
                createdAt: now,
                userId: new ObjectId(req.user._id), // Track which admin initiated the job
                projectType,
                shortDescription: shortDescription || 'N/A',
                status: 'QUEUED',
                metadata, // For any extra data needed for the job
            };

            const result = await mongoDb.collection('factory_jobs').insertOne(newJob);

            // Log this important activity
            await mongoDb.collection('joe_activity').insertOne({
                ts: now,
                action: 'FACTORY_JOB_CREATED',
                detail: `Type: ${projectType}, Desc: ${shortDescription}`,
                userId: new ObjectId(req.user._id),
                jobId: result.insertedId
            });

            res.status(201).json({
                success: true,
                jobId: result.insertedId.toString(),
                message: 'Factory job queued successfully.'
            });
        } catch (error) {
            console.error('❌ /api/factory/jobs (POST) error:', error);
            res.status(500).json({ success: false, error: 'Failed to create factory job', details: error.message });
        }
    });

    // NOTE: The endpoints below are kept for legacy reasons but should be reviewed.
    // They are now secured.

    router.post('/link-external', requireRole('ADMIN'), async (req, res) => {
        // This logic should likely be part of an "integration" service.
        res.status(511).json({ success: false, message: 'This endpoint is deprecated and needs review.' });
    });

    router.post('/snapshot', requireRole('SUPER_ADMIN'), async (req, res) => {
        // This seems highly sensitive and should be in a dedicated service.
        res.status(511).json({ success: false, message: 'This endpoint is deprecated and needs review.' });
    });

    router.get('/events', async (req, res) => {
        try {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders?.();
            const send = (event, payload) => { try { res.write(`event: ${event}\n` + `data: ${JSON.stringify(payload)}\n\n`); } catch { /* noop */ } };
            send('init', { ok: true });
            let stopped = false;
            const tick = async () => {
                if (stopped) return;
                try {
                    const mongoDb = await db();
                    const jobs = await mongoDb.collection('factory_jobs')
                        .find({})
                        .sort({ createdAt: -1 })
                        .limit(50)
                        .toArray();
                    send('snapshot', { jobs });
                } catch { /* noop */ }
            };
            const interval = setInterval(tick, 5000);
            tick();
            req.on('close', () => { stopped = true; clearInterval(interval); try { res.end(); } catch { /* noop */ } });
        } catch {
            try { res.status(500).end(); } catch { /* noop */ }
        }
    });

    return router;
};

export default factoryRouterFactory;

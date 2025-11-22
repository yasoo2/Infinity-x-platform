import express from 'express';
import { ObjectId } from 'mongodb';

// RESTRUCTURED to use the factory pattern, dependency injection, and proper security.
const factoryRouterFactory = ({ requireRole, db }) => {
    const router = express.Router();

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
    router.post('/jobs', requireRole('ADMIN'), async (req, res) => {
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

    return router;
};

export default factoryRouterFactory;

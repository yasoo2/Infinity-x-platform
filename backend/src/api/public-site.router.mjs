import express from 'express';

// This router serves data for the public-facing website and handles SEO tasks.

const publicSiteRouterFactory = ({ db, requireRole }) => {
    const router = express.Router();

    /**
     * @route GET /api/v1/public-site/services
     * @description Provides a list of services offered.
     * @access PUBLIC
     */
    router.get('/services', (req, res) => {
        // This data is static and public, so it's safe to serve directly.
        res.json({
            success: true,
            services: [
                { id: "talent", title: "Talent Acquisition & Headhunting", desc: "..." },
                { id: "remote", title: "Remote Workforce Solutions", desc: "..." },
                { id: "consult", title: "Business & Technology Consulting", desc: "..." },
                { id: "ai_auto", title: "AI Automation & Digital Transformation", desc: "..." },
                { id: "ecom", title: "E-Commerce Store Setup & Management", desc: "..." },
                { id: "web_lp", title: "Website & Landing Page Development", desc: "..." },
                { id: "saas", title: "Digital Products & SaaS Development", desc: "..." },
                { id: "training", title: "Training & Upskilling Programs", desc: "..." }
            ]
        });
    });

    /**
     * @route POST /api/v1/public-site/seo-boost
     * @description Creates a task for an admin (or AI agent) to improve SEO for a page.
     * @access ADMIN
     * @body { targetPage: string, keywords: Array<string> }
     */
    router.post('/seo-boost', requireRole('ADMIN'), async (req, res) => {
        try {
            const { targetPage, keywords } = req.body;
            if (!targetPage) {
                return res.status(400).json({ success: false, error: 'targetPage is a required field.' });
            }

            const mongoDb = await db();
            const task = {
                createdAt: new Date(),
                createdBy: req.user._id, // Associated with the authenticated admin user
                page: targetPage,
                keywords: keywords || [],
                status: 'QUEUED'
            };

            const result = await mongoDb.collection('seo_tasks').insertOne(task);

            await mongoDb.collection('joe_activity').insertOne({
                ts: new Date(),
                action: 'SEO_TASK_CREATED',
                detail: `Page: ${targetPage}`,
                userId: req.user._id
            });

            res.status(201).json({
                success: true,
                message: 'SEO task has been successfully queued.',
                taskId: result.insertedId
            });

        } catch (error) {
            console.error('❌ SEO Boost Error:', error);
            res.status(500).json({ success: false, error: 'Failed to create SEO task.', details: error.message });
        }
    });

    return router;
};

export default publicSiteRouterFactory;

import express from 'express';

// This router manages connections to external e-commerce stores (Shopify, etc.)
// and provides AI-powered analysis and content generation for them.

const storeIntegrationRouterFactory = ({ db, requireRole, storeIntegrationService }) => {
    const router = express.Router();
    void db;

    const isServiceAvailable = (req, res, next) => {
        if (!storeIntegrationService) {
            return res.status(503).json({ success: false, error: 'SERVICE_UNAVAILABLE', message: 'Store integration service is not configured.' });
        }
        next();
    };

    router.use(isServiceAvailable);
    router.use(requireRole('USER'));

    // === Store Connection Management ===

    /**
     * @route POST /api/v1/store-integration/connections
     * @description Connects a new external store.
     * @access USER
     * @body { storeType: 'shopify' | 'woocommerce', storeUrl: string, apiToken: string }
     */
    router.post('/connections', async (req, res) => {
        try {
            const { storeType, storeUrl, apiToken } = req.body;
            if (!storeType || !storeUrl || !apiToken) {
                return res.status(400).json({ success: false, error: 'storeType, storeUrl, and apiToken are required.' });
            }

            // The service handles validation and secure storage of credentials
            const result = await storeIntegrationService.connectStore({
                userId: req.user._id,
                storeType,
                storeUrl,
                apiToken // The service must encrypt this before storing
            });

            res.status(201).json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to connect store', details: error.message });
        }
    });

    /**
     * @route GET /api/v1/store-integration/connections
     * @description Lists all connected stores for the user.
     * @access USER
     */
    router.get('/connections', async (req, res) => {
        try {
            const connections = await storeIntegrationService.listConnections(req.user._id);
            res.json({ success: true, connections });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to list connections', details: error.message });
        }
    });

    // === AI-Powered Features ===

    /**
     * @route POST /api/v1/store-integration/analyze
     * @description Runs an AI analysis on a connected store.
     * @access USER
     * @body { connectionId: string, goals: string[] }
     */
    router.post('/analyze', async (req, res) => {
        try {
            const { connectionId, goals } = req.body;
            if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required.' });

            const analysis = await storeIntegrationService.analyzeStore({ 
                userId: req.user._id, 
                connectionId, 
                goals 
            });
            res.json({ success: true, analysis });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to analyze store', details: error.message });
        }
    });

    /**
     * @route POST /api/v1/store-integration/generate-descriptions
     * @description Generates new product descriptions for a connected store.
     * @access USER
     * @body { connectionId: string, productIds: string[] }
     */
    router.post('/generate-descriptions', async (req, res) => {
        try {
            const { connectionId, productIds } = req.body;
            if (!connectionId) return res.status(400).json({ success: false, error: 'connectionId is required.' });

            const job = await storeIntegrationService.generateProductDescriptions({ 
                userId: req.user._id, 
                connectionId, 
                productIds 
            });
            res.json({ success: true, message: 'Description generation job started.', job });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to start description generation', details: error.message });
        }
    });

    return router;
};

export default storeIntegrationRouterFactory;

import express from 'express';

// This router is for internal testing of the Grok AI engine.
// It should only be accessible to administrators.

const testGrokRouterFactory = ({ requireRole, grokEngine }) => {
    const router = express.Router();

    const isServiceAvailable = (req, res, next) => {
        if (!grokEngine) {
            return res.status(503).json({ success: false, error: 'SERVICE_UNAVAILABLE', message: 'Grok engine is not configured on the server.' });
        }
        next();
    };

    router.use(isServiceAvailable);
    router.use(requireRole('ADMIN')); // Restrict all Grok tests to Admins.

    /**
     * @route GET /api/v1/test-grok/status
     * @description Tests the connection to the Grok API and returns its status.
     * @access ADMIN
     */
    router.get('/status', async (req, res) => {
        try {
            const result = await grokEngine.testConnection();
            res.json({ success: result.success, ...result });
        } catch (error) {
            res.status(500).json({ success: false, error: 'GROK_CONNECTION_TEST_FAILED', message: error.message });
        }
    });

    /**
     * @route POST /api/v1/test-grok/chat
     * @description Sends a simple chat message to Grok and gets a response.
     * @access ADMIN
     * @body { message: string }
     */
    router.post('/chat', async (req, res) => {
        try {
            const { message } = req.body;
            if (!message) {
                return res.status(400).json({ success: false, error: 'Message is required.' });
            }

            const response = await grokEngine.generateResponse(message);
            res.json({ success: true, requestMessage: message, response });
        } catch (error) {
            res.status(500).json({ success: false, error: 'GROK_CHAT_FAILED', message: error.message });
        }
    });

    return router;
};

export default testGrokRouterFactory;

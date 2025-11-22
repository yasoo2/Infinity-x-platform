import express from 'express';

// This is the most sensitive router. Access must be strictly controlled.

const sandboxRouterFactory = ({ requireRole, sandboxService }) => {
    const router = express.Router();

    const isServiceAvailable = (req, res, next) => {
        if (!sandboxService) {
            return res.status(503).json({ success: false, error: 'SERVICE_UNAVAILABLE', message: 'Sandbox service is not configured.' });
        }
        next();
    };

    router.use(isServiceAvailable);

    /**
     * @route POST /api/v1/sandbox/execute
     * @description Executes code or a shell command in a secure sandbox.
     * @access SUPER_ADMIN
     * @body { language: 'python'|'node'|'shell', code?: string, command?: string, sessionId?: string }
     */
    router.post('/execute', requireRole('SUPER_ADMIN'), async (req, res) => {
        try {
            const { language, code, command, sessionId } = req.body;

            let result;
            switch (language) {
                case 'shell':
                    if (!command) return res.status(400).json({ success: false, error: 'Command is required for shell execution.' });
                    result = await sandboxService.executeShell(command, { sessionId });
                    break;
                case 'python':
                    if (!code) return res.status(400).json({ success: false, error: 'Code is required for python execution.' });
                    result = await sandboxService.executePython(code, { sessionId });
                    break;
                case 'node':
                    if (!code) return res.status(400).json({ success: false, error: 'Code is required for node execution.' });
                    result = await sandboxService.executeNode(code, { sessionId });
                    break;
                default:
                    return res.status(400).json({ success: false, error: 'Invalid language specified. Must be shell, python, or node.' });
            }
            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, error: 'SANDBOX_EXECUTION_FAILED', message: error.message });
        }
    });

    /**
     * @route POST /api/v1/sandbox/files
     * @description Write a file to the sandbox.
     * @access SUPER_ADMIN
     */
    router.post('/files', requireRole('SUPER_ADMIN'), async (req, res) => {
        try {
            const { sessionId, filePath, content } = req.body;
            if (!sessionId || !filePath || content === undefined) return res.status(400).json({ success: false, error: 'sessionId, filePath, and content are required.' });
            const result = await sandboxService.writeFile(sessionId, filePath, content);
            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, error: 'FILE_WRITE_FAILED', message: error.message });
        }
    });

    /**
     * @route GET /api/v1/sandbox/files
     * @description Read a file from the sandbox.
     * @access ADMIN
     */
    router.get('/files', requireRole('ADMIN'), async (req, res) => {
        try {
            const { sessionId, filePath } = req.query;
            if (!sessionId || !filePath) return res.status(400).json({ success: false, error: 'sessionId and filePath are required.' });
            const result = await sandboxService.readFile(sessionId, filePath);
            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, error: 'FILE_READ_FAILED', message: error.message });
        }
    });

    /**
     * @route GET /api/v1/sandbox/stats
     * @description Get sandbox statistics.
     * @access ADMIN
     */
    router.get('/stats', requireRole('ADMIN'), async (req, res) => {
        try {
            const stats = await sandboxService.getStats();
            res.json({ success: true, stats });
        } catch (error) {
            res.status(500).json({ success: false, error: 'STATS_FAILED', message: error.message });
        }
    });

    return router;
};

export default sandboxRouterFactory;


import express from 'express';

// This factory function receives all necessary, instantiated services.
const chatHistoryRouterFactory = ({ requireRole, memoryManager }) => {
    const router = express.Router();

    // Middleware to check if the memory service is available
    const isServiceAvailable = (req, res, next) => {
        if (!memoryManager) {
            return res.status(503).json({ 
                success: false, 
                error: 'SERVICE_UNAVAILABLE', 
                message: 'Memory service is not configured on the server.' 
            });
        }
        next();
    };

    router.use(isServiceAvailable);
    router.use(requireRole('USER')); // All routes here require an authenticated user.

    /**
     * @route GET /api/v1/chat-history/sessions
     * @description List all chat sessions for the logged-in user.
     * @access USER
     */
    router.get('/sessions', async (req, res) => {
        try {
            const sessions = await memoryManager.listSessions(req.user._id);
            res.json({ success: true, sessions });
        } catch (error) {
            console.error('Error listing chat sessions:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route GET /api/v1/chat-history/sessions/:sessionId
     * @description Get a single chat session with all its interactions.
     * @access USER
     */
    router.get('/sessions/:sessionId', async (req, res) => {
        try {
            const { sessionId } = req.params;
            const session = await memoryManager.getSession(sessionId, req.user._id);
            
            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found or access denied.' });
            }
            res.json({ success: true, session });
        } catch (error) {
            console.error(`Error getting session ${req.params.sessionId}:`, error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route DELETE /api/v1/chat-history/sessions/:sessionId
     * @description Deletes a chat session and all its interactions.
     * @access USER
     */
    router.delete('/sessions/:sessionId', async (req, res) => {
        try {
            const { sessionId } = req.params;
            const result = await memoryManager.deleteSession(sessionId, req.user._id);

            if (!result.success) {
                return res.status(404).json(result); // e.g., session not found
            }
            res.json({ success: true, message: 'Session deleted successfully.' });
        } catch (error) {
            console.error(`Error deleting session ${req.params.sessionId}:`, error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

export default chatHistoryRouterFactory;

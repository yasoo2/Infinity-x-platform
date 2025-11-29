
import express from 'express';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'a-very-weak-secret-for-dev';

// This factory function receives all necessary, instantiated services.
const chatHistoryRouterFactory = ({ memoryManager, optionalAuth }) => {
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
    if (optionalAuth) router.use(optionalAuth);

    const allowUserOrGuest = (req, res, next) => {
        if (req.user) return next();
        try {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
            const decoded = jwt.verify(token, JWT_SECRET);
            if (decoded?.userId || decoded?.role === 'guest') {
                req.guest = { id: decoded.userId, role: decoded.role };
                return next();
            }
            return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
        } catch {
            return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
        }
    };

    const getUserId = (req) => {
        if (req.user?._id) return req.user._id;
        if (req.guest?.id) return req.guest.id;
        return null;
    };

    router.use(allowUserOrGuest);

    /**
     * @route GET /api/v1/chat-history/sessions
     * @description List all chat sessions for the logged-in user.
     * @access USER
     */
    router.get('/sessions', async (req, res) => {
        try {
            const userId = getUserId(req);
            if (!userId) return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
            const sessions = await memoryManager.listSessions(userId);
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
            const userId = getUserId(req);
            if (!userId) return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
            const session = await memoryManager.getSession(sessionId, userId);
            
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
            const userId = getUserId(req);
            if (!userId) return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
            const result = await memoryManager.deleteSession(sessionId, userId);

            if (!result.success) {
                return res.status(404).json(result); // e.g., session not found
            }
            res.json({ success: true, message: 'Session deleted successfully.' });
        } catch (error) {
            console.error(`Error deleting session ${req.params.sessionId}:`, error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/user-context', async (req, res) => {
        try {
            const limit = Number(req.query.limit) || 100;
            const userId = getUserId(req);
            if (!userId) return res.status(403).json({ success: false, error: 'ACCESS_DENIED' });
            const context = await memoryManager.getUserContext(userId, { limit });
            res.json({ success: true, context });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

export default chatHistoryRouterFactory;

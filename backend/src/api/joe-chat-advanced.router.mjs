import express from 'express';

// REFACTORED & CORRECTED: Import from the unified AI service layer
import { processMessage } from '../services/ai/joe-advanced.service.mjs';

const joeChatAdvancedRouterFactory = ({ requireRole }) => {
    const router = express.Router();

    /**
     * @route POST /api/v1/joe-chat-advanced
     * @description Processes a user message using the advanced Joe engine with tool-calling capabilities.
     * @access USER
     * @body { message: string, sessionId: string }
     */
    router.post('/', requireRole('USER', true), async (req, res) => {
        try {
            const { message, sessionId } = req.body;
            const userId = req.user._id.toString();

            if (!message) {
                return res.status(400).json({ success: false, error: 'Message is required' });
            }
            
            if (!sessionId) {
                return res.status(400).json({ success: false, error: 'Session ID is required' });
            }

            console.log(`🤖 Advanced Joe processing message for user: ${userId} in session: ${sessionId}`);

            // Call the corrected service and function name
            const result = await processMessage(userId, message, sessionId);

            res.json(result);

        } catch (error) {
            console.error('❌ Advanced Joe Router Error:', error);
            res.status(500).json({
                success: false,
                error: 'ROUTER_LEVEL_ERROR',
                message: 'An unexpected error occurred in the chat router.',
                details: error.message
            });
        }
    });

    return router;
};

export default joeChatAdvancedRouterFactory;

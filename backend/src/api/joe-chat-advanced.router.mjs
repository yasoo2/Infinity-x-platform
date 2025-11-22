import express from 'express';

// REFACTORED: Import from the new service layer
import { processAdvancedQuery } from '../services/joe/joe-advanced.service.mjs';

const joeChatAdvancedRouterFactory = ({ requireRole }) => {
    const router = express.Router();

    /**
     * @route POST /api/v1/joe/chat/advanced
     * @description Processes a user message using the advanced Joe engine with tool-calling capabilities.
     * @access USER
     * @body { message: string, context: Array<Object>, aiEngine?: string }
     */
    router.post('/', requireRole('USER'), async (req, res) => {
        try {
            const { message, context = [] } = req.body;
            const userId = req.user._id.toString();

            if (!message) {
                return res.status(400).json({ success: false, error: 'Message is required' });
            }

            console.log(`🤖 Advanced Joe processing message for user: ${userId}`);

            // Call the dedicated advanced processing service
            const result = await processAdvancedQuery({ userId, message, context });

            if (result.success) {
                res.json(result);
            } else {
                // If the service layer handled the error, it will provide a message
                res.status(500).json(result);
            }

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

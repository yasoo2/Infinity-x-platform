import express from 'express';

// Import from the new ImageMaster service that forces image generation
import { processMessage, init as initImageMaster } from '../services/ai/joe-imagemaster.service.mjs';
import { getDB } from '../../db.mjs';

const joeChatAdvancedRouterFactory = ({ requireRole }) => {
    const router = express.Router();

    /**
     * @route POST /api/v1/joe-chat-advanced
     * @description Processes a user message using the ImageMaster Joe engine with forced image generation
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

            console.log(`🎨 ImageMaster processing message for user: ${userId} in session: ${sessionId}`);
            console.log(`🎨 Message: ${message}`);

            // Initialize ImageMaster with dependencies
            const memoryManager = req.app.locals.memoryManager;
            if (!memoryManager) {
                console.error('❌ MemoryManager not found in app.locals');
                return res.status(500).json({ 
                    success: false, 
                    error: 'MEMORY_MANAGER_NOT_FOUND',
                    message: 'Memory manager not initialized' 
                });
            }

            // Initialize the ImageMaster service
            initImageMaster({ memoryManager });

            // Process message with forced image generation
            const context = {
                userId,
                sessionId,
                lang: req.body.lang || 'ar',
                provider: req.body.provider || 'openai',
                model: req.body.model || null
            };

            console.log('🎨 Calling ImageMaster processMessage...');
            const result = await processMessage(message, context);
            
            console.log('🎨 ImageMaster result:', result);

            res.json({
                success: true,
                response: result.response,
                toolsUsed: result.toolsUsed || []
            });

        } catch (error) {
            console.error('❌ ImageMaster Router Error:', error);
            res.status(500).json({
                success: false,
                error: 'IMAGEMASTER_ROUTER_ERROR',
                message: 'An unexpected error occurred in the ImageMaster router.',
                details: error.message
            });
        }
    });

    return router;
};

export default joeChatAdvancedRouterFactory;
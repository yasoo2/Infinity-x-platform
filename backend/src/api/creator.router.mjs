
import { Router } from 'express';
import AIEngineService from '../../services/ai/ai-engine.service.mjs'; // استيراد الخدمة المعزولة

/**
 * Factory function to create the Creator router.
 * @param {object} dependencies - Injected dependencies (db, memoryManager, etc.)
 * @returns {Router} - The configured Express router.
 */
export default function creatorRouterFactory(dependencies) {
    const router = Router();
    const aiEngineService = new AIEngineService(dependencies);

    console.log('🎨 Creator routes enabled. The AIEngineService is now integrated.');

    /**
     * @route POST /api/v1/creator/generate-website
     * @description Endpoint to generate a full website based on a prompt.
     * @access private (requires 'creator' role)
     */
    router.post('/generate-website', dependencies.requireRole('creator'), async (req, res, next) => {
        try {
            const { prompt, targetAudience, style } = req.body;

            if (!prompt) {
                return res.status(400).json({ error: 'PROMPT_REQUIRED', message: 'A detailed prompt is required to generate a website.' });
            }

            console.log(`[CreatorRouter] Received website generation request with prompt: "${prompt.substring(0, 50)}..."`);

            const result = await aiEngineService.generateWebsite({ 
                prompt,
                targetAudience,
                style,
            });

            res.status(200).json({ 
                success: true, 
                message: 'Website generation process initiated.',
                jobId: result.jobId // The ID for the background worker job
            });

        } catch (error) {
            console.error('❌ Error in /generate-website endpoint:', error);
            next(error); // Pass to global error handler
        }
    });

    return router;
}

import express from 'express';

// REFACTORED: Import the evolution services from the correct layer
import { analyzeCodebase, suggestImprovements } from '../services/evolution/capability-evolution.service.mjs';
import { applyImprovement } from '../services/evolution/runtime-evolution.service.mjs';

// This router is now a factory, receiving dependencies from the core app.
const evolutionRouterFactory = ({ requireRole }) => {
    const router = express.Router();

    /**
     * @route POST /api/v1/evolution/initiate
     * @description Starts the evolution cycle by analyzing the codebase and returning AI-generated suggestions.
     * @access SUPER_ADMIN
     * @body { githubToken, owner, repo }
     */
    router.post('/initiate', requireRole('SUPER_ADMIN'), async (req, res) => {
        try {
            const { githubToken, owner, repo } = req.body;

            if (!githubToken || !owner || !repo) {
                return res.status(400).json({ success: false, error: 'GitHub credentials (token, owner, repo) are required.' });
            }

            // Step 1: Analyze the codebase using the dedicated service
            console.log(`🧬 Initiating evolution cycle for ${owner}/${repo}...`);
            const analysis = await analyzeCodebase({ githubToken, owner, repo });
            if (!analysis.success) {
                return res.status(500).json({ success: false, error: analysis.error });
            }
            console.log('✅ Codebase analysis complete.');

            // Step 2: Get improvement suggestions from the AI service
            const suggestions = await suggestImprovements({ codebase: analysis.data });
            if (!suggestions.success) {
                return res.status(500).json({ success: false, error: suggestions.error });
            }
            console.log('✅ Improvement suggestions generated.');

            res.json({
                success: true,
                message: 'Evolution cycle initiated. Review suggestions and apply them.',
                analysis: analysis.data,
                suggestions: suggestions.data
            });

        } catch (error) {
            console.error('❌ Evolution cycle initiation failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/v1/evolution/apply
     * @description Applies a specific suggested improvement to the codebase.
     * @access SUPER_ADMIN
     * @body { githubToken, owner, repo, improvement, filePath }
     */
    router.post('/apply', requireRole('SUPER_ADMIN'), async (req, res) => {
        try {
            const { githubToken, owner, repo, improvement, filePath } = req.body;

            if (!githubToken || !owner || !repo || !improvement || !filePath) {
                return res.status(400).json({ success: false, error: 'GitHub credentials, improvement details, and filePath are required.' });
            }

            console.log(`⚙️ Applying improvement: "${improvement.title}" to ${filePath}...`);
            
            // Apply the improvement using the runtime evolution service
            const result = await applyImprovement({ githubToken, owner, repo, improvement, filePath });

            if (!result.success) {
                return res.status(500).json(result);
            }

            console.log(`✅ Improvement applied successfully. Commit: ${result.data.commit.sha}`);
            res.json(result);

        } catch (error) {
            console.error('❌ Failed to apply improvement:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

export default evolutionRouterFactory;

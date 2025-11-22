
import express from 'express';

// Import the main orchestrator service
import { runtimeEvolutionService } from '../services/evolution/runtime-evolution.service.mjs';

// This router is now a factory, receiving dependencies from the core app.
const evolutionRouterFactory = ({ requireRole }) => {
    const router = express.Router();

    /**
     * @route POST /api/v1/evolution/initiate
     * @description Starts the evolution cycle by analyzing the codebase and identifying improvements.
     * @access SUPER_ADMIN
     */
    router.post('/initiate', requireRole('SUPER_ADMIN'), async (req, res) => {
        try {
            console.log('🧬 Initiating evolution cycle via API...');
            // The new service orchestrates the analysis and suggestion process internally
            const result = await runtimeEvolutionService.identifyImprovements();

            if (!result.success) {
                return res.status(500).json(result);
            }
            
            console.log('✅ Improvement suggestions generated.');
            res.json({
                success: true,
                message: 'Analysis complete. Review suggestions and apply them.',
                ...result
            });

        } catch (error) {
            console.error('❌ Evolution cycle initiation failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/v1/evolution/apply
     * @description Applies a specific suggested improvement to the codebase (simulation).
     * @access SUPER_ADMIN
     * @body { object } improvement - The improvement object from the /initiate call.
     */
    router.post('/apply', requireRole('SUPER_ADMIN'), async (req, res) => {
        try {
            const { improvement } = req.body;

            if (!improvement) {
                return res.status(400).json({ success: false, error: 'An "improvement" object is required in the request body.' });
            }

            console.log(`⚙️ Applying improvement: "${improvement.issue || 'N/A'}"...`);
            
            // Apply the improvement using the runtime evolution service
            const result = await runtimeEvolutionService.implementImprovement(improvement);

            if (!result.success) {
                return res.status(500).json(result);
            }

            console.log(`✅ Improvement applied successfully (simulation).`);
            res.json(result);

        } catch (error) {
            console.error('❌ Failed to apply improvement:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route POST /api/v1/evolution/evolve
     * @description Runs a full, single evolution cycle: identify, implement, and deploy (simulation).
     * @access SUPER_ADMIN
     */
    router.post('/evolve', requireRole('SUPER_ADMIN'), async (req, res) => {
        try {
            console.log('🚀 Kicking off a full evolution cycle via API...');
            
            // The evolve method handles the entire process
            const result = await runtimeEvolutionService.evolve();

            if (!result.success) {
                return res.status(500).json(result);
            }

            console.log('✅ Full evolution cycle completed (simulation).');
            res.json(result);

        } catch (error) {
            console.error('❌ Full evolution cycle failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

export default evolutionRouterFactory;

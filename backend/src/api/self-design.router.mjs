import express from 'express';

// This router allows the AI to design and modify its own components.
// Access should be restricted to administrators.

const selfDesignRouterFactory = ({ requireRole, selfDesignService }) => {
    const router = express.Router();

    const isServiceAvailable = (req, res, next) => {
        if (!selfDesignService) {
            return res.status(503).json({ success: false, error: 'SERVICE_UNAVAILABLE', message: 'Self-design service is not configured.' });
        }
        next();
    };

    router.use(isServiceAvailable);
    router.use(requireRole('ADMIN')); // All routes here are powerful and require ADMIN privileges.

    /**
     * @route POST /api/v1/self-design/component
     * @description Designs or evolves a UI component using AI.
     * @access ADMIN
     * @body { componentPath: string, evolutionGoal: string, currentCode?: string }
     */
    router.post('/component', async (req, res) => {
        try {
            const { componentPath, evolutionGoal, currentCode } = req.body;

            if (!componentPath || !evolutionGoal) {
                return res.status(400).json({ success: false, error: 'componentPath and evolutionGoal are required.' });
            }

            // Delegate the entire logic to the service
            const result = await selfDesignService.evolveComponent({
                componentPath,
                evolutionGoal,
                currentCode, // The service can fetch this if it's null
            });

            if (result.success) {
                // The service should handle writing the file, this route just confirms it.
                res.json({ success: true, message: `Component ${componentPath} evolved successfully.`, ...result });
            } else {
                res.status(500).json({ success: false, error: 'COMPONENT_EVOLUTION_FAILED', message: result.error });
            }

        } catch (error) {
            console.error('❌ Self-Design /component Error:', error);
            res.status(500).json({ success: false, error: 'ROUTER_LEVEL_ERROR', message: error.message });
        }
    });

    return router;
};

export default selfDesignRouterFactory;

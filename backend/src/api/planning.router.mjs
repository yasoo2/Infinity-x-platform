import express from 'express';
import { requireRole } from '../../middleware/auth.mjs';
import { ROLES } from '../../../shared/roles.js';

const planningRouterFactory = ({ planningSystem, requireRole }) => {
    const router = express.Router();

    // Middleware to ensure planningSystem is available
    router.use((req, res, next) => {
        if (!planningSystem) {
            return res.status(503).json({ success: false, error: 'Planning system not initialized.' });
        }
        next();
    });

    /**
     * @route POST /api/v1/planning/plan
     * @description Creates a new plan.
     * @access Private (Super Admin)
     */
    router.post('/plan', requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
        try {
            const { goal, phases } = req.body;
            const userId = req.user.userId; // Assuming user is attached to req by auth middleware
            const newPlan = await planningSystem.createPlan(userId, goal, phases);
            res.status(201).json({ success: true, data: newPlan });
        } catch (error) {
            console.error('❌ Planning/plan endpoint error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route GET /api/v1/planning/plan/:planId
     * @description Gets details of a specific plan.
     * @access Private (User)
     */
    router.get('/plan/:planId', requireRole(ROLES.USER), async (req, res) => {
        try {
            const { planId } = req.params;
            const planDetails = await planningSystem.getPlanDetails(planId);
            res.status(200).json({ success: true, data: planDetails });
        } catch (error) {
            console.error('❌ Planning/plan/:planId endpoint error:', error);
            res.status(404).json({ success: false, error: error.message });
        }
    });

    // Add other routes for tasks, phases, progress, etc.
    // For brevity, we will only add the core ones for now.

    return router;
};

export default planningRouterFactory;

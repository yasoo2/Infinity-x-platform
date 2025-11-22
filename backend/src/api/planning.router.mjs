import express from 'express';

// REFACTORED to use a service-oriented, factory-based approach.

const planningRouterFactory = ({ requireRole, planningService }) => {
    const router = express.Router();

    // Middleware to check if the planning service is available
    const isServiceAvailable = (req, res, next) => {
        if (!planningService) {
            return res.status(503).json({ success: false, error: 'SERVICE_UNAVAILABLE', message: 'Planning service is not configured on the server.' });
        }
        next();
    };

    router.use(isServiceAvailable);
    router.use(requireRole('USER')); // All planning routes require at least a USER role.

    // === Plan Routes ===

    // GET all plans for the user
    router.get('/', async (req, res) => {
        try {
            const plans = await planningService.listPlans(req.user._id);
            res.json({ success: true, plans });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // POST a new plan
    router.post('/', async (req, res) => {
        try {
            const { title, goal, description } = req.body;
            if (!title || !goal) return res.status(400).json({ success: false, error: 'Title and goal are required.' });
            
            const newPlan = await planningService.createPlan({ title, goal, description, userId: req.user._id });
            res.status(201).json({ success: true, plan: newPlan });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET a single plan's details
    router.get('/:planId', async (req, res) => {
        try {
            const plan = await planningService.getPlan(req.params.planId, req.user._id);
            if (!plan) return res.status(404).json({ success: false, error: 'Plan not found or access denied.' });
            res.json({ success: true, plan });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // DELETE a plan
    router.delete('/:planId', async (req, res) => {
        try {
            const result = await planningService.deletePlan(req.params.planId, req.user._id);
            if (!result.success) return res.status(404).json(result);
            res.json({ success: true, message: 'Plan deleted successfully.' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // === Task Routes ===

    // POST a new task to a plan
    router.post('/:planId/tasks', async (req, res) => {
        try {
            const { title, description, phaseId } = req.body;
            if (!title) return res.status(400).json({ success: false, error: 'Task title is required.' });

            const newTask = await planningService.addTask({ 
                planId: req.params.planId, 
                userId: req.user._id, 
                title, 
                description, 
                phaseId 
            });
            res.status(201).json({ success: true, task: newTask });
        } catch (error) {
            // The service might throw a 404 or 403, so we can have specific error handling here.
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // PUT to update a task's status
    router.put('/tasks/:taskId', async (req, res) => {
        try {
            const { status } = req.body;
            if (!status) return res.status(400).json({ success: false, error: 'Status is required.' });

            const updatedTask = await planningService.updateTaskStatus({
                taskId: req.params.taskId,
                userId: req.user._id,
                status
            });
            res.json({ success: true, task: updatedTask });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

export default planningRouterFactory;

import express from 'express';
import { ROLES } from '../../../shared/roles.js';

const schedulingRouterFactory = ({ schedulingSystem, requireRole }) => {
    const router = express.Router();

    // Middleware to ensure schedulingSystem is available
    router.use((req, res, next) => {
        if (!schedulingSystem) {
            return res.status(503).json({ success: false, error: 'Scheduling system not initialized.' });
        }
        next();
    });

    /**
     * @route POST /api/v1/scheduling/task
     * @description Schedules a new task.
     * @access Private (Super Admin)
     */
    router.post('/task', requireRole(ROLES.SUPER_ADMIN), async (req, res) => {
        try {
            const { name, type, cronExpression, interval, prompt } = req.body;
            const userId = req.user.userId; // Assuming user is attached to req by auth middleware
            const newTask = await schedulingSystem.scheduleTask({
                name,
                type,
                cronExpression,
                interval,
                prompt,
                userId
            }, () => { /* Placeholder handler */ });
            res.status(201).json({ success: true, data: newTask });
        } catch (error) {
            console.error('❌ Scheduling/task endpoint error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * @route GET /api/v1/scheduling/tasks
     * @description Gets all scheduled tasks.
     * @access Private (User)
     */
    router.get('/tasks', requireRole(ROLES.USER), async (req, res) => {
        try {
            const tasks = await schedulingSystem.getAllTasks();
            res.status(200).json({ success: true, data: tasks });
        } catch (error) {
            console.error('❌ Scheduling/tasks endpoint error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Add other routes for pause, resume, delete, etc.
    // For brevity, we will only add the core ones for now.

    return router;
};

export default schedulingRouterFactory;

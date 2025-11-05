/**
 * planningRoutes.mjs
 * REST API routes for planning system
 */

import express from 'express';
import PlanningSystem from '../planning/PlanningSystem.mjs';
import { initMongo } from '../db.mjs';

// Simple auth middleware (replace with your actual auth system)
const requireAuth = (req, res, next) => {
  // For now, allow all requests - implement proper auth later
  next();
};

const router = express.Router();
let planningSystem = null;

// Initialize planning system
async function getPlanningSystem() {
  if (!planningSystem) {
    const db = await initMongo();
    planningSystem = new PlanningSystem(db);
  }
  return planningSystem;
}

/**
 * POST /api/v1/planning/create
 * Create a new plan
 */
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { title, description, goal, metadata } = req.body;

    if (!title || !goal) {
      return res.status(400).json({ error: 'title and goal are required' });
    }

    const planning = await getPlanningSystem();
    const plan = await planning.createPlan({
      title,
      description,
      goal,
      userId: req.user._id,
      metadata
    });

    res.json({
      ok: true,
      plan
    });
  } catch (err) {
    console.error('Plan creation error:', err);
    res.status(500).json({
      error: 'PLAN_CREATION_ERROR',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/planning/:planId/phase/add
 * Add a phase to a plan
 */
router.post('/:planId/phase/add', requireAuth, async (req, res) => {
  try {
    const { planId } = req.params;
    const { title, description, order, capabilities } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const planning = await getPlanningSystem();
    const phase = await planning.addPhase(planId, {
      title,
      description,
      order,
      capabilities
    });

    res.json({
      ok: true,
      phase
    });
  } catch (err) {
    console.error('Phase addition error:', err);
    res.status(500).json({
      error: 'PHASE_ADDITION_ERROR',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/planning/:phaseId/task/add
 * Add a task to a phase
 */
router.post('/:phaseId/task/add', requireAuth, async (req, res) => {
  try {
    const { phaseId } = req.params;
    const { title, description, priority, estimatedDuration } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const planning = await getPlanningSystem();
    const task = await planning.addTask(phaseId, {
      title,
      description,
      priority,
      estimatedDuration
    });

    res.json({
      ok: true,
      task
    });
  } catch (err) {
    console.error('Task addition error:', err);
    res.status(500).json({
      error: 'TASK_ADDITION_ERROR',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/planning/phase/:phaseId/start
 * Start a phase
 */
router.post('/phase/:phaseId/start', requireAuth, async (req, res) => {
  try {
    const { phaseId } = req.params;

    const planning = await getPlanningSystem();
    const phase = await planning.startPhase(phaseId);

    res.json({
      ok: true,
      phase
    });
  } catch (err) {
    console.error('Phase start error:', err);
    res.status(500).json({
      error: 'PHASE_START_ERROR',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/planning/phase/:phaseId/complete
 * Complete a phase
 */
router.post('/phase/:phaseId/complete', requireAuth, async (req, res) => {
  try {
    const { phaseId } = req.params;

    const planning = await getPlanningSystem();
    const phase = await planning.completePhase(phaseId);

    res.json({
      ok: true,
      phase
    });
  } catch (err) {
    console.error('Phase completion error:', err);
    res.status(500).json({
      error: 'PHASE_COMPLETION_ERROR',
      message: err.message
    });
  }
});

/**
 * PUT /api/v1/planning/task/:taskId/status
 * Update task status
 */
router.put('/task/:taskId/status', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const planning = await getPlanningSystem();
    const task = await planning.updateTaskStatus(taskId, status);

    res.json({
      ok: true,
      task
    });
  } catch (err) {
    console.error('Task status update error:', err);
    res.status(500).json({
      error: 'TASK_STATUS_UPDATE_ERROR',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/planning/:planId/details
 * Get plan details with all phases and tasks
 */
router.get('/:planId/details', requireAuth, async (req, res) => {
  try {
    const { planId } = req.params;

    const planning = await getPlanningSystem();
    const plan = await planning.getPlanDetails(planId);

    res.json({
      ok: true,
      plan
    });
  } catch (err) {
    console.error('Plan details error:', err);
    res.status(500).json({
      error: 'PLAN_DETAILS_ERROR',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/planning/:planId/progress
 * Get plan progress
 */
router.get('/:planId/progress', requireAuth, async (req, res) => {
  try {
    const { planId } = req.params;

    const planning = await getPlanningSystem();
    const progress = await planning.getPlanProgress(planId);

    res.json({
      ok: true,
      progress
    });
  } catch (err) {
    console.error('Plan progress error:', err);
    res.status(500).json({
      error: 'PLAN_PROGRESS_ERROR',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/planning/:planId/advance
 * Advance to next phase
 */
router.post('/:planId/advance', requireAuth, async (req, res) => {
  try {
    const { planId } = req.params;

    const planning = await getPlanningSystem();
    const result = await planning.advanceToNextPhase(planId);

    res.json({
      ok: true,
      result
    });
  } catch (err) {
    console.error('Phase advance error:', err);
    res.status(500).json({
      error: 'PHASE_ADVANCE_ERROR',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/planning/list
 * List all plans for the user
 */
router.get('/list', requireAuth, async (req, res) => {
  try {
    const planning = await getPlanningSystem();
    const plans = await planning.listUserPlans(req.user._id);

    res.json({
      ok: true,
      plans
    });
  } catch (err) {
    console.error('Plans list error:', err);
    res.status(500).json({
      error: 'PLANS_LIST_ERROR',
      message: err.message
    });
  }
});

/**
 * DELETE /api/v1/planning/:planId
 * Delete a plan
 */
router.delete('/:planId', requireAuth, async (req, res) => {
  try {
    const { planId } = req.params;

    const planning = await getPlanningSystem();
    const result = await planning.deletePlan(planId);

    res.json({
      ok: true,
      result
    });
  } catch (err) {
    console.error('Plan deletion error:', err);
    res.status(500).json({
      error: 'PLAN_DELETION_ERROR',
      message: err.message
    });
  }
});

export default router;

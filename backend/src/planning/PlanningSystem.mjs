/**
 * PlanningSystem.mjs
 * Manages task planning and phase management
 */

import { ObjectId } from 'mongodb';
import toolManager from '../services/tools/tool-manager.service.mjs';
import { v4 as uuidv4 } from 'uuid';

class PlanningSystem {
  constructor(db) {
    this.db = db;
    this.plansCollection = db.collection('plans');
    this.phasesCollection = db.collection('phases');
    this.tasksCollection = db.collection('tasks');
  }

  /**
   * Create a new plan
   */
  async createPlan(planData) {
    try {
      const plan = {
        _id: new ObjectId(),
        planId: uuidv4(),
        title: planData.title,
        description: planData.description || '',
        goal: planData.goal,
        status: 'planning', // planning, active, completed, failed
        // New fields for Hierarchical Planning
        parentPlanId: planData.parentPlanId || null,
        subPlans: [], // Array of sub-plan IDs
        phases: [],
        currentPhaseId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: planData.userId,
        metadata: planData.metadata || {},
        availableTools: toolManager.getToolSchemas()
      };

      await this.plansCollection.insertOne(plan);
      return plan;
    } catch (err) {
      console.error('Failed to create plan:', err);
      throw err;
    }
  }

  /**
   * Add a phase to a plan
   */
  async addPhase(planId, phaseData) {
    try {
      const phase = {
        _id: new ObjectId(),
        phaseId: uuidv4(),
        planId,
        title: phaseData.title,
        description: phaseData.description || '',
        order: phaseData.order || 0,
        status: 'pending', // pending, in_progress, completed, failed
        // New fields for Self-Correction/Feedback Loop
        feedback: phaseData.feedback || [], // Array of feedback objects
        retryCount: 0,
        lastAttemptStatus: null,
        capabilities: phaseData.capabilities || {},
        tasks: [],
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.phasesCollection.insertOne(phase);

      // Update plan with phase reference
      await this.plansCollection.updateOne(
        { planId },
        { 
          $push: { phases: phase.phaseId },
          $set: { updatedAt: new Date() }
        }
      );

      return phase;
    } catch (err) {
      console.error('Failed to add phase:', err);
      throw err;
    }
  }

  /**
   * Add a task to a phase
   */
  async addTask(phaseId, taskData) {
    try {
      const task = {
        _id: new ObjectId(),
        taskId: uuidv4(),
        phaseId,
        title: taskData.title,
        description: taskData.description || '',
        status: 'pending', // pending, in_progress, completed, failed
        // New fields for Self-Correction/Feedback Loop
        feedback: taskData.feedback || [], // Array of feedback objects
        retryCount: 0,
        lastAttemptStatus: null,
        priority: taskData.priority || 'medium', // low, medium, high
        estimatedDuration: taskData.estimatedDuration || 0,
        actualDuration: 0,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.tasksCollection.insertOne(task);

      // Update phase with task reference
      await this.phasesCollection.updateOne(
        { phaseId },
        { 
          $push: { tasks: task.taskId },
          $set: { updatedAt: new Date() }
        }
      );

      return task;
    } catch (err) {
      console.error('Failed to add task:', err);
      throw err;
    }
  }

  /**
   * Start a phase
   */
  async startPhase(phaseId) {
    try {
      const phase = await this.phasesCollection.findOne({ phaseId });

      if (!phase) {
        throw new Error('Phase not found');
      }

      const updatedPhase = await this.phasesCollection.findOneAndUpdate(
        { phaseId },
        {
          $set: {
            status: 'in_progress',
            startedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      // Update plan's current phase
      await this.plansCollection.updateOne(
        { planId: phase.planId },
        { $set: { currentPhaseId: phaseId } }
      );

      return updatedPhase.value;
    } catch (err) {
      console.error('Failed to start phase:', err);
      throw err;
    }
  }

  /**
   * Complete a phase
   */
  async completePhase(phaseId) {
    try {
      const phase = await this.phasesCollection.findOne({ phaseId });

      if (!phase) {
        throw new Error('Phase not found');
      }

      const updatedPhase = await this.phasesCollection.findOneAndUpdate(
        { phaseId },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      return updatedPhase.value;
    } catch (err) {
      console.error('Failed to complete phase:', err);
      throw err;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId, status) {
    try {
      const validStatuses = ['pending', 'in_progress', 'completed', 'failed'];

      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'in_progress') {
        updateData.startedAt = new Date();
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
      }

      const updatedTask = await this.tasksCollection.findOneAndUpdate(
        { taskId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      return updatedTask.value;
    } catch (err) {
      console.error('Failed to update task status:', err);
      throw err;
    }
  }

  /**
   * Add feedback entry to a task
   */
  async addTaskFeedback(taskId, feedback) {
    try {
      const fb = {
        message: String(feedback?.message || ''),
        attempt: typeof feedback?.attempt === 'number' ? feedback.attempt : null,
        timestamp: new Date(),
        details: typeof feedback?.details === 'object' ? feedback.details : undefined
      };
      await this.tasksCollection.updateOne(
        { taskId },
        { $push: { feedback: fb }, $set: { updatedAt: new Date() } }
      );
      return { success: true };
    } catch (err) {
      console.error('Failed to add task feedback:', err);
      throw err;
    }
  }

  /**
   * Increment retry count and record last attempt status
   */
  async incrementTaskRetry(taskId, lastAttemptStatus) {
    try {
      const res = await this.tasksCollection.findOneAndUpdate(
        { taskId },
        { $inc: { retryCount: 1 }, $set: { lastAttemptStatus, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      return res.value;
    } catch (err) {
      console.error('Failed to increment task retry:', err);
      throw err;
    }
  }

  /**
   * Get plan with all phases and tasks
   */
  async getPlanDetails(planId) {
    try {
      const plan = await this.plansCollection.findOne({ planId });

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Get all phases
      const phases = await this.phasesCollection
        .find({ planId })
        .sort({ order: 1 })
        .toArray();

      // Get all tasks for each phase
      const phasesWithTasks = await Promise.all(
        phases.map(async (phase) => {
          const tasks = await this.tasksCollection
            .find({ phaseId: phase.phaseId })
            .toArray();

          return {
            ...phase,
            tasks
          };
        })
      );

      return {
        ...plan,
        phases: phasesWithTasks
      };
    } catch (err) {
      console.error('Failed to get plan details:', err);
      throw err;
    }
  }

  /**
   * Get plan progress
   */
  async getPlanProgress(planId) {
    try {
      const plan = await this.plansCollection.findOne({ planId });

      if (!plan) {
        throw new Error('Plan not found');
      }

      const phases = await this.phasesCollection
        .find({ planId })
        .toArray();

      const completedPhases = phases.filter(p => p.status === 'completed').length;
      const totalPhases = phases.length;

      let totalTasks = 0;
      let completedTasks = 0;

      for (const phase of phases) {
        const tasks = await this.tasksCollection
          .find({ phaseId: phase.phaseId })
          .toArray();

        totalTasks += tasks.length;
        completedTasks += tasks.filter(t => t.status === 'completed').length;
      }

      return {
        planId,
        status: plan.status,
        phaseProgress: {
          completed: completedPhases,
          total: totalPhases,
          percentage: totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0
        },
        taskProgress: {
          completed: completedTasks,
          total: totalTasks,
          percentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
        }
      };
    } catch (err) {
      console.error('Failed to get plan progress:', err);
      throw err;
    }
  }

  /**
   * Advance to next phase
   */
  async advanceToNextPhase(planId) {
    try {
      const plan = await this.plansCollection.findOne({ planId });

      if (!plan) {
        throw new Error('Plan not found');
      }

      const phases = await this.phasesCollection
        .find({ planId })
        .sort({ order: 1 })
        .toArray();

      const currentPhaseIndex = phases.findIndex(p => p.phaseId === plan.currentPhaseId);
      const nextPhaseIndex = currentPhaseIndex + 1;

      if (nextPhaseIndex >= phases.length) {
        // All phases completed
        await this.plansCollection.updateOne(
          { planId },
          {
            $set: {
              status: 'completed',
              updatedAt: new Date()
            }
          }
        );

        return { success: true, message: 'All phases completed' };
      }

      const nextPhase = phases[nextPhaseIndex];
      await this.startPhase(nextPhase.phaseId);

      return { success: true, nextPhase };
    } catch (err) {
      console.error('Failed to advance to next phase:', err);
      throw err;
    }
  }

  /**
   * List all plans for a user
   */
  async listUserPlans(userId) {
    try {
      const plans = await this.plansCollection
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();

      return plans;
    } catch (err) {
      console.error('Failed to list user plans:', err);
      throw err;
    }
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId) {
    try {
      // Delete all tasks
      const phases = await this.phasesCollection
        .find({ planId })
        .toArray();

      for (const phase of phases) {
        await this.tasksCollection.deleteMany({ phaseId: phase.phaseId });
      }

      // Delete all phases
      await this.phasesCollection.deleteMany({ planId });

      // Delete plan
      await this.plansCollection.deleteOne({ planId });

      return { success: true };
    } catch (err) {
      console.error('Failed to delete plan:', err);
      throw err;
    }
  }
}

export default PlanningSystem;

/**
 * SchedulingSystem.mjs
 * Manages task scheduling and execution
 */

import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';

class SchedulingSystem {
  constructor(db) {
    this.db = db;
    this.scheduledTasksCollection = db.collection('scheduled_tasks');
    this.scheduledJobs = new Map();
    this.executionHistory = new Map();
  }

  /**
   * Schedule a task with cron expression
   */
  async scheduleCronTask(taskData) {
    try {
      const taskId = uuidv4();
      const { cronExpression, taskName, handler, description } = taskData;

      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error('Invalid cron expression');
      }

      // Store task in database
      const task = {
        _id: new ObjectId(),
        taskId,
        taskName,
        description: description || '',
        type: 'cron',
        cronExpression,
        status: 'active',
        createdAt: new Date(),
        lastRun: null,
        nextRun: null,
        executionCount: 0,
        failureCount: 0
      };

      await this.scheduledTasksCollection.insertOne(task);

      // Schedule the job
      const job = cron.schedule(cronExpression, async () => {
        await this.executeTask(taskId, handler);
      });

      this.scheduledJobs.set(taskId, job);

      return {
        taskId,
        taskName,
        cronExpression,
        status: 'scheduled'
      };
    } catch (err) {
      console.error('Failed to schedule cron task:', err);
      throw err;
    }
  }

  /**
   * Schedule a task with interval
   */
  async scheduleIntervalTask(taskData) {
    try {
      const taskId = uuidv4();
      const { interval, taskName, handler, description } = taskData;

      if (!interval || interval < 3600) {
        throw new Error('Interval must be at least 3600 seconds (1 hour)');
      }

      // Store task in database
      const task = {
        _id: new ObjectId(),
        taskId,
        taskName,
        description: description || '',
        type: 'interval',
        interval,
        status: 'active',
        createdAt: new Date(),
        lastRun: null,
        nextRun: new Date(Date.now() + interval * 1000),
        executionCount: 0,
        failureCount: 0
      };

      await this.scheduledTasksCollection.insertOne(task);

      // Schedule the job
      const intervalId = setInterval(async () => {
        await this.executeTask(taskId, handler);
      }, interval * 1000);

      this.scheduledJobs.set(taskId, intervalId);

      return {
        taskId,
        taskName,
        interval,
        status: 'scheduled'
      };
    } catch (err) {
      console.error('Failed to schedule interval task:', err);
      throw err;
    }
  }

  /**
   * Execute a scheduled task
   */
  async executeTask(taskId, handler) {
    try {
      const task = await this.scheduledTasksCollection.findOne({ taskId });

      if (!task) {
        throw new Error('Task not found');
      }

      const startTime = Date.now();

      try {
        // Execute the handler
        if (typeof handler === 'function') {
          await handler();
        } else if (typeof handler === 'string') {
          // If handler is a string, try to execute it as a command
          const { exec } = await import('child_process');
          await new Promise((resolve, reject) => {
            exec(handler, (error, stdout, stderr) => {
              if (error) reject(error);
              else resolve({ stdout, stderr });
            });
          });
        }

        const duration = Date.now() - startTime;

        // Record successful execution
        await this.scheduledTasksCollection.updateOne(
          { taskId },
          {
            $set: {
              lastRun: new Date(),
              status: 'active'
            },
            $inc: { executionCount: 1 }
          }
        );

        // Store execution history
        this.recordExecution(taskId, {
          status: 'success',
          duration,
          timestamp: new Date()
        });

        console.log(`✅ Task ${taskId} executed successfully in ${duration}ms`);
      } catch (err) {
        const duration = Date.now() - startTime;

        // Record failed execution
        await this.scheduledTasksCollection.updateOne(
          { taskId },
          {
            $set: {
              lastRun: new Date(),
              status: 'error'
            },
            $inc: { failureCount: 1 }
          }
        );

        // Store execution history
        this.recordExecution(taskId, {
          status: 'failed',
          error: err.message,
          duration,
          timestamp: new Date()
        });

        console.error(`❌ Task ${taskId} failed:`, err);
      }
    } catch (err) {
      console.error('Failed to execute task:', err);
    }
  }

  /**
   * Record task execution in history
   */
  recordExecution(taskId, executionData) {
    if (!this.executionHistory.has(taskId)) {
      this.executionHistory.set(taskId, []);
    }

    const history = this.executionHistory.get(taskId);
    history.push(executionData);

    // Keep only last 100 executions
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Pause a scheduled task
   */
  async pauseTask(taskId) {
    try {
      const job = this.scheduledJobs.get(taskId);

      if (job) {
        if (job.stop) {
          job.stop(); // For cron jobs
        } else {
          clearInterval(job); // For interval jobs
        }
      }

      await this.scheduledTasksCollection.updateOne(
        { taskId },
        { $set: { status: 'paused' } }
      );

      return { success: true, message: 'Task paused' };
    } catch (err) {
      console.error('Failed to pause task:', err);
      throw err;
    }
  }

  /**
   * Resume a scheduled task
   */
  async resumeTask(taskId, handler) {
    try {
      const task = await this.scheduledTasksCollection.findOne({ taskId });

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.type === 'cron') {
        const job = cron.schedule(task.cronExpression, async () => {
          await this.executeTask(taskId, handler);
        });
        this.scheduledJobs.set(taskId, job);
      } else if (task.type === 'interval') {
        const intervalId = setInterval(async () => {
          await this.executeTask(taskId, handler);
        }, task.interval * 1000);
        this.scheduledJobs.set(taskId, intervalId);
      }

      await this.scheduledTasksCollection.updateOne(
        { taskId },
        { $set: { status: 'active' } }
      );

      return { success: true, message: 'Task resumed' };
    } catch (err) {
      console.error('Failed to resume task:', err);
      throw err;
    }
  }

  /**
   * Delete a scheduled task
   */
  async deleteTask(taskId) {
    try {
      const job = this.scheduledJobs.get(taskId);

      if (job) {
        if (job.stop) {
          job.stop();
        } else {
          clearInterval(job);
        }
        this.scheduledJobs.delete(taskId);
      }

      this.executionHistory.delete(taskId);

      await this.scheduledTasksCollection.deleteOne({ taskId });

      return { success: true, message: 'Task deleted' };
    } catch (err) {
      console.error('Failed to delete task:', err);
      throw err;
    }
  }

  /**
   * Get all scheduled tasks
   */
  async getAllTasks() {
    try {
      const tasks = await this.scheduledTasksCollection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return tasks.map(task => ({
        ...task,
        executionHistory: this.executionHistory.get(task.taskId) || []
      }));
    } catch (err) {
      console.error('Failed to get all tasks:', err);
      throw err;
    }
  }

  /**
   * Get task details with execution history
   */
  async getTaskDetails(taskId) {
    try {
      const task = await this.scheduledTasksCollection.findOne({ taskId });

      if (!task) {
        throw new Error('Task not found');
      }

      return {
        ...task,
        executionHistory: this.executionHistory.get(taskId) || []
      };
    } catch (err) {
      console.error('Failed to get task details:', err);
      throw err;
    }
  }

  /**
   * Get execution history for a task
   */
  getExecutionHistory(taskId, limit = 50) {
    const history = this.executionHistory.get(taskId) || [];
    return history.slice(-limit);
  }

  /**
   * Get scheduling system statistics
   */
  getStats() {
    return {
      totalScheduledTasks: this.scheduledJobs.size,
      activeJobs: Array.from(this.scheduledJobs.keys()),
      executionHistorySize: this.executionHistory.size
    };
  }
}

export default SchedulingSystem;

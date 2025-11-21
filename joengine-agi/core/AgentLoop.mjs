/**
 * Agent Loop - حلقة التنفيذ المستقلة لـ JOEngine AGI
 * 
 * المسؤوليات:
 * - تنفيذ الخطط التي يضعها Reasoning Engine
 * - إدارة المهام بشكل مستقل
 * - العمل في الخلفية بشكل مستمر
 * - جمع الملاحظات وإعادتها للـ Reasoning Engine
 */

import EventEmitter from 'events';
import GitHubTool from '../tools/GitHubTool.mjs';
import DatabaseTool from '../tools/DatabaseTool.mjs';
import DeployTool from '../tools/DeployTool.mjs';
import { VectorDBTool } from '../tools/VectorDBTool.mjs'; // Import VectorDBTool
import { v4 as uuidv4 } from 'uuid';

export class AgentLoop extends EventEmitter {
  constructor(reasoningEngine, toolsSystem) {
    super();
    
    this.reasoningEngine = reasoningEngine;
    this.toolsSystem = toolsSystem;
    this.config = reasoningEngine.config;

    // Instantiate tools
    this.githubTool = new GitHubTool(this.config);
    this.databaseTool = new DatabaseTool(this.config);
    this.deployTool = new DeployTool(this.config);
    this.vectorDbTool = new VectorDBTool(this.config); // Instantiate VectorDBTool
    
    this.state = {
      running: false,
      runningTasks: [],
      taskQueue: [],
      completedTasks: [],
      failedTasks: []
    };
    
    this.loopConfig = {
      maxRetries: 3,
      retryDelay: 5000,
      maxConcurrentTasks: 5
    };
  }

  async start() {
    if (this.state.running) {
      console.log('⚠️  Agent Loop is already running');
      return;
    }
    console.log('🚀 Starting JOEngine Agent Loop...');
    this.state.running = true;
    this.emit('started');
    this.mainLoop();
  }

  async stop() {
    console.log('🛑 Stopping JOEngine Agent Loop...');
    this.state.running = false;
    this.emit('stopped');
  }

  async mainLoop() {
    while (this.state.running) {
      try {
        if (this.state.taskQueue.length > 0 && this.state.runningTasks.length < this.loopConfig.maxConcurrentTasks) {
          const task = this.state.taskQueue.shift();
          this.executeTask(task).catch(error => {
            console.error(`❌ Error during async task execution for ${task.id}:`, error);
          });
        }
        await this.sleep(1000);
      } catch (error) {
        console.error('❌ Main loop error:', error);
        this.emit('error', error);
        await this.sleep(5000);
      }
    }
  }

  async addTask(goal, context = {}) {
    const task = {
      id: uuidv4(),
      goal,
      context,
      status: 'queued',
      createdAt: new Date(),
      retries: 0
    };
    console.log(`\n📝 New task added: ${task.id} | Goal: ${goal}`);
    this.state.taskQueue.push(task);
    this.emit('taskAdded', task);
    return task.id;
  }

  async executeTask(task) {
    console.log(`\n▶️  Executing task: ${task.id}`);
    this.state.runningTasks.push(task);
    task.status = 'running';
    this.emit('taskStarted', task);

    try {
      console.log('\n📊 Phase 1: Analysis & Planning');
      const plan = await this.reasoningEngine.analyzeGoal(task.goal, task.context);
      task.plan = plan;

      console.log('\n⚙️  Phase 2: Execution');
      const results = await this.executePlan(plan, task);
      task.results = results;

      console.log('\n✅ Phase 3: Verification & Self-Correction');
      let success = await this.verifySuccess(plan, results);

      if (!success && task.retries < this.loopConfig.maxRetries) {
        console.log('\n🔄 Verification failed. Attempting self-correction...');
        const correctionPlan = await this.reasoningEngine.selfCorrect(task, plan, results);
        if (correctionPlan && correctionPlan.subtasks && correctionPlan.subtasks.length > 0) {
          console.log(`✨ Applying self-correction plan.`);
          const correctionResults = await this.executePlan(correctionPlan, task);
          results.push(...correctionResults);
          success = await this.verifySuccess(plan, [...results, ...correctionResults]);
        }
      }

      if (success) {
        await this.completeTask(task, results);
      } else {
        throw new Error('Task verification failed after all retries and corrections.');
      }
    } catch (error) {
      await this.handleTaskFailure(task, error);
    } finally {
      this.state.runningTasks = this.state.runningTasks.filter(t => t.id !== task.id);
    }
  }

  async executePlan(plan, task) {
    const results = [];
    for (const subtask of plan.subtasks) {
      console.log(`\n📌 Subtask: ${subtask.title} | Tool: ${subtask.tool}`);
      try {
        const result = await this.executeSubtask(subtask, task);
        results.push({ subtask: subtask.id, success: true, result });
        console.log(`✅ Subtask ${subtask.id} completed`);
        this.emit('subtaskCompleted', { task, subtask, result });
      } catch (error) {
        console.error(`❌ Subtask ${subtask.id} failed:`, error.message);
        results.push({ subtask: subtask.id, success: false, error: error.message });
        if (subtask.critical !== false) throw error;
      }
    }
    return results;
  }

  async executeSubtask(subtask, task) {
    const toolName = subtask.tool;
    const params = subtask.params || {};
    const action = params.action;

    // --== TOOL ROUTING ==--
    switch (toolName) {
        case 'database':
            return await this.databaseTool[action](params);
        case 'deploy':
            return await this.deployTool[action](params);
        case 'github':
            return await this.githubTool[action](params);
        case 'memory': // Added memory tool routing
            return await this.vectorDbTool.findRelevant(params.query, params.topK);
        default:
            const tool = this.toolsSystem.getTool(toolName);
            if (!tool) throw new Error(`Tool '${toolName}' not found`);
            return await tool.execute(params);
    }
  }

  async verifySuccess(plan, results) {
    const allSubtasksSucceeded = results.every(r => r.success);
    if (!allSubtasksSucceeded) {
        console.log('[Verification] Failed: Not all subtasks were successful.');
        return false;
    }
    // Placeholder for more advanced LLM-based verification
    console.log('[Verification] Passed: All subtasks successful.');
    return true;
  }

  async completeTask(task, results) {
    task.status = 'completed';
    task.completedAt = new Date();
    this.state.completedTasks.push(task);
    this.emit('taskCompleted', { task, results });
    console.log(`\n🎉 Task ${task.id} completed successfully!`);
    await this.reasoningEngine.learnFromExperience(task, results, true);
  }

  async handleTaskFailure(task, error) {
    console.error(`\n❌ Task ${task.id} failed:`, error.message);
    await this.reasoningEngine.learnFromExperience(task, [{ success: false, error: error.message }], false);

    if (task.retries < this.loopConfig.maxRetries) {
        task.retries++;
        task.status = 'queued'; // Re-queue for another attempt
        console.log(`\n🔄 Retrying task (attempt ${task.retries}/${this.loopConfig.maxRetries})...`);
        await this.sleep(this.loopConfig.retryDelay);
        this.state.taskQueue.unshift(task);
    } else {
        task.status = 'failed';
        task.error = error.message;
        this.state.failedTasks.push(task);
        this.emit('taskFailed', { task, error });
        console.log(`\n💔 Task failed after ${this.loopConfig.maxRetries} retries.`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AgentLoop;

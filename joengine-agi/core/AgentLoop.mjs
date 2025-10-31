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
import { v4 as uuidv4 } from 'uuid';

export class AgentLoop extends EventEmitter {
  constructor(reasoningEngine, toolsSystem) {
    super();
    
    this.reasoningEngine = reasoningEngine;
    this.toolsSystem = toolsSystem;
    
    this.state = {
      running: false,
      currentTask: null,
      taskQueue: [],
      completedTasks: [],
      failedTasks: []
    };
    
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      maxConcurrentTasks: 1  // سنزيدها لاحقاً
    };
  }

  /**
   * بدء Agent Loop
   */
  async start() {
    if (this.state.running) {
      console.log('⚠️  Agent Loop is already running');
      return;
    }

    console.log('🚀 Starting JOEngine Agent Loop...');
    this.state.running = true;
    this.emit('started');

    // بدء حلقة التنفيذ الرئيسية
    this.mainLoop();
  }

  /**
   * إيقاف Agent Loop
   */
  async stop() {
    console.log('🛑 Stopping JOEngine Agent Loop...');
    this.state.running = false;
    this.emit('stopped');
  }

  /**
   * الحلقة الرئيسية للتنفيذ
   */
  async mainLoop() {
    while (this.state.running) {
      try {
        // إذا كان هناك مهام في الانتظار
        if (this.state.taskQueue.length > 0 && !this.state.currentTask) {
          const task = this.state.taskQueue.shift();
          await this.executeTask(task);
        }

        // انتظار قصير قبل التكرار
        await this.sleep(1000);
      } catch (error) {
        console.error('❌ Main loop error:', error);
        this.emit('error', error);
        
        // انتظار أطول في حالة الخطأ
        await this.sleep(5000);
      }
    }
  }

  /**
   * إضافة مهمة جديدة
   */
  async addTask(goal, context = {}) {
    const task = {
      id: uuidv4(),
      goal,
      context,
      status: 'queued',
      createdAt: new Date(),
      retries: 0
    };

    console.log(`\n📝 New task added: ${task.id}`);
    console.log(`Goal: ${goal}`);

    this.state.taskQueue.push(task);
    this.emit('taskAdded', task);

    return task.id;
  }

  /**
   * تنفيذ مهمة
   */
  async executeTask(task) {
    console.log(`\n▶️  Executing task: ${task.id}`);
    console.log(`Goal: ${task.goal}`);

    this.state.currentTask = task;
    task.status = 'running';
    task.startedAt = new Date();
    this.emit('taskStarted', task);

    try {
      // المرحلة 1: التحليل والتخطيط
      console.log('\n📊 Phase 1: Analysis & Planning');
      const plan = await this.reasoningEngine.analyzeGoal(task.goal, task.context);
      task.plan = plan;

      // المرحلة 2: التنفيذ
      console.log('\n⚙️  Phase 2: Execution');
      const results = await this.executePlan(plan, task);
      task.results = results;

      // المرحلة 3: التحقق من النجاح
      console.log('\n✅ Phase 3: Verification');
      const success = await this.verifySuccess(plan, results);

      if (success) {
        // نجحت المهمة
        task.status = 'completed';
        task.completedAt = new Date();
        task.duration = task.completedAt - task.startedAt;

        this.state.completedTasks.push(task);
        this.emit('taskCompleted', task);

        console.log(`\n🎉 Task completed successfully!`);
        console.log(`Duration: ${(task.duration / 1000).toFixed(2)}s`);

        // التعلم من النجاح
        await this.reasoningEngine.learnFromExperience(task, results, true);
      } else {
        throw new Error('Task verification failed');
      }

    } catch (error) {
      console.error(`\n❌ Task execution failed:`, error.message);

      // محاولة إعادة التنفيذ
      if (task.retries < this.config.maxRetries) {
        task.retries++;
        task.status = 'retrying';

        console.log(`\n🔄 Retrying task (attempt ${task.retries}/${this.config.maxRetries})...`);

        // التعلم من الفشل
        const learning = await this.reasoningEngine.learnFromExperience(
          task,
          { error: error.message },
          false
        );

        // إذا كان هناك نهج بديل، استخدمه
        if (learning && learning.shouldRetry && learning.alternativeApproach) {
          task.context.alternativeApproach = learning.alternativeApproach;
        }

        // إعادة المهمة للقائمة
        await this.sleep(this.config.retryDelay);
        this.state.taskQueue.unshift(task);
      } else {
        // فشلت المهمة نهائياً
        task.status = 'failed';
        task.error = error.message;
        task.failedAt = new Date();

        this.state.failedTasks.push(task);
        this.emit('taskFailed', task);

        console.log(`\n💔 Task failed after ${this.config.maxRetries} retries`);
      }
    } finally {
      this.state.currentTask = null;
    }
  }

  /**
   * تنفيذ خطة كاملة
   */
  async executePlan(plan, task) {
    const results = [];

    for (let i = 0; i < plan.subtasks.length; i++) {
      const subtask = plan.subtasks[i];
      
      console.log(`\n📌 Subtask ${i + 1}/${plan.subtasks.length}: ${subtask.title}`);
      console.log(`Tool: ${subtask.tool}`);
      console.log(`Reasoning: ${subtask.reasoning}`);

      try {
        // تنفيذ الـ subtask باستخدام الأداة المناسبة
        const result = await this.executeSubtask(subtask, task);
        results.push({
          subtask: subtask.id,
          success: true,
          result
        });

        console.log(`✅ Subtask ${subtask.id} completed`);
        this.emit('subtaskCompleted', { task, subtask, result });

      } catch (error) {
        console.error(`❌ Subtask ${subtask.id} failed:`, error.message);
        
        // إذا كانت المهمة الفرعية حرجة، نفشل الخطة كاملة
        if (subtask.critical !== false) {
          throw error;
        }

        results.push({
          subtask: subtask.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * تنفيذ مهمة فرعية واحدة
   */
  async executeSubtask(subtask, task) {
    const tool = this.toolsSystem.getTool(subtask.tool);
    
    if (!tool) {
      throw new Error(`Tool '${subtask.tool}' not found`);
    }

    // استخراج المعاملات من وصف المهمة الفرعية
    const params = await this.extractParams(subtask, task);

    // تنفيذ الأداة
    return await tool.execute(params);
  }

  /**
   * استخراج معاملات الأداة من وصف المهمة
   */
  async extractParams(subtask, task) {
    // هنا يمكننا استخدام LLM لاستخراج المعاملات بذكاء
    // لكن الآن سنستخدم طريقة بسيطة
    
    return {
      description: subtask.description,
      context: task.context,
      ...subtask.params
    };
  }

  /**
   * التحقق من نجاح المهمة
   */
  async verifySuccess(plan, results) {
    // التحقق البسيط: كل المهام الفرعية نجحت
    const allSuccessful = results.every(r => r.success);
    
    if (!allSuccessful) {
      return false;
    }

    // يمكننا إضافة تحقق أكثر ذكاءً باستخدام LLM
    // للتأكد من أن النتائج تحقق معايير النجاح

    return true;
  }

  /**
   * الحصول على حالة Agent Loop
   */
  getStatus() {
    return {
      running: this.state.running,
      currentTask: this.state.currentTask,
      queuedTasks: this.state.taskQueue.length,
      completedTasks: this.state.completedTasks.length,
      failedTasks: this.state.failedTasks.length,
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * حساب معدل النجاح
   */
  calculateSuccessRate() {
    const total = this.state.completedTasks.length + this.state.failedTasks.length;
    if (total === 0) return 0;
    
    return (this.state.completedTasks.length / total) * 100;
  }

  /**
   * انتظار لفترة محددة
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AgentLoop;

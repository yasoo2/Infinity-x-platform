/**
 * JOEngine AGI Class
 * 
 * يحتوي على منطق JOEngine الأساسي، بما في ذلك التهيئة، تسجيل الأدوات،
 * معالجة الأحداث، وبدء/إيقاف حلقة الوكيل (Agent Loop).
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import { ReasoningEngine } from './engines/ReasoningEngine.mjs'; // افتراض وجود هذا الملف
import { MemorySystem } from './core/MemorySystem.mjs'; // افتراض وجود هذا الملف
import { AgentLoop } from './core/AgentLoop.mjs'; // افتراض وجود هذا الملف
import { ToolsSystem } from './tools/ToolsSystem.mjs'; // افتراض وجود هذا الملف
import { BrowserTool } from './tools/BrowserTool.mjs'; // افتراض وجود هذا الملف
import { CodeTool } from './tools/CodeTool.mjs'; // افتراض وجود هذا الملف
import { FileTool } from './tools/FileTool.mjs'; // افتراض وجود هذا الملف
import { SearchTool } from './tools/SearchTool.mjs'; // افتراض وجود هذا الملف
import { ShellTool } from './tools/ShellTool.mjs'; // افتراض وجود هذا الملف
import { APITool } from './tools/APITool.mjs'; // افتراض وجود هذا الملف
import { GitHubTool } from './tools/GitHubTool.mjs'; // افتراض وجود هذا الملف
import { PlannerTool } from './tools/PlannerTool.mjs'; // افتراض وجود هذا الملف
import { createApiServer } from './server.mjs';

// تحميل متغيرات البيئة
dotenv.config();

export class JOEngine {
  constructor(config = {}) {
    this.config = {
      openaiApiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      mongoUri: process.env.MONGO_URI,
      port: process.env.PORT || 3000,
      ...config
    };

    // التحقق من المتطلبات
    if (!this.config.openaiApiKey) {
      // لا يجب أن يرمي خطأ هنا، بل يجب أن يتم التعامل معه في نقطة الدخول
      console.warn('OPENAI_API_KEY is not set. Some features may be disabled.');
    }

    console.log(chalk.cyan.bold('\n🚀 Initializing JOEngine AGI...\n'));

    // إنشاء المكونات الأساسية
    this.memorySystem = new MemorySystem(); 
    this.reasoningEngine = new ReasoningEngine(this.config, this.memorySystem); 
    this.toolsSystem = new ToolsSystem();
    this.agentLoop = new AgentLoop(this.reasoningEngine, this.toolsSystem);

    // تسجيل الأدوات
    this.registerTools();

    // إعداد معالجات الأحداث
    this.setupEventHandlers();

    console.log(chalk.green('✅ JOEngine AGI initialized successfully!\n'));
  }

  /**
   * تسجيل جميع الأدوات
   */
  registerTools() {
    console.log(chalk.yellow('📦 Registering tools...'));

    // Browser Tool
    const browserTool = new BrowserTool();
    this.toolsSystem.registerTool('browser', browserTool);

    // Code Tool
    const codeTool = new CodeTool();
    this.toolsSystem.registerTool('code', codeTool);

    // File Tool
    const fileTool = new FileTool();
    this.toolsSystem.registerTool('file', fileTool);

    // Search Tool
    const searchTool = new SearchTool();
    this.toolsSystem.registerTool('search', searchTool);

    // Shell Tool
    const shellTool = new ShellTool();
    this.toolsSystem.registerTool('shell', shellTool);

    // API Tool
    const apiTool = new APITool();
    this.toolsSystem.registerTool('api', apiTool);

    // GitHub Tool
    const githubTool = new GitHubTool();
    this.toolsSystem.registerTool('github', githubTool);

    // Planner Tool (الأداة الجديدة)
    const plannerTool = new PlannerTool();
    this.toolsSystem.registerTool('planner', plannerTool);

    console.log(chalk.green(`✅ ${this.toolsSystem.getAllTools().length} tools registered\n`));
  }

  /**
   * إعداد معالجات الأحداث
   */
  setupEventHandlers() {
    // Agent Loop Events
    this.agentLoop.on('started', () => {
      console.log(chalk.green.bold('▶️  Agent Loop started'));
    });

    this.agentLoop.on('stopped', () => {
      console.log(chalk.yellow.bold('⏸️  Agent Loop stopped'));
    });

    this.agentLoop.on('taskAdded', (task) => {
      console.log(chalk.blue(`\n📝 Task added: ${task.id}`));
      console.log(chalk.gray(`   Goal: ${task.goal}`));
    });

    this.agentLoop.on('taskStarted', (task) => {
      console.log(chalk.cyan.bold(`\n▶️  Task started: ${task.id}`));
    });

    this.agentLoop.on('taskCompleted', (task) => {
      console.log(chalk.green.bold(`\n✅ Task completed: ${task.id}`));
      console.log(chalk.gray(`   Duration: ${(task.duration / 1000).toFixed(2)}s`));
    });

    this.agentLoop.on('taskFailed', (task) => {
      console.log(chalk.red.bold(`\n❌ Task failed: ${task.id}`));
      console.log(chalk.gray(`   Error: ${task.error}`));
    });

    this.agentLoop.on('subtaskCompleted', ({ subtask }) => {
      console.log(chalk.green(`   ✓ Subtask ${subtask.id}: ${subtask.title}`));
    });

    this.agentLoop.on('error', (error) => {
      console.error(chalk.red.bold('\n❌ Agent Loop error:'), error.message);
    });
  }

  /**
   * بدء JOEngine
   */
  async start() {
    console.log(chalk.cyan.bold('🚀 Starting JOEngine AGI...\n'));
    
    // بدء Agent Loop
    await this.agentLoop.start();

    // تشغيل خادم API
    const apiServer = createApiServer(this);
    this.server = apiServer.listen(this.config.port, () => {
      console.log(chalk.green.bold(`✅ JOEngine AGI is running on port ${this.config.port}!`));
      console.log(chalk.gray('Waiting for tasks...\n'));
    });
  }

  /**
   * إيقاف JOEngine
   */
  async stop() {
    console.log(chalk.yellow.bold('\n🛑 Stopping JOEngine AGI...\n'));
    
    // إيقاف Agent Loop
    await this.agentLoop.stop();

    // إغلاق خادم API
    if (this.server) {
      this.server.close();
    }

    // إغلاق الأدوات
    const browserTool = this.toolsSystem.getTool('browser');
    if (browserTool) {
      await browserTool.close();
    }

    console.log(chalk.green.bold('✅ JOEngine AGI stopped\n'));
  }

  /**
   * إضافة مهمة جديدة
   */
  async addTask(goal, context = {}) {
    return await this.agentLoop.addTask(goal, context);
  }

  /**
   * الحصول على حالة JOEngine
   */
  getStatus() {
    return {
      agentLoop: this.agentLoop.getStatus(),
      tools: this.toolsSystem.getStats(),
      memory: {
        shortTerm: this.memorySystem.shortTermMemory.length,
        longTerm: this.memorySystem.longTermMemory.length,
      }
    };
  }

  /**
   * عرض الحالة
   */
  printStatus() {
    const status = this.getStatus();

    console.log(chalk.cyan.bold('\n📊 JOEngine Status:\n'));
    
    console.log(chalk.yellow('Agent Loop:'));
    console.log(chalk.gray(`  Running: ${status.agentLoop.running}`));
    console.log(chalk.gray(`  Queued Tasks: ${status.agentLoop.queuedTasks}`));
    console.log(chalk.gray(`  Completed Tasks: ${status.agentLoop.completedTasks}`));
    console.log(chalk.gray(`  Failed Tasks: ${status.agentLoop.failedTasks}`));
    console.log(chalk.gray(`  Success Rate: ${status.agentLoop.successRate.toFixed(1)}%`));

    console.log(chalk.yellow('\nMemory:'));
    console.log(chalk.gray(`  Short-term: ${status.memory.shortTerm} items`));
    console.log(chalk.gray(`  Long-term: ${status.memory.longTerm} experiences`));

    console.log(chalk.yellow('\nTools:'));
    for (const [name, stats] of Object.entries(status.tools)) {
      console.log(chalk.gray(`  ${name}:`));
      console.log(chalk.gray(`    Calls: ${stats.totalCalls}`));
      console.log(chalk.gray(`    Success Rate: ${stats.successRate.toFixed(1)}%`));
      console.log(chalk.gray(`    Avg Duration: ${stats.avgDuration.toFixed(0)}ms`));
    }

    console.log();
  }
}

// تصدير JOEngine كافتراضي
export default JOEngine;

/**
 * JOEngine AGI - Main Entry Point
 * 
 * نظام ذكاء اصطناعي عام (AGI) متقدم
 * قادر على حل أي مشكلة، تطوير نفسه، وبناء الأنظمة بشكل مستقل
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import { ReasoningEngine } from './engines/ReasoningEngine.mjs';
import { AgentLoop } from './core/AgentLoop.mjs';
import { ToolsSystem } from './tools/ToolsSystem.mjs';
import { BrowserTool } from './tools/BrowserTool.mjs';
import { CodeTool } from './tools/CodeTool.mjs';

// تحميل متغيرات البيئة
dotenv.config();

/**
 * JOEngine AGI Class
 */
class JOEngine {
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
      throw new Error('OPENAI_API_KEY is required');
    }

    console.log(chalk.cyan.bold('\n🚀 Initializing JOEngine AGI...\n'));

    // إنشاء المكونات الأساسية
    this.reasoningEngine = new ReasoningEngine(this.config);
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

    // TODO: إضافة المزيد من الأدوات
    // - SearchTool
    // - FileTool
    // - ShellTool
    // - APITool
    // - DatabaseTool
    // - DeployTool

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

    console.log(chalk.green.bold('✅ JOEngine AGI is running!\n'));
    console.log(chalk.gray('Waiting for tasks...\n'));
  }

  /**
   * إيقاف JOEngine
   */
  async stop() {
    console.log(chalk.yellow.bold('\n🛑 Stopping JOEngine AGI...\n'));

    // إيقاف Agent Loop
    await this.agentLoop.stop();

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
      memory: this.reasoningEngine.getMemoryStats()
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
    console.log(chalk.gray(`  Plans: ${status.memory.plans} plans`));
    console.log(chalk.gray(`  Success Rate: ${status.memory.successRate.toFixed(1)}%`));

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

/**
 * Main Function
 */
async function main() {
  console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              🤖 JOEngine AGI v2.0                        ║
║                                                           ║
║     Advanced Artificial General Intelligence System      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `));

  // إنشاء JOEngine
  const joengine = new JOEngine();

  // معالجة إشارات الإيقاف
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n⚠️  Received SIGINT, shutting down gracefully...'));
    await joengine.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n\n⚠️  Received SIGTERM, shutting down gracefully...'));
    await joengine.stop();
    process.exit(0);
  });

  // بدء JOEngine
  await joengine.start();

  // مثال: إضافة مهمة تجريبية
  console.log(chalk.cyan.bold('📝 Adding demo task...\n'));
  
  await joengine.addTask(
    'Search Google for "latest AI news" and summarize the top 3 results',
    { source: 'demo' }
  );

  // عرض الحالة كل 10 ثواني
  setInterval(() => {
    joengine.printStatus();
  }, 10000);
}

// تشغيل البرنامج
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red.bold('\n❌ Fatal error:'), error);
    process.exit(1);
  });
}

export default JOEngine;

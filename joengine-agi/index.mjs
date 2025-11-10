/**
 * JOEngine AGI - Main Entry Point
 * 
 * نقطة الدخول الرئيسية لتشغيل JOEngine AGI.
 */

import chalk from 'chalk';
import JOEngine from './joengine.mjs';

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

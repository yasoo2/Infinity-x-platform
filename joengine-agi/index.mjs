import { AgiCore } from './AgiCore.mjs';
import chalk from 'chalk';

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

  // Create and initialize AgiCore
  const agiCore = new AgiCore();
  await agiCore.initialize();

  // Handle shutdown signals
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n⚠️  Received SIGINT, shutting down gracefully...'));
    // You might want to add a graceful shutdown method to AgiCore
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n\n⚠️  Received SIGTERM, shutting down gracefully...'));
    // You might want to add a graceful shutdown method to AgiCore
    process.exit(0);
  });

  // Example of generating and executing a plan
  console.log(chalk.cyan.bold('\n🚀 Starting example task...'));

  const task = 'Write a javascript file that prints "hello world" to the console.';
  const plan = await agiCore.generatePlan(task);

  if (plan && plan.length > 0) {
    await agiCore.executePlan(plan);
    console.log(chalk.green.bold('\n✅ Example task finished.'));
  } else {
    console.log(chalk.yellow.bold('\n⚠️  Could not generate a plan for the task.'));
  }
}

// Run the main function
main().catch(error => {
  console.error(chalk.red.bold('\n❌ Fatal error:'), error);
  process.exit(1);
});

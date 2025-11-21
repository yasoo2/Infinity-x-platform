
import { AgiCore } from './AgiCore.mjs';
import { initMongo, closeMongoConnection, getDb } from './src/db.mjs';
import chalk from 'chalk';

const POLLING_INTERVAL = 5000; // Check for new commands every 5 seconds

/**
 * The main worker loop that fetches and processes commands.
 */
async function commandProcessor(agiCore) {
  console.log(chalk.blue('\n👂 Listening for commands...'));

  while (true) {
    const db = getDb();
    const command = await db.collection('joe_commands').findOneAndUpdate(
      { status: 'QUEUED' },
      { $set: { status: 'PROCESSING', startedAt: new Date() } },
      { sort: { createdAt: 1 }, returnDocument: 'after' }
    );

    if (command) {
      console.log(chalk.yellow(`\n⚡ Processing command: ${command._id} - "${command.commandText}"`));

      try {
        // 1. Generate a plan
        const plan = await agiCore.generatePlan(command.commandText);

        let executionResult;
        if (plan && plan.length > 0) {
          // 2. Execute the plan
          executionResult = await agiCore.executePlan(plan);
        } else {
          throw new Error('Failed to generate a plan.');
        }

        // 3. Mark as completed
        await db.collection('joe_commands').updateOne(
          { _id: command._id },
          { 
            $set: {
              status: 'COMPLETED',
              finishedAt: new Date(),
              plan: plan,
              result: executionResult
            }
          }
        );
        console.log(chalk.green(`✅ Command ${command._id} completed successfully.`));

      } catch (error) {
        console.error(chalk.red.bold(`❌ Error processing command ${command._id}:`), error);
        // Mark as failed
        await db.collection('joe_commands').updateOne(
          { _id: command._id },
          { 
            $set: {
              status: 'FAILED',
              finishedAt: new Date(),
              error: error.message
            }
          }
        );
      }
      
    } else {
      // No command found, wait for a bit
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }
  }
}

/**
 * Main Function
 */
async function main() {
  console.log(chalk.cyan.bold(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║              🤖 JOEngine AGI v2.0 - Worker Mode           ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `));

  // Initialize Database
  await initMongo();

  // Create and initialize AgiCore
  const agiCore = new AgiCore();
  await agiCore.initialize();

  // Start the command processor
  commandProcessor(agiCore).catch(error => {
    console.error(chalk.red.bold('\n❌ A critical error occurred in the command processor:'), error);
    // We might want to restart the loop or exit gracefully
    process.exit(1);
  });

  // Handle shutdown signals
  async function gracefulShutdown() {
    console.log(chalk.yellow('\n\n⚠️  Shutting down gracefully...'));
    await closeMongoConnection();
    process.exit(0);
  }

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
}

// Run the main function
main().catch(error => {
  console.error(chalk.red.bold('\n❌ Fatal error during startup:'), error);
  process.exit(1);
});

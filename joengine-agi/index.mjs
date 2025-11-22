import { AgiCore } from './AgiCore.mjs';
import { initMongo, closeMongoConnection, getDb } from './src/db.mjs';

const POLLING_INTERVAL = 5000; // 5 seconds

/**
 * The main worker loop that fetches and processes commands from the database.
 */
async function commandProcessor(agiCore) {
  console.log('Listening for commands...');

  while (true) {
    const db = getDb();
    let command = null;

    try {
      command = await db.collection('joe_commands').findOneAndUpdate(
        { status: 'QUEUED' },
        { $set: { status: 'PROCESSING', startedAt: new Date() } },
        { sort: { createdAt: 1 }, returnDocument: 'after' }
      );
    } catch (dbError) {
      console.error('Database error when fetching command:', dbError);
      // Wait before retrying to avoid spamming the log in case of persistent DB issues
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL * 2));
      continue; // Skip to the next iteration
    }

    if (command) {
      console.log(`Processing command: ${command._id} - "${command.commandText}"`);

      try {
        const plan = await agiCore.generatePlan(command.commandText);

        let executionResult;
        if (plan && plan.length > 0) {
          executionResult = await agiCore.executePlan(plan);
        } else {
          // If no plan was generated, it's a form of failure.
          throw new Error('Failed to generate a valid execution plan.');
        }

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
        console.log(`Command ${command._id} completed successfully.`);

      } catch (error) {
        console.error(`Error processing command ${command._id}:`, error.message);
        // Attempt to mark the command as FAILED in the database
        try {
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
        } catch (updateError) {
            console.error(`CRITICAL: Failed to mark command ${command._id} as FAILED.`, updateError);
        }
      }
      
    } else {
      // No command found, wait for the next polling interval
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }
  }
}

/**
 * Main application entry point.
 */
async function main() {
  console.log("--- JOEngine AGI Worker Initializing ---");

  try {
    // Initialize database connection
    await initMongo();

    // Create and initialize the core AGI logic
    const agiCore = new AgiCore();
    await agiCore.initialize();

    // Start the main command processing loop
    await commandProcessor(agiCore);

  } catch (error) {
    console.error('A critical error occurred in the command processor:', error);
    // Exit gracefully, but with an error code
    await closeMongoConnection().catch(e => console.error('Failed to close DB on exit:', e));
    process.exit(1);
  }
}

// Sets up graceful shutdown hooks
function setupGracefulShutdown() {
    const shutdown = async (signal) => {
        console.log(`\nReceived ${signal}. Shutting down gracefully...`);
        await closeMongoConnection();
        process.exit(0);
    }
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Start the application
setupGracefulShutdown();
main().catch(error => {
  console.error('Fatal error during startup:', error);
  process.exit(1); 
});

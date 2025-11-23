
import { spawn } from 'child_process';
import { runtimeEvolutionService } from './src/services/evolution/runtime-evolution.service.mjs';

// A robust script to run a full, verifiable evolution cycle.

async function main() {
    let serverProcess;

    function cleanup() {
        if (serverProcess) {
            console.log('Terminating server process...');
            serverProcess.kill();
        }
        process.exit();
    }

    process.on('SIGINT', cleanup); // Handle Ctrl+C
    process.on('SIGTERM', cleanup);

    try {
        console.log('Starting evolution script...');

        // 1. Start the server as a child process
        serverProcess = spawn('npm', ['run', 'dev'], { cwd: './', shell: true, stdio: 'pipe' });

        let serverReady = false;
        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[SERVER LOGS]: ${output.trim()}`);
            if (output.includes('Auth setup complete')) { // A reliable indicator the server is ready
                if (!serverReady) {
                    serverReady = true;
                    console.log('Server is ready. Proceeding with evolution.');
                    runEvolutionCycle();
                }
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`[SERVER ERROR]: ${data.toString().trim()}`);
            // If there's an error, especially a startup error, kill the process.
            if (!serverReady) {
                console.error('Server failed to start. Aborting evolution.');
                cleanup();
            }
        });

        serverProcess.on('close', (code) => {
            console.log(`Server process exited with code ${code}`);
        });

        async function runEvolutionCycle() {
            try {
                console.log('\n----------------------------------');
                console.log('🚀 STARTING EVOLUTION CYCLE 🚀');
                console.log('----------------------------------\n');

                const result = await runtimeEvolutionService.evolve();

                console.log('\n----------------------------------');
                console.log('🏁 EVOLUTION CYCLE COMPLETE 🏁');
                console.log('----------------------------------\n');
                console.log('Evolution Result:');
                console.log(JSON.stringify(result, null, 2));

            } catch (e) {
                console.error('An error occurred during the evolution cycle:', e);
            } finally {
                // Evolution is done, clean up the server process
                cleanup();
            }
        }

    } catch (e) {
        console.error('An unexpected error occurred in the main script:', e);
        cleanup();
    }
}

main();

/**
 * 🚀 Joe Standalone Orchestrator - Your Command-Line Agent
 * @version 2.0.0
 * This script is the entry point for running the Joe agent from the command line.
 * It initializes all necessary services, takes a task as input,
 * creates a plan, and executes it using the full suite of available tools.
 *
 * How to Use (after integration):
 * npm run joe -- "Your task description here"
 */

import dotenv from 'dotenv';
dotenv.config();

import toolManager from './src/services/tools/tool-manager.service.mjs';
import { createPlan } from './src/services/ai/ai-engine.service.mjs';

// --- Main Task Acquisition ---
const mainTask = process.argv.slice(2).join(' ');

if (!mainTask) {
    console.error('❌ ERROR: No task provided.');
    console.error('Usage: node backend/joe.mjs "Your task description here"');
    console.error('Or after integration: npm run joe -- "Your task description here"');
    process.exit(1);
}

// --- Main Execution Logic ---
async function main() {
    // 1. Initialize Services
    console.log('🔄 Initializing services...');
    try {
        await toolManager.initialize();
        console.log(`✅ Services initialized. ${toolManager.tools.size} tools ready.`);
    } catch (error) {
        console.error('❌ CRITICAL: Failed to initialize the ToolManager.', error);
        process.exit(1);
    }
    
    console.log('--------------------------------------------------');
    console.log(`🎯 Starting main task: "${mainTask}"`);
    console.log('--------------------------------------------------');

    try {
        // 2. Create a plan
        console.log('🧠 Step 1: Creating a plan...');
        const planResponse = await createPlan(mainTask, {
            workingDirectory: process.cwd()
        });

        if (!planResponse.success || !planResponse.plan || planResponse.plan.length === 0) {
            console.error('❌ Failed to create a valid plan.');
            return;
        }
        
        const plan = planResponse.plan;
        console.log('✅ Plan created successfully:');
        console.log(JSON.stringify(plan, null, 2));
        console.log('--------------------------------------------------');

        // 3. Execute the plan
        console.log('🚀 Step 2: Executing the plan...');
        
        let finalSummary = [];

        for (const step of plan) {
            console.log(`
▶️ Executing Step: ${step.thought}`);
            try {
                const result = await toolManager.execute(step.toolName, step.args);
                finalSummary.push({
                    step: step.thought,
                    tool: step.toolName,
                    args: step.args,
                    status: 'success',
                    result: result
                });
                 console.log(`✔️ Step successful. Result:`, result);
            } catch (e) {
                console.error(`❌ Step failed: ${e.message}`);
                finalSummary.push({
                    step: step.thought,
                    tool: step.toolName,
                    args: step.args,
                    status: 'failure',
                    error: e.message
                });
                // Stop execution on failure
                console.error('📊 Execution Summary:');
                console.error(JSON.stringify(finalSummary, null, 2));
                throw new Error(`Execution stopped due to a failed step: ${step.thought}`);
            }
        }
        
        console.log('--------------------------------------------------');
        console.log('🎉🎉🎉 Main task completed successfully! 🎉🎉🎉');
        console.log('📊 Final Summary:');
        console.log(JSON.stringify(finalSummary, null, 2));

    } catch (error) {
        console.error(`
❌ A critical error occurred in the orchestrator: ${error.message}`);
        process.exit(1);
    }
}

// Start the whole process
main();

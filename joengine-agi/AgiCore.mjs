import { ToolsSystem } from './tools/ToolsSystem.mjs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: './.env' });

/**
 * AgiCore - The central intelligence of the JOEngine AGI.
 *
 * Responsibilities:
 * - Manages the tool system.
 * - Orchestrates task execution.
 * - Generates plans using an LLM (simulated).
 */
class AgiCore {
    constructor() {
        this.toolSystem = new ToolsSystem();
    }

    /**
     * Initializes the AgiCore and its components.
     */
    async initialize() {
        console.log('🤖 Initializing AgiCore...');
        await this.toolSystem.initialize(); // Asynchronously initialize the tool system
        console.log('✅ AgiCore initialized.');
    }

    /**
     * Generates a plan for a given task.
     */
    async generatePlan(task, context) {
        console.log(`[AgiCore] Generating plan for task: "${task}"`);
        const plannerTool = this.toolSystem.getTool('planner');
        if (plannerTool) {
            const result = await plannerTool.execute({ task, context });
            return result.plan;
        } else {
            console.error('PlannerTool is not available to generate a plan.');
            return []; // Return an empty plan if planner is not available
        }
    }

    /**
     * Executes a plan.
     */
    async executePlan(plan) {
        console.log('[AgiCore] Executing plan:', plan);
        let overallResult = { success: true, results: [] };

        for (const step of plan) {
            try {
                console.log(`  -> Executing step: ${step.tool}.${step.action}`);
                const tool = this.toolSystem.getTool(step.tool);
                if (tool) {
                    // Pass both action and params to the tool's execute method
                    const result = await tool.execute({ ...step.params, action: step.action });
                    console.log(`  -> Step result:`, result);
                    overallResult.results.push({ step: step, result: result });
                    if (result.success === false) {
                        console.error(`  -> ❌ Step failed: ${step.tool}.${step.action}`);
                        overallResult.success = false;
                        break; // Stop execution on failure
                    }
                } else {
                    console.error(`  -> ❌ Tool not found: ${step.tool}`);
                    overallResult.success = false;
                    overallResult.results.push({ step: step, result: { success: false, error: `Tool ${step.tool} not found.` } });
                    break;
                }
            } catch (error) {
                console.error(`  -> ❌ Unexpected error during step execution:`, error);
                overallResult.success = false;
                overallResult.results.push({ step: step, result: { success: false, error: error.message } });
                break;
            }
        }

        console.log('[AgiCore] Plan execution finished.');
        return overallResult;
    }
}

// Export the class for explicit instantiation and initialization
export { AgiCore };

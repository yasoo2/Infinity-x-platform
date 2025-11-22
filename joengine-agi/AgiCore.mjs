import { toolsSystem } from './tools/ToolsSystem.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

/**
 * AgiCore - The central intelligence of the JOEngine AGI.
 *
 * This class orchestrates the entire process, from generating a plan
 * for a given task to executing that plan using the available tools.
 */
export class AgiCore {
  constructor() {
    // Use the pre-initialized singleton instance of the ToolsSystem
    this.toolSystem = toolsSystem;
  }

  /**
   * Initializes the AgiCore. This is currently a placeholder as the main
   * initialization logic has been moved to the ToolsSystem singleton.
   */
  async initialize() {
    console.log('Initializing AgiCore...');
    // The tool system is already initialized by the time it's imported.
    console.log('AgiCore initialized successfully.');
  }

  /**
   * Generates an execution plan for a given task by using the planner tool.
   * @param {string} task - The high-level task to be accomplished.
   * @param {object} [context] - Optional context to provide to the planner.
   * @returns {Promise<Array<object>>} A promise that resolves to the generated plan.
   */
  async generatePlan(task, context) {
    console.log(`[AgiCore] Generating plan for task: "${task}"`);
    const plannerTool = this.toolSystem.getTool('planner_tool'); // Using the new tool name

    if (!plannerTool) {
      console.error('Crucial error: PlannerTool is not available. Cannot generate a plan.');
      return [];
    }

    try {
      const result = await plannerTool.execute({ task, context });
      // The planner tool is expected to return an object with a 'plan' property
      if (result && Array.isArray(result.plan)) {
        return result.plan;
      }
      console.warn('Planner tool did not return a valid plan array.', result);
      return [];
    } catch (error) {
      console.error('An error occurred during plan generation:', error);
      return [];
    }
  }

  /**
   * Executes a sequence of steps defined in a plan.
   * @param {Array<object>} plan - An array of steps to execute.
   * @returns {Promise<object>} An object containing the overall result of the execution.
   */
  async executePlan(plan) {
    console.log('[AgiCore] Starting plan execution.');
    const overallResult = { success: true, results: [] };

    for (const step of plan) {
      if (!step.tool || !step.params) {
        console.error('Invalid step in plan. Each step must have a "tool" and "params".', step);
        overallResult.success = false;
        break;
      }

      const tool = this.toolSystem.getTool(step.tool);
      if (!tool) {
        console.error(`Tool not found: "${step.tool}". Aborting plan.`);
        overallResult.success = false;
        overallResult.results.push({ step, result: { success: false, error: `Tool ${step.tool} not found.` } });
        break;
      }

      try {
        console.log(`Executing step: Using tool "${step.tool}" with params:`, step.params);
        
        // The contract is simple: pass the params object directly to the tool's execute method.
        const result = await tool.execute(step.params);

        console.log(`Step finished. Result:`, result);
        overallResult.results.push({ step: step, result: result });

        if (result.success === false) {
          console.error(`Step failed with tool "${step.tool}". Aborting plan.`);
          overallResult.success = false;
          break; // Stop execution on the first failure.
        }

      } catch (error) {
        console.error(`An unexpected error occurred during execution of tool "${step.tool}":`, error);
        overallResult.success = false;
        overallResult.results.push({ step: step, result: { success: false, error: error.message } });
        break;
      }
    }

    console.log(`[AgiCore] Plan execution finished. Final status: ${overallResult.success ? 'Success' : 'Failed'}.`);
    return overallResult;
  }
}

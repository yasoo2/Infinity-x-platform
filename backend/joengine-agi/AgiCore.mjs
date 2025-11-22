
import { ReasoningEngine } from './engines/ReasoningEngine.mjs';
import { ExecutionEngine } from './engines/ExecutionEngine.mjs';

/**
 * AgiCore - The core of the Autonomous General Intelligence engine.
 * This class orchestrates the reasoning and execution engines to accomplish complex tasks.
 */
export class AgiCore {
  constructor(config = {}) {
    this.openaiApiKey = config.openaiApiKey; // Store the API key
    console.log('🤖 AgiCore initialized.');
    
    if (!this.openaiApiKey) {
        console.warn('⚠️ AgiCore initialized without an OpenAI API key. ReasoningEngine will likely fail.');
    }

    // Pass the config to the engines that need it
    this.reasoningEngine = new ReasoningEngine({ openaiApiKey: this.openaiApiKey });
    this.executionEngine = new ExecutionEngine();
  }

  /**
   * Initializes the core systems.
   */
  async initialize() {
    console.log('🤖 AgiCore.initialize() called.');
    return Promise.resolve();
  }

  /**
   * Generates a step-by-step plan to accomplish a given task.
   * @param {string} task - The high-level task to be planned.
   * @returns {Promise<Array<object>>} A promise that resolves to a plan.
   */
  async generatePlan(task) {
    console.log(`🤖 AgiCore.generatePlan() called for: "${task}"`);
    return this.reasoningEngine.createPlan(task);
  }

  /**
   * Executes a given plan.
   * @param {Array<object>} plan - The plan to be executed.
   * @param {Function} stepCallback - A callback function to be invoked after each step.
   * @returns {Promise<void>} A promise that resolves when the plan is fully executed.
   */
  async executePlan(plan, stepCallback) {
    console.log('🤖 AgiCore.executePlan() called.');
    await this.executionEngine.execute(plan, stepCallback);
  }
}

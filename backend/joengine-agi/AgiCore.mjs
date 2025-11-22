
import { ReasoningEngine } from './engines/ReasoningEngine.mjs';
import { ExecutionEngine } from './engines/ExecutionEngine.mjs';

/**
 * AgiCore - The core of the Autonomous General Intelligence engine.
 * This class orchestrates the reasoning and execution engines to accomplish complex tasks.
 */
export class AgiCore {
  constructor() {
    console.log('🤖 AgiCore initialized.');
    // The ReasoningEngine is responsible for understanding tasks and creating plans.
    this.reasoningEngine = new ReasoningEngine();
    // The ExecutionEngine is responsible for carrying out the steps of a plan.
    this.executionEngine = new ExecutionEngine();
  }

  /**
   * Initializes the core systems.
   * In a real implementation, this might involve loading configurations,
   * connecting to services, or warming up models.
   */
  async initialize() {
    console.log('🤖 AgiCore.initialize() called.');
    // For now, initialization is a simple placeholder.
    return Promise.resolve();
  }

  /**
   * Generates a step-by-step plan to accomplish a given task.
   * @param {string} task - The high-level task to be planned.
   * @returns {Promise<Array<object>>} A promise that resolves to a plan, which is an array of steps.
   */
  async generatePlan(task) {
    console.log(`🤖 AgiCore.generatePlan() called for: "${task}"`);
    // Delegate plan generation to the ReasoningEngine.
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
    // Delegate plan execution to the ExecutionEngine.
    await this.executionEngine.execute(plan, stepCallback);
  }
}

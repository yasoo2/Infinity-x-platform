
import ArchitectAgent from '../../agents/ArchitectAgent.mjs';

/**
 * @tool
 * @name create_execution_plan
 * @description Creates a detailed, step-by-step execution plan for a complex user request. Use this for multi-step projects, software development, or complex tasks that require orchestration.
 * @param {string} instruction The high-level user instruction or goal that needs to be broken down into a plan. For example: 'Build a web app for tracking personal fitness'.
 * @returns {object} An object containing the generated plan with an array of steps.
 */
export default {
  schema: {
    type: 'function',
    function: {
      name: 'create_execution_plan',
      description: 'Creates a detailed, step-by-step execution plan for a complex user request. Use this for multi-step projects, software development, or complex tasks that require orchestration.',
      parameters: {
        type: 'object',
        properties: {
          instruction: {
            type: 'string',
            description: 'The high-level user instruction or goal that needs to be broken down into a plan. For example: \'Build a web app for tracking personal fitness\'.'
          }
        },
        required: ['instruction']
      }
    }
  },
  
  /**
   * Executes the tool by calling the ArchitectAgent.
   * @param {object} args - The arguments for the tool.
   * @param {string} args.instruction - The instruction to create a plan for.
   * @returns {Promise<object>} The generated plan.
   */
  async execute({ instruction }) {
    console.log('🏛️ Architect Tool triggered. Generating a plan...');
    return ArchitectAgent.createPlan(instruction);
  }
};

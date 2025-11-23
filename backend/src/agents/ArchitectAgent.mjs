
import { BaseAgent } from './BaseAgent.mjs';
import { AdvancedToolsManager } from '../tools_refactored/AdvancedToolsManager.mjs';

/**
 * 🏛️ Architect Agent
 * Analyzes user requests and creates a detailed, step-by-step execution plan.
 */
class ArchitectAgent extends BaseAgent {
  constructor() {
    // The Architect needs access to ALL tools to create a comprehensive plan.
    const tools = new AdvancedToolsManager();
    super(tools.getAllTools());
    this.role = 'Architect';
    this.goal = 'To analyze user requests, understand the project goals, and create a detailed, step-by-step execution plan that can be executed by other specialized agents.';
  }

  /**
   * Creates a structured plan from a user instruction.
   * @param {string} instruction The user's high-level goal.
   * @returns {Promise<object>} A plan object with a list of steps.
   */
  async createPlan(instruction) {
    const prompt = `
      You are the ${this.role}.
      Your goal is: ${this.goal}

      A user has provided the following instruction: "${instruction}"

      Based on this instruction, create a step-by-step plan to achieve the user's goal.
      For each step, specify the EXACT agent required (e.g., 'developer', 'designer', 'tester') and a clear, concise description of what that agent needs to do.

      The available agents are: developer, designer, tester, security, devops.

      Example Output Format:
      {
        "plan": {
          "steps": [
            { "agent": "developer", "description": "Set up the initial project structure using a standard boilerplate." },
            { "agent": "designer", "description": "Create a color palette and basic UI mockups based on the project description." },
            { "agent": "developer", "description": "Implement the core application logic and API endpoints." },
            { "agent": "tester", "description": "Write and run unit tests for the new API endpoints." },
            { "agent": "devops", "description": "Configure a CI/CD pipeline and deploy the application to a staging environment." }
          ]
        }
      }
    `;

    // Using a simple call to an AI model to generate the plan.
    // In a real system, this would use a more advanced function-calling model.
    const planResponse = await this.llm.call(prompt);
    const planObject = JSON.parse(planResponse.text);

    return planObject.plan;
  }

    /**
     * The Architect's primary execution method is planning.
     * @param {object} details - The instruction details.
     * @param {function} streamUpdate - The streaming function.
     */
    async execute(details, streamUpdate) {
        streamUpdate({ type: 'status', message: 'Architect is starting to draft a plan.' });
        const plan = await this.createPlan(details.instruction);
        streamUpdate({ type: 'status', message: 'Architect has finalized the plan.' });
        return plan;
    }
}

export default ArchitectAgent;


import joeAdvanced from '../services/ai/joe-advanced.service.mjs';

/**
 * 🏛️ Architect Agent - v2.0 "Unified"
 * Creates detailed, step-by-step execution plans by leveraging the core Gemini-Phoenix engine.
 * This agent is now a self-contained service used by the ArchitectTool.
 */
class ArchitectAgent {
  constructor() {
    this.role = 'Architect';
    this.goal = 'To analyze user requests, understand the project goals, and create a detailed, step-by-step execution plan that can be executed by other specialized agents or tools.';
    console.log('🏛️ Architect Agent v2.0 "Unified" Initialized.');
  }

  /**
   * Creates a structured plan from a user instruction.
   * @param {string} instruction The user's high-level goal.
   * @returns {Promise<object>} A plan object with a list of steps.
   */
  async createPlan(instruction) {
    const prompt = `
      You are a world-class AI system architect.
      Your goal is to break down a complex user request into a clear, numbered, step-by-step execution plan.

      The user's request is: "${instruction}"

      Analyze this request and produce a plan. Each step in the plan should be a concise and actionable instruction for another AI agent or a developer.
      The plan should be formatted as a simple numbered list.

      Example:
      1. Set up the initial project structure with a Node.js backend and a React frontend.
      2. Create a database schema for users, products, and orders.
      3. Implement API endpoints for user authentication and product management.
      4. Develop the frontend UI for browsing products and managing the shopping cart.
      5. Deploy the application to a cloud provider.
    `;

    // Use the unified joeAdvanced engine for the thinking process
    // We can even specify a model, like Gemini for complex planning
    const response = await joeAdvanced.processMessage(
      'architect_agent_user', 
      prompt, 
      `architect_plan_${Date.now()}`,
      { model: 'gemini-1.5-pro-latest' } // Using a powerful model for planning
    );

    // Parse the numbered list response into a structured array
    const steps = response.response.split('\n').map(step => step.trim()).filter(step => /^[0-9]+\./.test(step));
    
    return { steps: steps.map(s => ({ description: s.replace(/^[0-9]+\.\s*/, '') })) };
  }
}

// Export a singleton instance
export default new ArchitectAgent();

/**
 * Agents Tool - Bridge to the Multi-Agent System
 * This tool acts as an interface between the core JOE system and the advanced AgentTeam service.
 * @version 1.0.0
 */

import { agentTeam } from '../systems/agent-team.service.mjs';

/**
 * Delegates a complex task to the multi-agent team for execution.
 * @param {object} params - The parameters for the task.
 * @param {string} params.task - The high-level task description for the agent team to handle.
 * @param {string} [params.userId] - The ID of the user requesting the task.
 * @returns {Promise<object>} - The final, consolidated result from the agent team.
 */
async function executeTeamTask({ task, userId }) {
  try {
    console.log(`🤖 Handing off task to Agent Team: "${task}"`);
    const result = await agentTeam.executeTask(task, userId);
    console.log(`✅ Agent Team finished task.`);
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ Agent Team execution failed:', error);
    return { success: false, error: `Agent Team failed: ${error.message}` };
  }
}

executeTeamTask.metadata = {
    name: "executeTeamTask",
    description: "Delegates a complex, high-level task to a specialized team of AI agents (architect, developer, tester, etc.) for comprehensive execution. Use this for tasks requiring multiple steps or expertise, like 'build a full application' or 'design and implement a new feature'.",
    parameters: {
        type: "object",
        properties: {
            task: { 
                type: "string", 
                description: "A clear and comprehensive description of the high-level task to be performed."
            },
            userId: { 
                type: "string", 
                description: "Optional. The user ID to associate with the task."
            }
        },
        required: ["task"]
    }
};

export default { executeTeamTask };

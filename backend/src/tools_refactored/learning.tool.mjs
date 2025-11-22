/**
 * Learning Tool - Bridge to the Continuous Learning System
 * This tool allows the core JOE system to interact with the advanced learning service.
 * @version 1.0.0
 */

import { learningSystem } from '../systems/learning.service.mjs';
import { getDB } from '../services/db.mjs';

/**
 * Records a completed interaction for the learning system to analyze.
 * @param {object} params - The parameters for the learning record.
 * @param {string} params.userId - The user ID.
 * @param {string} params.request - The initial user request.
 * @param {object} params.response - The final response to the user.
 * @param {Array<string>} params.toolsUsed - A list of tools used to fulfill the request.
 * @param {number} params.executionTime - The total execution time in milliseconds.
 * @param {boolean} params.success - Whether the interaction was successful.
 * @returns {Promise<object>} - The result of the learning operation.
 */
async function recordLearning(params) {
  try {
    console.log('🧠 Recording interaction for continuous learning...');
    const result = await learningSystem.learn(params);
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ Learning recording failed:', error);
    return { success: false, error: `Failed to record learning: ${error.message}` };
  }
}

recordLearning.metadata = {
    name: "recordLearning",
    description: "Records a completed user interaction, its outcome, and other metadata to the continuous learning system. This allows the AI to learn from its actions, identify patterns, and improve over time.",
    parameters: {
        type: "object",
        properties: {
            userId: { type: "string", description: "The user ID." },
            request: { type: "string", description: "The initial user request." },
            response: { type: "object", description: "The final response given to the user." },
            toolsUsed: { type: "array", items: { type: "string" }, description: "List of tools used." },
            executionTime: { type: "number", description: "Total execution time in milliseconds." },
            success: { type: "boolean", description: "Was the interaction successful?" }
        },
        required: ["userId", "request", "response", "toolsUsed", "executionTime", "success"]
    }
};

/**
 * Retrieves statistics from the continuous learning system.
 * @returns {Promise<object>} - An object containing learning statistics.
 */
async function getLearningStats() {
    try {
        const db = await getDB();
        const stats = await learningSystem.getStats(db);
        return { success: true, stats };
    } catch (error) {
        console.error('❌ Failed to get learning stats:', error);
        return { success: false, error: `Could not retrieve stats: ${error.message}` };
    }
}

getLearningStats.metadata = {
    name: "getLearningStats",
    description: "Retrieves statistics from the continuous learning system, such as total interactions learned, patterns identified, and current model version.",
    parameters: { type: "object", properties: {} }
};


export default { recordLearning, getLearningStats };

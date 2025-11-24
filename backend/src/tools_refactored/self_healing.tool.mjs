/**
 * Self-Healing Tool - Bridge to the Self-Healing System
 * @version 1.0.0
 */

import { selfHealingSystem } from '../systems/self-healing.service.mjs';

/**
 * Reports a runtime error to the self-healing system for analysis and potential automated fixing.
 * @param {object} params - The parameters for error reporting.
 * @param {object} params.error - The error object that was caught.
 * @param {object} params.context - Additional context about the state of the application when the error occurred.
 * @returns {Promise<object>} - An object containing the result of the healing attempt.
 */
async function reportError({ error, context }) {
  try {
    console.log('[HEALING] Reporting error to self-healing system...');
    // The error object might not be serializable, so we extract key properties.
    const serializableError = { 
        message: error.message, 
        stack: error.stack, 
        name: error.name 
    };
    const result = await selfHealingSystem.handleSystemError(serializableError, context);
    return { success: true, ...result };
  } catch (e) {
    console.error('[ERROR] Self-healing system itself failed:', e);
    return { success: false, error: `The self-healing system encountered a fatal error: ${e.message}` };
  }
}

reportError.metadata = {
    name: "reportError",
    description: "Reports a runtime error to the self-healing system. The system will analyze the error, attempt to generate a fix, and apply it automatically. Use this when the application encounters an unexpected error.",
    parameters: {
        type: "object",
        properties: {
            error: { 
                type: "object", 
                description: "The error object, including message and stack trace."
            },
            context: { 
                type: "object", 
                description: "An object providing context, such as the file path (filePath), the operation being performed, and user ID."
            }
        },
        required: ["error", "context"]
    }
};


export default { reportError };

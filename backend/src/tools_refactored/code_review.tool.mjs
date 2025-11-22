/**
 * Code Review Tool - Bridge to the Intelligent Code Review System
 * @version 1.0.0
 */

import { codeReviewSystem } from '../systems/code-review.service.mjs';

/**
 * Performs a comprehensive, AI-driven review of a given code snippet.
 * @param {object} params - The parameters for the code review.
 * @param {string} params.code - The code snippet to be reviewed.
 * @param {string} params.language - The programming language of the code (e.g., 'javascript', 'python').
 * @returns {Promise<object>} - An object containing the full review report.
 */
async function reviewCode({ code, language }) {
  try {
    console.log(`🤖 Starting AI code review for ${language}...`);
    const result = await codeReviewSystem.reviewCode(code, language);
    return { success: true, review: result };
  } catch (error) {
    console.error('❌ Code review failed:', error);
    return { success: false, error: `Failed to review code: ${error.message}` };
  }
}

reviewCode.metadata = {
    name: "reviewCode",
    description: "Performs a comprehensive, AI-driven review of a code snippet, checking for security vulnerabilities, performance bottlenecks, and quality issues. Provides a score, a list of issues, and suggestions for improvement.",
    parameters: {
        type: "object",
        properties: {
            code: { 
                type: "string", 
                description: "The source code to be reviewed."
            },
            language: { 
                type: "string", 
                description: "The programming language of the code, e.g., 'javascript', 'python', 'java'."
            }
        },
        required: ["code", "language"]
    }
};


export default { reviewCode };

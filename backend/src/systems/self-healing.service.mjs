/**
 * [Self-Healing System]
 * Proactively detects and fixes errors.
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import { codeReviewSystem } from './code-review.service.mjs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class SelfHealingSystem {

  async handleSystemError(error, context = {}) {
    console.error('[Self-Healing] An error was caught by the Self-Healing System:', error);

    // 1. Analyze the error
    const analysis = await this.analyzeError(error, context);

    // 2. Generate potential solutions
    const solutions = await this.generateSolutions(error, analysis);

    // 3. Select the best solution
    const bestSolution = this.selectBestSolution(solutions);

    // 4. Attempt to apply the fix
    if (bestSolution) {
      const result = await this.applyFix(bestSolution, context);
      return { success: true, fixApplied: result, analysis };
    } else {
      console.log('[Self-Healing] No suitable solution found. Escalating...');
      return { success: false, fixApplied: null, analysis, escalation: 'A manual review is required.' };
    }
  }

  async analyzeError(error, context) {
    const prompt = `
    Analyze the following runtime error to determine its root cause. I need a detailed analysis in JSON format.

    Error Message: ${error.message}
    Stack Trace:
    ${error.stack}
    
    Context (what was happening when the error occurred):
    ${JSON.stringify(context, null, 2)}

    Respond with JSON: {"rootCause": "...", "impact": "...", "fileName": "...", "lineNumber": ..., "confidence": 0.9}
    `;
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are an expert error analysis AI.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' }
        });
        return JSON.parse(response.choices[0].message.content);
    } catch(e) {
        console.error("Error during analysis:", e);
        return { rootCause: 'Analysis failed', impact: 'Unknown' };
    }
  }

  async generateSolutions(error, analysis) {
    const prompt = `
    Based on this error analysis, propose several potential solutions. For each solution, provide the code fix and a confidence score.

    Analysis: ${JSON.stringify(analysis, null, 2)}
    Original Error: ${error.message}

    Respond with JSON: {"solutions": [{"description": "...", "codeFix": "...", "confidence": 0.85, "type": "code_patch" | "config_change" | "restart"}]}
    `;
     const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are an expert software engineer specialized in debugging and fixing errors.' },
            { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
    });
    return JSON.parse(response.choices[0].message.content).solutions || [];
  }

  selectBestSolution(solutions) {
    return solutions.reduce((best, current) => (current.confidence > (best?.confidence || 0) ? current : best), null);
  }

  async applyFix(solution, context) {
    console.log(`[Self-Healing] Applying fix: ${solution.description}`);
    if (solution.type === 'code_patch' && context.filePath) {
        try {
            const originalCode = await fs.readFile(context.filePath, 'utf-8');
            // This is a simplified application. A real system would use a more robust patching mechanism.
            // For this example, we'll assume the AI returns the *entire* corrected file content.
            const newCode = solution.codeFix;

            // Let's get a quick review before applying
            const review = await codeReviewSystem.reviewCode(newCode, context.language || 'javascript');
            if (review.score < 70) {
                console.warn('[Self-Healing] Proposed fix has low quality score. Aborting.', review.issues);
                return { applied: false, reason: 'Low quality score on fix.' };
            }
            
            // Create a backup
            await fs.writeFile(`${context.filePath}.bak`, originalCode);

            // Write the new code
            await fs.writeFile(context.filePath, newCode);
            console.log(`[Self-Healing] ✅ Successfully patched file: ${context.filePath}`);
            return { applied: true, filePath: context.filePath };
        } catch(e) {
            console.error('[Self-Healing] ❌ Failed to apply code patch:', e);
            return { applied: false, reason: e.message };
        }
    }
    // Handle other fix types like 'restart' or 'config_change'
    return { applied: false, reason: 'Fix type not implemented yet.' };
  }
}

export const selfHealingSystem = new SelfHealingSystem();

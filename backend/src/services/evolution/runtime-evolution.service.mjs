
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Import existing tools
import { githubTools } from './githubTools.mjs';
import { testingTools } from './testingTools.mjs';
import { renderTools } from './renderTools.mjs';
// Import the NEW V2 capability evolution service
import { analyzeCodebase, suggestImprovements } from './capability-evolution.service.mjs';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Navigate up to the project root from 'backend/src/services/evolution'
const projectRoot = path.resolve(__dirname, '../../../../'); 

/**
 * Self-Evolution and Orchestration Service for JOE - V2.1 (Patched)
 * This service coordinates analyzing the codebase, identifying improvements, and IMPLEMENTING them.
 */
class RuntimeEvolutionService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("[RuntimeEvolution-V2.1] WARNING: GEMINI_API_KEY is not set. AI features will be disabled.");
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    this.repoOwner = 'user';
    this.repoName = 'Infinity-x-platform';
    this.renderServiceId = process.env.RENDER_SERVICE_ID || 'srv-xxxxxxxxxxxx';
  }

  async analyzeOwnCode() {
    console.log('🔬 [V2.1] Analyzing own code using REAL analysis engine...');
    try {
      const analysis = await analyzeCodebase({ projectPath: projectRoot });
      console.log('✅ [V2.1] Code analysis complete.');
      return { success: true, analysis };
    } catch (error) {
      console.error('❌ [V2.1] Code analysis failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async identifyImprovements() {
    console.log('💡 [V2.1] Identifying STRATEGIC improvements...');
    try {
      const codeAnalysisResult = await this.analyzeOwnCode();
      if (!codeAnalysisResult.success) return codeAnalysisResult;

      const suggestionsResult = await suggestImprovements({ analysis: codeAnalysisResult.analysis });
      const diagnosticResult = await testingTools.runDiagnostic();

      const improvements = suggestionsResult.suggestions.map(s => ({ 
        type: 'refactor',
        priority: 'medium',
        description: s,
      }));

      console.log(`✅ [V2.1] Identified ${improvements.length} potential improvements.`);
      return { success: true, improvements, count: improvements.length, diagnostic: diagnosticResult };

    } catch (error) {
      console.error('❌ [V2.1] Failed to identify improvements:', error.message);
      return { success: false, error: error.message };
    }
  }

  async implementImprovement(improvement) {
    console.log(`🔧 [V2.1] Attempting REAL implementation for: \"${improvement.description}\"`);
    if (!improvement || !improvement.description) {
        return { success: false, error: "Invalid improvement object" };
    }

    const filePathMatch = improvement.description.match(/in '([^']+)'/);
    if (!filePathMatch || !filePathMatch[1]) {
        return { success: false, error: `Could not extract file path from description: \"${improvement.description}\"` };
    }
    const relativeFilePath = filePathMatch[1];
    const absoluteFilePath = path.join(projectRoot, relativeFilePath);

    try {
      const originalCode = await fs.readFile(absoluteFilePath, 'utf-8');
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        **Objective:** Execute a surgical refactoring of the provided code based on the following instruction.
        
        **Instruction:** ${improvement.description}

        **Strict Rules (Non-negotiable):**
        1. You will act as a surgical code modifier. You will only add or modify code to fulfill the instruction. 
        2. You MUST NOT delete any existing code, even if it seems unused or redundant, unless the instruction explicitly says to remove something.
        3. The output MUST be the complete, modified code for the entire file. Do not provide only the changed snippet.
        4. Preserve the original code's structure, style, and comments as much as possible.
        5. Your response will be a single, raw code block, without any preamble, explanation, or markdown formatting.

        **Original Code (File: ${relativeFilePath}):**
        \`\`\`javascript
        ${originalCode}
        \`\`\`

        **Your Modified Code:**
      `;

      console.log(`[V2.1] Sending surgical modification request to AI for ${relativeFilePath}...`);
      const result = await model.generateContent(prompt);
      let modifiedCode = result.response.text();

      // **SYNTAX FIX APPLIED HERE**
      // Correctly remove the markdown code fences.
      modifiedCode = modifiedCode.replace(/^\`\`\`(javascript)?\n|\`\`\`$/g, '').trim();

      if (modifiedCode.length < originalCode.length * 0.5) {
        throw new Error('Safety check failed: Proposed change would delete over 50% of the original file. Aborting.');
      }

      await fs.writeFile(absoluteFilePath, modifiedCode, 'utf-8');

      console.log(`✅ [V2.1] Successfully implemented changes in ${relativeFilePath}`);
      return { success: true, file: relativeFilePath, changesApplied: true };

    } catch (error) {
      console.error(`❌ [V2.1] Failed to implement improvement in ${relativeFilePath}:`, error);
      return { success: false, error: error.message };
    }
  }

  async evolve() {
    console.log('🚀 [V2.1] Starting REAL evolution cycle (Patched)...');
    try {
      const improvementsResult = await this.identifyImprovements();
      if (!improvementsResult.success || improvementsResult.count === 0) {
        console.log('✅ [V2.1] No improvements needed at this time.');
        return { success: true, message: 'No improvements needed', ...improvementsResult };
      }

      const topImprovement = improvementsResult.improvements[0];
      const implementationResult = await this.implementImprovement(topImprovement);
      
      if (!implementationResult.success) {
          return { ...implementationResult, step: 'implementation' };
      }

      console.log('📝 [V2.1] TODO: Add a real git commit step here.');
      console.log('🚀 [V2.1] Triggering mock deployment on Render...');
      const deployResult = await renderTools.deployService({ serviceId: this.renderServiceId });

      console.log('🧪 [V2.1] Running integration tests post-deployment...');
      const testResult = await testingTools.runIntegrationTests();

      const finalMessage = `JOE has truly evolved! Implemented: '${topImprovement.description}'. Deployment status: ${deployResult.status}. Tests passed: ${testResult.passed}.`;
      console.log(`✅ ${finalMessage}`);
      
      return {
        success: true,
        message: finalMessage,
        improvement: topImprovement,
        implementation: implementationResult,
        deploy: deployResult,
        testResult,
      };

    } catch (error) {
      console.error('❌ [V2.1] Evolution cycle failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export const runtimeEvolutionService = new RuntimeEvolutionService();
export default RuntimeEvolutionService;

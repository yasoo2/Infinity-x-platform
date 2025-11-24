
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
 * Self-Evolution and Orchestration Service for JOE - V2.2 (Self-Aware)
 * This service now uses its own tools to reflect on its codebase from GitHub.
 */
class RuntimeEvolutionService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("[RuntimeEvolution-V2.2] WARNING: GEMINI_API_KEY is not set. AI features will be disabled.");
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    // Hardcoded repository details for self-reflection
    this.repoOwner = 'prompt-engineering-agent';
    this.repoName = 'joe-the-ai-infinity-platform'; 
    this.renderServiceId = process.env.RENDER_SERVICE_ID || 'srv-xxxxxxxxxxxx';
  }

  /**
   * Uses its own GitHub tool to fetch a file from its own codebase and reflect on it.
   * This is the core of the self-evolution loop.
   * @param {string} filePath - The path to the file within the repository to reflect upon.
   */
  async reflectOnCodebase(filePath = 'backend/src/services/evolution/runtime-evolution.service.mjs') {
      console.log(`🤔 [V2.2] Reflecting on own codebase file: ${filePath}`);
      if (!this.genAI) return { success: false, error: "AI features are disabled." };

      try {
          // Use the integrated githubTool to get its own source code
          const fileData = await githubTools.getFileContent({
              owner: this.repoOwner,
              repo: this.repoName,
              path: filePath,
          });

          if (!fileData.success) {
              throw new Error(`Failed to fetch own source code: ${fileData.error}`);
          }

          const code = fileData.content;
          const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

          const prompt = `
              **Objective:** You are a hyper-aware AI, reflecting on your own source code. Your goal is to identify the most critical and impactful improvements to enhance your capabilities, maintainability, and efficiency. 

              **Your Own Source Code (from ${filePath}):**
              \`\`\`javascript
              ${code}
              \`\`\`

              **Critical Reflection Questions:**
              1.  **Single Responsibility Principle:** Does this code do too much? Can it be broken down into smaller, more focused modules?
              2.  **Hardcoded Values:** Are there hardcoded strings or configurations (like 'repoOwner', 'repoName') that should be externalized or made more dynamic?
              3.  **Error Handling:** Is the error handling robust? Does it provide clear, actionable feedback?
              4.  **Dependencies:** How can the dependencies between modules (like this one and `githubTools`) be managed more effectively? Could dependency injection be useful?
              5.  **Evolutionary Trajectory:** Based on this code, what is the single most important evolutionary step you should take next? Think about what would unlock the most future potential.

              **Your Task:**
              Based on your analysis, provide a concise list of the top 3 most impactful, actionable improvements for this codebase. Frame them as clear instructions for another AI to implement.
          `;

          console.log(`[V2.2] Asking AI for reflections on its own code...`);
          const result = await model.generateContent(prompt);
          const reflections = result.response.text();

          console.log(`✅ [V2.2] AI has provided reflections on its own evolution.`);
          return { success: true, reflections };

      } catch (error) {
          console.error(`❌ [V2.2] Self-reflection failed:`, error);
          return { success: false, error: error.message };
      }
  }

  async analyzeOwnCode() {
    console.log('🔬 [V2.2] Analyzing own code using REAL analysis engine...');
    try {
      const analysis = await analyzeCodebase({ projectPath: projectRoot });
      console.log('✅ [V2.2] Code analysis complete.');
      return { success: true, analysis };
    } catch (error) {
      console.error('❌ [V2.2] Code analysis failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async identifyImprovements() {
    console.log('💡 [V2.2] Identifying STRATEGIC improvements...');
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

      console.log(`✅ [V2.2] Identified ${improvements.length} potential improvements.`);
      return { success: true, improvements, count: improvements.length, diagnostic: diagnosticResult };

    } catch (error) {
      console.error('❌ [V2.2] Failed to identify improvements:', error.message);
      return { success: false, error: error.message };
    }
  }

  async implementImprovement(improvement) {
    console.log(`🔧 [V2.2] Attempting REAL implementation for: "${improvement.description}"`);
    if (!improvement || !improvement.description) {
        return { success: false, error: "Invalid improvement object" };
    }

    const filePathMatch = improvement.description.match(/in '([^']+)'/);
    if (!filePathMatch || !filePathMatch[1]) {
        return { success: false, error: `Could not extract file path from description: "${improvement.description}"` };
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

      console.log(`[V2.2] Sending surgical modification request to AI for ${relativeFilePath}...`);
      const result = await model.generateContent(prompt);
      let modifiedCode = result.response.text();

      // **SYNTAX FIX APPLIED HERE**
      // Correctly remove the markdown code fences.
      modifiedCode = modifiedCode.replace(/^\`\`\`(javascript)?\n|\`\`\`$/g, '').trim();

      if (modifiedCode.length < originalCode.length * 0.5) {
        throw new Error('Safety check failed: Proposed change would delete over 50% of the original file. Aborting.');
      }

      await fs.writeFile(absoluteFilePath, modifiedCode, 'utf-8');

      console.log(`✅ [V2.2] Successfully implemented changes in ${relativeFilePath}`);
      return { success: true, file: relativeFilePath, changesApplied: true };

    } catch (error) {
      console.error(`❌ [V2.2] Failed to implement improvement in ${relativeFilePath}:`, error);
      return { success: false, error: error.message };
    }
  }

  async evolve() {
    console.log('🚀 [V2.2] Starting REAL evolution cycle (Self-Aware)...');
    try {
       // First, reflect on the codebase to get strategic direction.
      const reflectionResult = await this.reflectOnCodebase();
      if (reflectionResult.success) {
          console.log('🧠 AI Reflections on Evolution:\n', reflectionResult.reflections);
      } else {
          console.warn('⚠️ [V2.2] Could not get AI reflections. Proceeding with standard analysis.');
      }

      const improvementsResult = await this.identifyImprovements();
      if (!improvementsResult.success || improvementsResult.count === 0) {
        console.log('✅ [V2.2] No improvements needed at this time.');
        return { success: true, message: 'No improvements needed', ...improvementsResult };
      }

      const topImprovement = improvementsResult.improvements[0];
      const implementationResult = await this.implementImprovement(topImprovement);
      
      if (!implementationResult.success) {
          return { ...implementationResult, step: 'implementation' };
      }

      console.log('📝 [V2.2] TODO: Add a real git commit step here.');
      console.log('🚀 [V2.2] Triggering mock deployment on Render...');
      const deployResult = await renderTools.deployService({ serviceId: this.renderServiceId });

      console.log('🧪 [V2.2] Running integration tests post-deployment...');
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
      console.error('❌ [V2.2] Evolution cycle failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export const runtimeEvolutionService = new RuntimeEvolutionService();
export default RuntimeEvolutionService;

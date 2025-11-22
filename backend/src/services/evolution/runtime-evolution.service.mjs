
import { GoogleGenerativeAI } from '@google/generative-ai';
import { githubTools } from './githubTools.mjs';
import { testingTools } from './testingTools.mjs';
import { renderTools } from './renderTools.mjs';
import { analyzeCodebase, suggestImprovements as suggestCodeImprovements } from './capability-evolution.service.mjs';
import path from 'path';

const __dirname = path.resolve(path.dirname(''));

/**
 * Self-Evolution and Orchestration Service for JOE
 * This service coordinates analyzing the codebase, identifying improvements, and simulating implementation.
 */

class RuntimeEvolutionService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("[RuntimeEvolution] WARNING: GEMINI_API_KEY is not set. AI-based features will be disabled.");
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    // Basic repo info - in a real app, this would be more dynamic
    this.repoOwner = 'user'; 
    this.repoName = 'Infinity-x-platform';
    this.renderServiceId = process.env.RENDER_SERVICE_ID || 'srv-xxxxxxxxxxxx'; // Placeholder
  }

  /**
   * Analyzes the current codebase using the local file system.
   */
  async analyzeOwnCode() {
    console.log('🔬 Analyzing own code using local file structure...');
    try {
      // Use the more realistic capability-evolution service
      const analysis = await analyzeCodebase({ projectPath: __dirname });
      
      console.log('✅ Code analysis complete');
      return { success: true, analysis };
    } catch (error) {
      console.error('❌ Code analysis failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Identifies potential improvements based on code analysis and diagnostics.
   */
  async identifyImprovements() {
    console.log('💡 Identifying improvements...');
    try {
      const codeAnalysisResult = await this.analyzeOwnCode();
      if (!codeAnalysisResult.success) {
        return codeAnalysisResult;
      }

      // Use the suggestion engine from the other service
      const suggestionsResult = await suggestCodeImprovements({ analysis: codeAnalysisResult.analysis });
      const diagnosticResult = await testingTools.runDiagnostic();

      const improvements = suggestionsResult.suggestions.map(s => ({ 
        type: 'quality',
        priority: 'low',
        issue: s,
      }));

      console.log(`✅ Identified ${improvements.length} potential improvements.`);
      return {
        success: true,
        improvements,
        count: improvements.length,
        diagnostic: diagnosticResult,
      };

    } catch (error) {
      console.error('❌ Failed to identify improvements:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Simulates implementing an improvement by creating a mock commit.
   * @param {object} improvement - The improvement to implement.
   */
  async implementImprovement(improvement) {
    console.log(`🔧 Simulating implementation for: ${improvement.issue}`);
    if (!improvement || !improvement.issue) {
        return { success: false, error: "Invalid improvement object" };
    }

    try {
      const commitMessage = `JOE Self-Evolution (Mock): ${improvement.type} - ${improvement.issue}`;
      
      // Use the updated githubTools to create a mock commit
      const commitResult = await githubTools.createCommit({
        owner: this.repoOwner,
        repo: this.repoName,
        message: commitMessage,
        files: [{ path: "src/services/evolution/runtime-evolution.service.mjs", content: "// Mock file content" }]
      });

      console.log('✅ Mock implementation complete via commit.');
      return {
        success: true,
        commit: commitResult,
      };
    } catch (error) {
      console.error('❌ Failed to simulate implementation:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * The main orchestration logic for an evolution cycle.
   */
  async evolve() {
    console.log('🚀 Starting evolution cycle...');
    try {
      const improvementsResult = await this.identifyImprovements();
      if (!improvementsResult.success || improvementsResult.count === 0) {
        console.log('✅ No improvements needed at this time.');
        return { success: true, message: 'No improvements needed', ...improvementsResult };
      }

      const topImprovement = improvementsResult.improvements[0];
      const implementationResult = await this.implementImprovement(topImprovement);
      if (!implementationResult.success) {
          return { ...implementationResult, step: 'implement' };
      }
      
      console.log('🚀 Triggering mock deployment on Render...');
      // Use the updated renderTools function
      const deployResult = await renderTools.deployService({ serviceId: this.renderServiceId });

      console.log('🧪 Running integration tests post-deployment...');
      const testResult = await testingTools.runIntegrationTests();

      const finalMessage = `JOE has evolved! Implemented: '${topImprovement.issue}'. Deployment status: ${deployResult.status}. Tests passed: ${testResult.passed}.`;
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
      console.error('❌ Evolution cycle failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export a singleton instance
export const runtimeEvolutionService = new RuntimeEvolutionService();
export default RuntimeEvolutionService;

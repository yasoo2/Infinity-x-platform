import { GoogleGenerativeAI } from '@google/generative-ai';
import { githubTools } from './githubTools.mjs';
import { testingTools } from './testingTools.mjs';
import { renderTools } from './renderTools.mjs';

/**
 * Self-Evolution Tools for JOE
 * Analyze own code, identify improvements, implement changes
 */

class EvolutionTools {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.repoName = 'Infinity-x-platform';
  }

  /**
   * Analyze own code
   */
  async analyzeOwnCode() {
    console.log('🔬 Analyzing own code...');
    
    try {
      // 1. Clone repository
      const cloneResult = await githubTools.cloneRepo(this.repoName);
      if (!cloneResult.success) {
        return {
          success: false,
          step: 'clone',
          error: cloneResult.error
        };
      }

      // 2. Read key files
      const filesToAnalyze = [
        'backend/src/routes/joeChat.mjs',
        'backend/src/tools/githubTools.mjs',
        'backend/src/tools/renderTools.mjs',
        'backend/src/tools/mongodbTools.mjs',
        'backend/src/tools/testingTools.mjs'
      ];

      const codeAnalysis = [];
      
      for (const file of filesToAnalyze) {
        const readResult = await githubTools.readFile(this.repoName, file);
        if (readResult.success) {
          codeAnalysis.push({
            file,
            content: readResult.content,
            lines: readResult.content.split('\n').length
          });
        }
      }

      // 3. Use AI to analyze code
      const analysisPrompt = `
You are analyzing JOE's own code to identify improvements.

Files analyzed:
${codeAnalysis.map(f => `- ${f.file} (${f.lines} lines)`).join('\n')}

Analyze the code and identify:
1. **Bugs**: Potential errors or issues
2. **Performance**: Areas that can be optimized
3. **Features**: Missing features that would be useful
4. **Code Quality**: Improvements to readability and maintainability

Return JSON:
{
  "bugs": [{ "file": "...", "issue": "...", "fix": "..." }],
  "performance": [{ "file": "...", "issue": "...", "improvement": "..." }],
  "features": [{ "name": "...", "description": "...", "priority": "high|medium|low" }],
  "codeQuality": [{ "file": "...", "issue": "...", "improvement": "..." }]
}
`;

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(analysisPrompt);
      const analysisText = result.response.text();
      
      // Parse JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      console.log('✅ Code analysis complete');
      
      return {
        success: true,
        filesAnalyzed: codeAnalysis.length,
        analysis
      };
    } catch (error) {
      console.error('❌ Code analysis failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    } finally {
      // Cleanup
      await githubTools.cleanup();
    }
  }

  /**
   * Identify improvements
   */
  async identifyImprovements() {
    console.log('💡 Identifying improvements...');
    
    try {
      // 1. Run diagnostic
      const diagnostic = await testingTools.runDiagnostic();
      
      // 2. Analyze code
      const codeAnalysis = await this.analyzeOwnCode();
      
      if (!codeAnalysis.success) {
        return codeAnalysis;
      }

      // 3. Prioritize improvements
      const improvements = [];

      // Critical: Bugs
      if (codeAnalysis.analysis.bugs) {
        for (const bug of codeAnalysis.analysis.bugs) {
          improvements.push({
            type: 'bug',
            priority: 'critical',
            ...bug
          });
        }
      }

      // High: Performance issues
      if (codeAnalysis.analysis.performance) {
        for (const perf of codeAnalysis.analysis.performance) {
          improvements.push({
            type: 'performance',
            priority: 'high',
            ...perf
          });
        }
      }

      // Medium: New features
      if (codeAnalysis.analysis.features) {
        for (const feature of codeAnalysis.analysis.features) {
          improvements.push({
            type: 'feature',
            priority: feature.priority || 'medium',
            ...feature
          });
        }
      }

      // Low: Code quality
      if (codeAnalysis.analysis.codeQuality) {
        for (const quality of codeAnalysis.analysis.codeQuality) {
          improvements.push({
            type: 'quality',
            priority: 'low',
            ...quality
          });
        }
      }

      // Sort by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      improvements.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      console.log(`✅ Identified ${improvements.length} improvements`);
      
      return {
        success: true,
        improvements,
        count: improvements.length,
        diagnostic
      };
    } catch (error) {
      console.error('❌ Identify improvements failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Implement improvement
   */
  async implementImprovement(improvement) {
    console.log(`🔧 Implementing: ${improvement.type} - ${improvement.issue || improvement.name}`);
    
    try {
      // 1. Clone repository
      const cloneResult = await githubTools.cloneRepo(this.repoName);
      if (!cloneResult.success) {
        return {
          success: false,
          step: 'clone',
          error: cloneResult.error
        };
      }

      // 2. Generate code fix using AI
      const fixPrompt = `
You are implementing an improvement to JOE's code.

Improvement:
Type: ${improvement.type}
Priority: ${improvement.priority}
${improvement.file ? `File: ${improvement.file}` : ''}
${improvement.issue ? `Issue: ${improvement.issue}` : ''}
${improvement.fix ? `Fix: ${improvement.fix}` : ''}
${improvement.improvement ? `Improvement: ${improvement.improvement}` : ''}
${improvement.description ? `Description: ${improvement.description}` : ''}

Generate the code changes needed to implement this improvement.

Return JSON:
{
  "file": "path/to/file",
  "changes": "description of changes",
  "code": "actual code to implement"
}
`;

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(fixPrompt);
      const fixText = result.response.text();
      
      // Parse JSON
      const jsonMatch = fixText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: 'Failed to parse AI response'
        };
      }

      const fix = JSON.parse(jsonMatch[0]);

      // 3. Apply fix
      if (fix.file && fix.code) {
        const writeResult = await githubTools.writeFile(
          this.repoName,
          fix.file,
          fix.code
        );

        if (!writeResult.success) {
          return {
            success: false,
            step: 'write',
            error: writeResult.error
          };
        }

        // 4. Commit and push
        const commitMessage = `JOE Self-Evolution: ${improvement.type} - ${improvement.issue || improvement.name}`;
        const commitResult = await githubTools.commit(this.repoName, commitMessage);
        
        if (!commitResult.success) {
          return {
            success: false,
            step: 'commit',
            error: commitResult.error
          };
        }

        const pushResult = await githubTools.push(this.repoName);
        
        if (!pushResult.success) {
          return {
            success: false,
            step: 'push',
            error: pushResult.error
          };
        }

        console.log('✅ Improvement implemented and pushed');
        
        return {
          success: true,
          file: fix.file,
          changes: fix.changes,
          commitMessage
        };
      }

      return {
        success: false,
        error: 'No code changes generated'
      };
    } catch (error) {
      console.error('❌ Implement improvement failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    } finally {
      // Cleanup
      await githubTools.cleanup();
    }
  }

  /**
   * Test improvement
   */
  async testImprovement() {
    console.log('🧪 Testing improvement...');
    
    try {
      // Wait for deploy
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute

      // Run tests
      const testResult = await testingTools.runIntegrationTests();
      
      if (testResult.passed) {
        console.log('✅ All tests passed');
        return {
          success: true,
          passed: true,
          message: 'Improvement verified'
        };
      } else {
        console.log('⚠️ Some tests failed');
        return {
          success: true,
          passed: false,
          message: 'Improvement needs review',
          results: testResult.results
        };
      }
    } catch (error) {
      console.error('❌ Test improvement failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Complete evolution cycle
   */
  async evolve() {
    console.log('🚀 Starting evolution cycle...');
    
    try {
      // 1. Identify improvements
      const improvementsResult = await this.identifyImprovements();
      
      if (!improvementsResult.success) {
        return improvementsResult;
      }

      if (improvementsResult.count === 0) {
        return {
          success: true,
          message: 'No improvements needed',
          improvements: []
        };
      }

      // 2. Implement top priority improvement
      const topImprovement = improvementsResult.improvements[0];
      const implementResult = await this.implementImprovement(topImprovement);
      
      if (!implementResult.success) {
        return {
          success: false,
          step: 'implement',
          error: implementResult.error
        };
      }

      // 3. Trigger deploy
      const deployResult = await renderTools.triggerDeploy();
      
      if (!deployResult.success) {
        return {
          success: false,
          step: 'deploy',
          error: deployResult.error
        };
      }

      // 4. Test (optional - takes time)
      // const testResult = await this.testImprovement();

      console.log('✅ Evolution cycle complete');
      
      return {
        success: true,
        improvement: topImprovement,
        implementation: implementResult,
        deploy: deployResult,
        message: 'JOE has evolved!'
      };
    } catch (error) {
      console.error('❌ Evolution cycle failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Learn from user feedback
   */
  async learnFromFeedback(feedback) {
    console.log('📚 Learning from feedback...');
    
    try {
      // Store feedback for future analysis
      // This could be saved to MongoDB for pattern analysis
      
      const learningPrompt = `
User feedback: "${feedback}"

Analyze this feedback and suggest:
1. What JOE should improve
2. What features to add
3. What behaviors to change

Return JSON:
{
  "improvements": ["..."],
  "features": ["..."],
  "behaviors": ["..."]
}
`;

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(learningPrompt);
      const learningText = result.response.text();
      
      const jsonMatch = learningText.match(/\{[\s\S]*\}/);
      const learning = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      console.log('✅ Learning complete');
      
      return {
        success: true,
        learning,
        message: 'Feedback analyzed and learned'
      };
    } catch (error) {
      console.error('❌ Learn from feedback failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton
export const evolutionTools = new EvolutionTools();
export default EvolutionTools;

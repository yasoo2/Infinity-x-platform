
/**
 * 🤖 Multi-Agent System - The core team of specialized agents.
 * This system coordinates a team of expert AI agents to execute complex tasks.
 * @version 1.0.0
 */

// Import agent classes (will be created in subsequent steps)
import ArchitectAgent from '../agents/ArchitectAgent.mjs';
import DeveloperAgent from '../agents/DeveloperAgent.mjs';
import DesignerAgent from '../agents/DesignerAgent.mjs';
import TesterAgent from '../agents/TesterAgent.mjs';
import SecurityAgent from '../agents/SecurityAgent.mjs';
import DevOpsAgent from '../agents/DevOpsAgent.mjs';
import AnalystAgent from '../agents/AnalystAgent.mjs';
import WriterAgent from '../agents/WriterAgent.mjs';
import ResearcherAgent from '../agents/ResearcherAgent.mjs';
import OptimizerAgent from '../agents/OptimizerAgent.mjs';
import CoordinatorAgent from '../agents/CoordinatorAgent.mjs';

class AgentTeam {
  constructor() {
    this.agents = {
      architect: new ArchitectAgent(),
      developer: new DeveloperAgent(),
      designer: new DesignerAgent(),
      tester: new TesterAgent(),
      security: new SecurityAgent(),
      devops: new DevOpsAgent(),
      analyst: new AnalystAgent(),
      writer: new WriterAgent(),
      researcher: new ResearcherAgent(),
      optimizer: new OptimizerAgent()
    };
    
    this.coordinator = new CoordinatorAgent();
    console.log('🤖 Agent Team initialized with 10 specialized agents.');
  }

  /**
   * Executes a complex task by coordinating the agent team.
   * @param {string} task The main task description.
   * @param {string} userId The ID of the user requesting the task.
   * @returns {Promise<object>} The final result of the task execution.
   */
  async executeTask(task, userId) {
    console.log(`[AgentTeam] 🚀 Starting task: ${task}`);
    
    // 1. Coordinator analyzes the task
    const analysis = await this.coordinator.analyzeTask(task);
    console.log(`[AgentTeam] 📊 Task analysis complete. Needs: ${analysis.needs.join(', ')}`);

    // 2. Select the required agents
    const selectedAgents = this.selectAgents(analysis);
    console.log(`[AgentTeam] 👨‍🏫 Selected agents: ${selectedAgents.join(', ')}`);

    // 3. Distribute the work among agents
    const subtasks = await this.coordinator.distributeWork(task, analysis, selectedAgents);
    console.log(`[AgentTeam] 📝 Work distributed into ${subtasks.length} subtasks.`);

    // 4. Execute subtasks in parallel
    const results = await Promise.all(
      subtasks.map(async (subtask) => {
        const agent = this.agents[subtask.agent];
        console.log(`[AgentTeam] -> Executing subtask for ${subtask.agent}...`);
        return await agent.execute(subtask, userId);
      })
    );
    console.log(`[AgentTeam] ✅ All subtasks completed.`);

    // 5. Merge the results
    const finalResult = await this.coordinator.mergeResults(task, results);
    console.log(`[AgentTeam] 🧩 Results merged.`);

    // 6. Quality Check
    const reviewedResult = await this.qualityCheck(finalResult, userId);
    console.log(`[AgentTeam] ⭐ Quality check score: ${reviewedResult.qualityScore}`);

    return reviewedResult;
  }

  /**
   * Selects agent instances based on the task analysis.
   * @param {object} analysis The analysis object from the Coordinator.
   * @returns {Array<string>} A list of selected agent keys.
   */
  selectAgents(analysis) {
    return analysis.needs || [];
  }

  /**
   * Performs a quality check on the final result by having other agents review the work.
   * @param {object} result The final result to be reviewed.
   * @param {string} userId The user ID.
   * @returns {Promise<object>} The result, potentially revised, with a quality score.
   */
  async qualityCheck(result, userId) {
    const reviewers = Object.keys(this.agents).filter(agentKey => agentKey !== result.primaryAgent);
    
    const reviews = await Promise.all(
      reviewers.map(agentKey => {
        const agent = this.agents[agentKey];
        if (typeof agent.review === 'function') {
          return agent.review(result);
        }
        return Promise.resolve({ agent: agentKey, score: 10, issues: [] }); // Assume perfect if no review method
      })
    );

    const totalScore = reviews.reduce((sum, r) => sum + r.score, 0);
    const averageScore = totalScore / reviews.length;

    if (averageScore < 8.0) {
      console.warn(`[AgentTeam] ⚠️ Quality score is low (${averageScore}). Sending for revision.`);
      // In a more advanced implementation, this would trigger a revision cycle.
      // For now, we just flag it.
      result.revisionNeeded = true;
    }

    result.qualityScore = averageScore;
    result.reviews = reviews;
    return result;
  }
}

export default new AgentTeam();

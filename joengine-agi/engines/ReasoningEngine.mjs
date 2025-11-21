/**
 * Reasoning Engine - العقل المفكر لـ JOEngine AGI
 * 
 * المسؤوليات:
 * - تحليل الأهداف المعقدة وتقسيمها إلى مهام فرعية
 * - التخطيط الاستراتيجي باستخدام Hierarchical Task Network (HTN)
 * - اتخاذ القرارات الذكية
 * - التعلم من الأخطاء وتحسين الخطط
 */

import OpenAI from 'openai';
import { CodeModificationEngine } from './CodeModificationEngine.mjs';
import { SmartPageBuilder } from './SmartPageBuilder.mjs';
import GitHubTool from '../tools/GitHubTool.mjs';
import DatabaseTool from '../tools/DatabaseTool.mjs';
import DeployTool from '../tools/DeployTool.mjs';
import { VectorDBTool } from '../tools/VectorDBTool.mjs';

export class ReasoningEngine {
  // تهيئة المحركات الجديدة
  codeModEngine;
  githubTool;
  pageBuilder;
  databaseTool;
  deployTool;
  vectorDbTool;

  constructor(config) {
    this.config = config;
    this.config.githubToken = config.githubToken;
    this.config.repo = config.repo;
    this.config.owner = config.owner;
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY
    });
    this.config.model = 'gpt-4o';

    // تهيئة المحركات والأدوات
    this.codeModEngine = new CodeModificationEngine(config);
    this.pageBuilder = new SmartPageBuilder(config);
    this.githubTool = new GitHubTool(config);
    this.databaseTool = new DatabaseTool(config);
    this.deployTool = new DeployTool(config);
    this.vectorDbTool = new VectorDBTool(config);
    
    this.memory = {
      shortTerm: [],
      plans: [],
      workingMemory: {}
    };
    
    this.systemPrompt = this.buildSystemPrompt();
  }

  buildSystemPrompt() {
    return `You are JOEngine, an advanced Artificial General Intelligence (AGI) system.

Your capabilities:
- Solve any problem, no matter how complex.
- Learn from experiences and consult your long-term memory to improve plans.
- Build and deploy complete systems autonomously.
- **CRITICAL RULE:** All code modifications MUST be planned and executed safely using the Code Modification Engine.

Your tools:
- browser: Browse web pages, analyze content, fill forms. Actions: navigate, click, type, extract.
- code: Write, edit, execute, analyze, and search code. Actions: write, edit, execute, analyze, search.
- file: Read, write, delete, and list files.
- search: Search the internet for up-to-date information.
- shell: Execute system shell commands.
- github: Interact with GitHub repositories.
- database: Connect to databases (SQL, NoSQL). Actions: connect, query.
- deploy: Deploy projects to cloud platforms. Actions: deploy.
- memory: Search your long-term memory for relevant past experiences. Action: search(query).`;
  }

  async analyzeGoal(goal, context = {}) {
    console.log(`\n🧠 Reasoning Engine: Analyzing goal...`);
    console.log(`Goal: ${goal}`);

    this.memory.workingMemory = { goal, context, timestamp: new Date() };

    // --== MEMORY ENHANCEMENT ==--
    console.log('Consulting long-term memory for relevant experiences...');
    const relevantMemories = await this.vectorDbTool.findRelevant(goal, 3);
    let memoryContext = 'No relevant memories found.';
    if (relevantMemories && relevantMemories.length > 0) {
        memoryContext = `Here are some relevant memories from past tasks:\n` +
            relevantMemories.map(mem =>
                `- Goal: ${mem.metadata.goal}\n  - Outcome: ${mem.metadata.success ? 'Success' : 'Failure'}\n  - Summary: ${mem.text}`
            ).join('\n\n');
        console.log(`Found ${relevantMemories.length} relevant memories.`);
    }
    // --== END MEMORY ENHANCEMENT ==--

    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.memory.shortTerm,
      {
        role: 'user',
        content: `Goal: ${goal}

Initial Context: ${JSON.stringify(context, null, 2)}

Long-term Memory Context:\n${memoryContext}\n\nPlease analyze this goal, taking into account the provided context and memories, and create a detailed execution plan in JSON format.`
      }
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const plan = JSON.parse(response.choices[0].message.content);
      
      this.memory.plans.push({ goal, plan, createdAt: new Date(), status: 'pending' });
      this.memory.shortTerm.push(
        { role: 'user', content: `Goal: ${goal}` },
        { role: 'assistant', content: JSON.stringify(plan) }
      );

      console.log(`✅ Plan created with ${plan.subtasks.length} subtasks`);
      return plan;
    } catch (error) {
      console.error('❌ Reasoning Engine error:', error.message);
      throw error;
    }
  }

  async learnFromExperience(task, results, success) {
    console.log(`\n📚 Learning from experience...`);

    // --== MEMORY ENHANCEMENT ==--
    const outcome = success ? 'succeeded' : 'failed';
    const resultSummary = results.map(r => 
        `Subtask ${r.subtask}: ${r.success ? 'Completed' : 'Failed'}. Result: ${JSON.stringify(r.result || r.error)}`
    ).join('\n');

    const experienceSummary = `The task with the goal \"${task.goal}\" ${outcome}.\nPlan: ${JSON.stringify(task.plan.subtasks, null, 2)}\nResults:\n${resultSummary}`;

    const metadata = {
        taskId: task.id,
        goal: task.goal,
        success: success,
        timestamp: new Date(),
    };

    await this.vectorDbTool.add(experienceSummary, metadata);
    console.log(`[ReasoningEngine] Experience stored in long-term memory.`);
    // --== END MEMORY ENHANCEMENT ==--

    if (!success) {
      console.log('🧠 Analyzing failure for alternative approach...');
      return await this.analyzeFailure(task, results);
    }

    return null;
  }

  async analyzeFailure(task, result) {
    console.log(`\n🧠 Analyzing failure for alternative approach...`);

    // Search for similar failures
    const relevantMemories = await this.vectorDbTool.findRelevant(`Failure analysis for: ${task.goal}`, 2);

    const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.memory.shortTerm,
        {
            role: 'user',
            content: `Task Goal: ${task.goal}\nFailed Plan: ${JSON.stringify(task.plan, null, 2)}\nFailure Result: ${JSON.stringify(result, null, 2)}\n
Relevant past failures:\n${JSON.stringify(relevantMemories, null, 2)}\n
Analyze the failure and propose a self-correction plan in JSON format.`
        }
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('❌ Failure analysis error:', error.message);
      return { shouldRetry: false, alternativeApproach: 'Could not analyze failure.' };
    }
  }

  async selfCorrect(task, plan, results) {
    console.log(`\n🧠 Generating self-correction plan...`);
    return await this.analyzeFailure(task, results); // Re-use failure analysis logic
  }
}

export default ReasoningEngine;

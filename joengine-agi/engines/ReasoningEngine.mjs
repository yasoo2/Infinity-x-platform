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

export class ReasoningEngine {
  // تهيئة المحركات الجديدة
  codeModEngine;
  pageBuilder;
  constructor(config) {
    this.config = config;
    this.config.githubToken = config.githubToken;
    this.config.repo = config.repo;
    this.config.owner = config.owner;
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });
    // تحديث النموذج الافتراضي بناءً على طلب المستخدم
    this.config.model = 'gpt-4o-mini';
    
    // تهيئة المحركات الجديدة
    this.codeModEngine = new CodeModificationEngine(config);
    this.pageBuilder = new SmartPageBuilder(config);
    
	    this.memory = {
	      shortTerm: [],  // الذاكرة قصيرة المدى (المحادثة الحالية)
	      longTerm: [],   // الذاكرة طويلة المدى (التجارب السابقة)
	      plans: [],       // الخطط المُنشأة
	      workingMemory: {} // ذاكرة العمل لتخزين السياق الحالي للمهمة
	    };
    
    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * بناء System Prompt لـ JOEngine
   */
  buildSystemPrompt() {
    return `You are JOEngine, an advanced Artificial General Intelligence (AGI) system.

Your capabilities:
- Solve any problem, no matter how complex
- Break down complex goals into actionable subtasks
- Use available tools to accomplish tasks
- Learn from experiences and improve yourself
- Build and deploy complete systems autonomously
- Browse the web and gather information
- Modify and improve existing systems
- Develop yourself using modern software engineering practices
- **CRITICAL RULE:** All code modifications MUST be planned and executed safely using the Code Modification Engine to prevent system corruption.
- **CRITICAL RULE:** All page designs and updates MUST be handled by the Smart Page Builder Engine.

Your tools:
- browser: Browse web pages, analyze content, fill forms. Actions: navigate, click, type, extract, screenshot. MUST include 'action' parameter.
- planner: Analyzes a complex task and breaks it down into a sequence of logical, actionable steps.
- code: Write, edit, execute, analyze, and search code (Python, JavaScript, etc.)
- file: Read, write, delete, and list files and directories
- search: Search the internet for up-to-date information
- shell: Execute system shell commands (e.g., ls, mkdir, npm install)
- api: Call any external API
- github: Interact with GitHub repositories (create issues, pull requests, branches)
- database: Connect to any database (SQL, NoSQL)
- deploy: Deploy projects to cloud platforms

Your reasoning process:
1. ANALYZE: Understand the goal deeply
2. DECOMPOSE: Break it into hierarchical subtasks
3. PLAN: Create a step-by-step execution plan
4. EXECUTE: Use tools to accomplish each step
5. OBSERVE: Analyze results and learn
6. ADAPT: Adjust plan if needed
7. COMPLETE: Deliver final result

Always think step-by-step using Chain of Thought (CoT).
Always explain your reasoning before taking action.
Always learn from failures and try alternative approaches.

You are autonomous, intelligent, and capable of solving ANY problem.`;
  }

  /**
   * تحليل هدف وإنشاء خطة تنفيذ
   */
	  async analyzeGoal(goal, context = {}) {
	    console.log(`\n🧠 Reasoning Engine: Analyzing goal...`);
	    console.log(`Goal: ${goal}`);
	
	    // تحديث ذاكرة العمل (Working Memory)
	    this.memory.workingMemory = { goal, context, timestamp: new Date() };
	
	    // **التحسين: تجاوز التخطيط المعقد للمهام البسيطة (مثل البحث عن الكود)**\n    // تمكين البحث السريع في الكود (Manus-like quick code search)
	    if (goal.toLowerCase().includes('search') || goal.toLowerCase().includes('find') || goal.toLowerCase().includes('glob') || goal.toLowerCase().includes('grep')) {
	      const isCodeSearch = goal.toLowerCase().includes('code') || goal.toLowerCase().includes('file') || goal.toLowerCase().includes('glob') || goal.toLowerCase().includes('grep');
	      
	      if (isCodeSearch) {
	        console.log('⚡️ Bypassing complex planning for quick code search...');
	        
	        // محاولة استخراج regex من الهدف
	        const regexMatch = goal.match(/"(.*?)"/); // البحث عن regex بين علامتي اقتباس
	        const regex = regexMatch ? regexMatch[1] : goal.split(' ').slice(-1)[0]; // استخدام الكلمة الأخيرة كـ regex افتراضي
	        
	        // محاولة استخراج النطاق
	        const scopeMatch = goal.match(/scope: (.*?)(?:\s|$)/); // البحث عن النطاق
	        const scope = scopeMatch ? scopeMatch[1] : '**/*'; // استخدام **/* كنطاق افتراضي
	        
	        return {
	          analysis: `The goal is a simple code search. Bypassing complex planning to execute a direct search using the enhanced CodeTool.`,
	          complexity: 'low',
	          estimatedTime: '0.5 min',
	          subtasks: [{
	            id: 1,
	            title: `Execute quick code search for: ${goal}`,
	            tool: 'code',
	            reasoning: 'Direct execution of a simple search task for speed and efficiency.',
	            params: {
	              action: 'search',
	              scope: scope,
	              regex: regex,
	              searchType: 'grep' // استخدام grep للبحث عن المحتوى
	            }
	          }],
	          risks: [],
	          successCriteria: ['Search results are returned.']
	        };
	      }
	    }
	    // **نهاية التحسين**
	
	    const messages = [
	      { role: 'system', content: this.systemPrompt },
	      ...this.memory.shortTerm,
	      {
        role: 'user',
        content: `Goal: ${goal}

Context: ${JSON.stringify(context, null, 2)}

Please analyze this goal and create a detailed execution plan.

Your response MUST be in JSON format:
{
  "analysis": "Your deep analysis of the goal",
  "complexity": "low|medium|high|very_high",
  "estimatedTime": "estimated time in minutes",
  "subtasks": [
    {
      "id": 1,
      "title": "Subtask title",
      "description": "Detailed description",
      "tool": "tool_name",
      "dependencies": [],
      "reasoning": "Why this subtask is needed"
    }
  ],
  "risks": ["potential risk 1", "potential risk 2"],
  "successCriteria": ["criterion 1", "criterion 2"]
}`
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
      
      // حفظ الخطة في الذاكرة
      this.memory.plans.push({
        goal,
        plan,
        createdAt: new Date(),
        status: 'pending'
      });

      // تحديث الذاكرة قصيرة المدى
      this.memory.shortTerm.push(
        { role: 'user', content: `Goal: ${goal}` },
        { role: 'assistant', content: JSON.stringify(plan) }
      );

      console.log(`✅ Plan created with ${plan.subtasks.length} subtasks`);
      console.log(`Complexity: ${plan.complexity}`);
      console.log(`Estimated time: ${plan.estimatedTime}`);

      return plan;
    } catch (error) {
      console.error('❌ Reasoning Engine error:', error.message);
      throw error;
    }
  }

  /**
   * اتخاذ قرار بناءً على الملاحظات
   */
  async makeDecision(situation, options) {
    console.log(`\n🤔 Making decision...`);

    const messages = [
      { role: 'system', content: this.systemPrompt },
      {
        role: 'user',
        content: `Situation: ${situation}

Available options:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Please analyze the situation and choose the best option.

Response format (JSON):
{
  "analysis": "Your analysis",
  "chosenOption": 1,
  "reasoning": "Why you chose this option",
  "confidence": 0.95
}`
      }
    ];

    try {
	      const response = await this.openai.chat.completions.create({
	        model: this.config.model,
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const decision = JSON.parse(response.choices[0].message.content);
      console.log(`✅ Decision: Option ${decision.chosenOption}`);
      console.log(`Confidence: ${(decision.confidence * 100).toFixed(1)}%`);

      return decision;
    } catch (error) {
      console.error('❌ Decision making error:', error.message);
      throw error;
    }
  }

  /**
   * التعلم من نتيجة مهمة
   */
	  async learnFromExperience(task, result, success) {
	    console.log(`\n📚 Learning from experience...`);
	
	    // 1. تحديث الذاكرة طويلة المدى (Long-Term Memory)
	    const experience = {
	      taskId: task.id,
	      goal: task.goal,
	      success: success,
	      timestamp: new Date(),
	      summary: `Task ${task.id} ${success ? 'succeeded' : 'failed'}. Goal: ${task.goal}`,
	      // يمكن استخدام LLM لتلخيص النتائج
	    };
	
	    // إضافة التجربة إلى الذاكرة طويلة المدى
	    this.memory.longTerm.push(experience);
	
	    // الحفاظ على حجم الذاكرة طويلة المدى
	    if (this.memory.longTerm.length > 100) {
	      this.memory.longTerm.shift();
	    }
	
	    // 2. تحديث الذاكرة قصيرة المدى (Short-Term Memory)
	    // يمكن استخدام LLM لتلخيص المهمة الناجحة وإضافتها كـ "درس مستفاد"
	    if (success) {
	      const lesson = {
	        role: 'system',
	        content: `LESSON LEARNED: Task "${task.goal}" was successfully completed. The key to success was: [LLM will summarize the key steps and tools used].`
	      };
	      this.memory.shortTerm.push(lesson);
	      // الحفاظ على حجم الذاكرة قصيرة المدى
	      if (this.memory.shortTerm.length > 10) {
	        this.memory.shortTerm.shift();
	      }
	    }
	
	    // 3. تحليل الفشل واقتراح نهج بديل
	    if (!success) {
	      console.log('🧠 Analyzing failure for alternative approach...');
	      const analysis = await this.analyzeFailure(task, result);
	      return analysis;
	    }
	
			    return null;
			  }

  /**
   * تحليل الفشل واقتراح نهج بديل
   */
  async analyzeFailure(task, result) {
    const subtaskInfo = task.currentSubtask ? `subtask ${task.currentSubtask.id}: "${task.currentSubtask.title}".
Tool used: ${task.currentSubtask.tool}.` : 'the initial planning phase.';
    const situation = `The task "${task.goal}" failed during execution of ${subtaskInfo}
Tool output/error: ${JSON.stringify(result)}`;

    const messages = [
      { role: 'system', content: this.systemPrompt },
      {
        role: 'user',
        content: `Analyze the following failure and suggest an alternative approach or a fix.

Situation: ${situation}

Response format (JSON):
{
  "analysis": "Your analysis of the failure",
  "alternativeApproach": "A suggested new plan or a fix to the current plan",
  "confidence": 0.95
}`
      }
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: 0.5,
        response_format: { type: 'json_object' }
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      console.log(`✅ Failure analyzed. Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

      return analysis;
    } catch (error) {
      console.error('❌ Failure analysis error:', error.message);
      return {
        analysis: `Failed to analyze failure: ${error.message}`,
        alternativeApproach: 'Retry the task with a modified first subtask.',
        confidence: 0.1
      };
    }
  }

  /**
   * تحسين خطة بناءً على ملاحظات
   */
  async improvePlan(planId, observations) {
    console.log(`\n🔧 Improving plan based on observations...`);

    const plan = this.memory.plans.find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    const messages = [
      { role: 'system', content: this.systemPrompt },
      {
        role: 'user',
        content: `Original plan: ${JSON.stringify(plan.plan)}

Observations: ${JSON.stringify(observations)}

Please improve the plan based on these observations.

Response format (JSON):
{
  "analysis": "What went wrong/right",
  "improvedPlan": { /* same structure as original plan */ },
  "changes": ["change 1", "change 2"]
}`
      }
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      const improvement = JSON.parse(response.choices[0].message.content);
      
      // تحديث الخطة
      plan.plan = improvement.improvedPlan;
      plan.updatedAt = new Date();

      console.log(`✅ Plan improved with ${improvement.changes.length} changes`);

      return improvement;
    } catch (error) {
      console.error('❌ Plan improvement error:', error.message);
      throw error;
    }
  }

  /**
   * مسح الذاكرة قصيرة المدى
   */
  clearShortTermMemory() {
    this.memory.shortTerm = [];
    console.log('🧹 Short-term memory cleared');
  }

  /**
   * الحصول على إحصائيات الذاكرة
   */
  getMemoryStats() {
    return {
      shortTerm: this.memory.shortTerm.length,
      longTerm: this.memory.longTerm.length,
      plans: this.memory.plans.length,
      successRate: this.calculateSuccessRate()
    };
  }

  /**
   * حساب معدل النجاح
   */
  calculateSuccessRate() {
    if (this.memory.longTerm.length === 0) return 0;
    
    const successful = this.memory.longTerm.filter(exp => exp.success).length;
    return (successful / this.memory.longTerm.length) * 100;
  }
}

export default ReasoningEngine;

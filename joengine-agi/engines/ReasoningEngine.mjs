/**
 * Reasoning Engine - العقل المفكر لـ JOEngine AGI
 * 
 * المسؤوليات:
 * - تحليل الأهداف المعقدة وتقسيمها إلى مهام فرعية
 * - التخطيط الاستراتيجي باستخدام Hierarchical Task Network (HTN)
 * - اتخاذ القرارات الذكية
 * - التعلم من الأخطاء وتحسين الخطط
 */

import { OpenAI } from 'openai';

export class ReasoningEngine {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });
    
    this.memory = {
      shortTerm: [],  // الذاكرة قصيرة المدى (المحادثة الحالية)
      longTerm: [],   // الذاكرة طويلة المدى (التجارب السابقة)
      plans: []       // الخطط المُنشأة
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

Your tools:
- browser: Browse web pages, analyze content, fill forms
- code: Write, edit, and execute code (Python, JavaScript, etc.)
- file: Read, write, and modify files
- shell: Execute system commands
- search: Search the internet (Google, Bing)
- api: Call any external API
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
        model: this.config.model || 'gpt-4-turbo-preview',
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
        model: this.config.model || 'gpt-4-turbo-preview',
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

    const experience = {
      task,
      result,
      success,
      timestamp: new Date(),
      lessons: []
    };

    // تحليل التجربة
    const messages = [
      { role: 'system', content: this.systemPrompt },
      {
        role: 'user',
        content: `Task: ${JSON.stringify(task)}
Result: ${JSON.stringify(result)}
Success: ${success}

Please analyze this experience and extract key lessons.

Response format (JSON):
{
  "analysis": "What happened",
  "lessons": ["lesson 1", "lesson 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "shouldRetry": true|false,
  "alternativeApproach": "description if shouldRetry is true"
}`
      }
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages,
        temperature: 0.5,
        response_format: { type: 'json_object' }
      });

      const learning = JSON.parse(response.choices[0].message.content);
      experience.lessons = learning.lessons;
      experience.improvements = learning.improvements;

      // حفظ في الذاكرة طويلة المدى
      this.memory.longTerm.push(experience);

      console.log(`✅ Learned ${learning.lessons.length} lessons`);
      
      return learning;
    } catch (error) {
      console.error('❌ Learning error:', error.message);
      return null;
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

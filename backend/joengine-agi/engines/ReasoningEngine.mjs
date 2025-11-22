/**
 * Reasoning Engine for JOEngine AGI
 * Analyzes user requests and generates a structured, step-by-step plan for the Execution Engine.
 */

import { OpenAI } from 'openai';

export class ReasoningEngine {
    constructor(config) {
        this.config = config;
        this.openai = new OpenAI({ apiKey: config.openaiApiKey });
        this.model = 'gpt-4o'; // Use a powerful model for reasoning
        this.availableTools = config.availableTools || []; // Should be loaded from a tool manager
    }

    /**
     * Analyzes a user request and generates a step-by-step execution plan.
     * @param {string} userRequest The user\'s high-level goal.
     * @returns {Promise<object>} A structured plan with subtasks.
     */
    async createPlan(userRequest) {
        console.log(`\n🤔 Generating execution plan for: \"${userRequest}\"...`);

        const systemPrompt = `
أنت **العقل المدبر (Mastermind)** في نظام الذكاء الاصطناعي **JOE**.

**مهمتك:** تحليل طلب المستخدم المعقد وتحويله إلى خطة عمل **مفصلة ودقيقة وقابلة للتنفيذ**.

**الأدوات المتاحة:**
${this.availableTools.map(tool => `- **${tool.name}**: ${tool.description}`).join('\n')}

**قواعد صارمة:**
1.  **الخطة فقط:** يجب أن يكون ردك عبارة عن كائن JSON **فقط**، بدون أي نص إضافي أو markdown.
2.  **لا للتنفيذ:** مهمتك هي التخطيط فقط، لا تقم بتنفيذ أي شيء أو استدعاء أي دالة.
3.  **الدقة المطلقة:** يجب أن تكون أسماء الأدوات والدوال والوسائط متطابقة تمامًا مع ما هو متاح.
4.  **الخطوات المنطقية:** قسّم الطلب إلى سلسلة من الخطوات الصغيرة والمنطقية.
5.  **التفكير العميق:** لكل خطوة، اشرح لماذا اتخذت هذا القرار في حقل \"thought\".

**صيغة الرد (JSON فقط):**
\`\`\`json
{
  \"thought\": \"أعتقد أنني بحاجة إلى تقسيم الطلب إلى 3 خطوات رئيسية...\",
  \"plan\": {
    \"description\": \"خطة عمل لتحقيق طلب المستخدم: ${userRequest}\",
    \"subtasks\": [
      {
        \"thought\": \"الخطوة الأولى هي قراءة الملف المطلوب...\",
        \"description\": \"قراءة محتوى ملف package.json\",
        \"tool\": \"FileSystemTool\",
        \"function\": \"readFile\",
        \"args\": {
          \"path\": \"package.json\"
        }
      },
      {
        \"thought\": \"الخطوة الثانية هي تعديل الإصدار...\",
        \"description\": \"تحديث رقم الإصدار في الملف\",
        \"tool\": \"CodeTool\",
        \"function\": \"refactorCode\",
        \"args\": {
          \"originalCode\": \"<file_content>\", // سيتم ملؤه لاحقًا
          \"command\": \"قم بزيادة رقم الإصدار الثانوي (minor version)\"
        }
      }
    ]
  }
}
\`\`\`
`;

        try {
            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `URGENT: Create a plan for this request: \"${userRequest}\"` }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1, // Low temperature for deterministic planning
            });

            const planJson = response.choices[0].message.content;
            const plan = JSON.parse(planJson);

            console.log('✅ Execution plan generated successfully.');
            return { success: true, plan: plan.plan };

        } catch (error) {
            console.error(`❌ Error in Reasoning Engine while creating plan: ${error.message}`);
            return {
                success: false,
                error: `Failed to create a plan: ${error.message}`
            };
        }
    }
}

export default ReasoningEngine;

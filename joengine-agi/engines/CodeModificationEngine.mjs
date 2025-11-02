/**
 * Code Modification Engine - محرك تعديل الكود الذكي والآمن
 * 
 * المسؤوليات:
 * - تحليل بنية الكود الحالي.
 * - توليد التعديلات المطلوبة (إضافة/حذف/تعديل).
 * - تطبيق التعديلات بأمان باستخدام أدوات الملفات (file:edit) لضمان عدم التلف.
 * - إجراء فحص أولي (Sanity Check) بعد التعديل.
 */

import { OpenAI } from 'openai';
// ملاحظة: في بيئة التنفيذ الفعلية، سيتم استخدام أدوات النظام مباشرة
// هنا، سنفترض وجود واجهة لأدوات الملفات
// import { FileTool } from '../tools/FileTool.mjs'; 

export class CodeModificationEngine {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    // this.fileTool = new FileTool(); // تهيئة أداة الملفات
    this.model = 'gpt-4o-mini'; // نموذج مناسب لمهام الكود
  }

  /**
   * تحليل الكود الحالي وتحديد التعديلات المطلوبة
   * @param {string} filePath - مسار الملف المراد تعديله
   * @param {string} fileContent - محتوى الملف الحالي
   * @param {string} modificationGoal - الهدف من التعديل (مثال: "أضف دالة لتوثيق المستخدم")
   * @returns {Promise<object>} - خطة التعديل المقترحة
   */
  async analyzeAndPlanModification(filePath, fileContent, modificationGoal) {
    console.log(`\n🔧 Analyzing code for modification: ${filePath}`);
    
    const systemPrompt = `You are a highly skilled and safe Code Modification AI. Your task is to analyze the provided code and a modification goal, then generate a precise plan to achieve that goal.
    
    CRITICAL RULE: You MUST only output the final plan in JSON format.
    CRITICAL RULE: The plan MUST contain an array of 'edits' in the exact format required by the file:edit tool.
    CRITICAL RULE: Ensure the modifications are non-destructive and logically sound.
    CRITICAL RULE: If the modification is complex, break it down into multiple sequential edits.`;

    const userPrompt = `File Path: ${filePath}
    File Content:
    \`\`\`
    ${fileContent}
    \`\`\`
    
    Modification Goal: ${modificationGoal}
    
    Based on the content and the goal, generate a plan (an array of 'edits') to modify the file.
    
    Response format (JSON):
    {
      "analysis": "Your analysis of the required changes.",
      "edits": [
        {
          "find": "The exact text string to find (must exist in the file).",
          "replace": "The replacement text (can be new code).",
          "all": false // Set to true if replacing all occurrences
        }
        // ... more edits
      ],
      "sanityCheck": "A brief description of how to verify the change (e.g., 'Check for new function definition')."
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const plan = JSON.parse(response.choices[0].message.content);
      return plan;
    } catch (error) {
      console.error('❌ Error in analyzeAndPlanModification:', error.message);
      throw new Error('Failed to generate modification plan.');
    }
  }

  /**
   * الوظيفة الرئيسية لتنفيذ التعديل الذكي
   * @param {string} filePath - مسار الملف
   * @param {string} fileContent - محتوى الملف الحالي
   * @param {string} modificationGoal - الهدف من التعديل
   * @returns {Promise<object>} - خطة التعديل (يجب أن يتم تنفيذ التعديل الفعلي بواسطة ReasoningEngine باستخدام أداة file:edit)
   */
  async executeSmartModification(filePath, fileContent, modificationGoal) {
    try {
      const plan = await this.analyzeAndPlanModification(filePath, fileContent, modificationGoal);
      
      if (plan.edits && plan.edits.length > 0) {
        // هنا، لا يقوم المحرك بالتطبيق الفعلي، بل يعيد الخطة إلى ReasoningEngine لتنفيذها
        return { success: true, plan, message: 'Modification plan generated successfully. Ready for execution.' };
      } else {
        return { success: false, message: 'Modification plan resulted in no edits or failed to generate a valid plan.' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// export default CodeModificationEngine;

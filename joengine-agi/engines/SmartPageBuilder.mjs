/**
 * Smart Page Builder Engine - محرك تصميم الصفحات الذكي
 * 
 * المسؤوليات:
 * - توليد كود الواجهة (React/Tailwind) من وصف نصي.
 * - دمج الكود في مجلدات الواجهة (public-site/ أو dashboard-x/).
 * - توفير واجهة API لتحديث التصميمات الحالية بناءً على طلبات بسيطة.
 */

import { OpenAI } from 'openai';

export class SmartPageBuilder {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.model = 'gpt-4o-mini'; // نموذج مناسب لتوليد الكود
  }

  /**
   * توليد كود صفحة (React/Tailwind) من وصف نصي
   * @param {string} pageDescription - وصف الصفحة المطلوبة (مثال: "صفحة تسجيل دخول عصرية باللون الداكن")
   * @param {string} targetFolder - المجلد المستهدف (public-site أو dashboard-x)
   * @returns {Promise<object>} - يحتوي على اسم الملف والكود المولّد
   */
  async generatePageCode(pageDescription, targetFolder) {
    console.log(`\n🎨 Generating page code for: ${pageDescription}`);
    
    const systemPrompt = `You are an expert React and Tailwind CSS developer. Your task is to generate a complete, functional, and well-styled React component based on the user's description.
    
    CRITICAL RULE: The output MUST be ONLY the React component code (JSX/TSX) and any necessary imports. DO NOT include any explanations or surrounding text.
    CRITICAL RULE: Use Tailwind CSS for all styling.
    CRITICAL RULE: The component should be a default export.`;

    const userPrompt = `Generate a modern, responsive React component for the following page description: \"${pageDescription}\".
    
    The component should be named based on the description (e.g., LoginPage, JoeDashboard).
    
    Output the complete code for the component.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      });

      const generatedCode = response.choices[0].message.content.trim();
      
      // استخراج اسم المكون لتحديد اسم الملف
      const componentNameMatch = generatedCode.match(/export default function (\w+)/) || generatedCode.match(/const (\w+) = \(\) =>/);
      const componentName = componentNameMatch ? componentNameMatch[1] : 'GeneratedPage';
      const fileName = `${componentName}.jsx`;
      const fullPath = `/home/ubuntu/infinity-x-platform/${targetFolder}/src/pages/${fileName}`; // افتراض مسار شائع

      return { 
        success: true, 
        fileName, 
        fullPath, 
        code: generatedCode,
        message: `Page code generated successfully. Ready to be written to ${fullPath}.`
      };
    } catch (error) {
      console.error('❌ Error in generatePageCode:', error.message);
      return { success: false, message: 'Failed to generate page code.' };
    }
  }

  /**
   * تحديث تصميم صفحة موجودة
   * @param {string} filePath - مسار ملف الصفحة
   * @param {string} fileContent - محتوى الملف الحالي
   * @param {string} updateGoal - هدف التحديث (مثال: "غير لون الخلفية إلى #1a1a1a")
   * @returns {Promise<object>} - خطة التعديل (edits)
   */
  async updatePageDesign(filePath, fileContent, updateGoal) {
    const systemPrompt = `You are an expert in React/Tailwind CSS code modification. Your task is to analyze the provided component code and a design update goal, then generate a precise plan to achieve that goal using the file:edit format.
    
    CRITICAL RULE: You MUST only output the final plan in JSON format.
    CRITICAL RULE: The plan MUST contain an array of 'edits' in the exact format required by the file:edit tool.`;

    const userPrompt = `File Path: ${filePath}
    Component Code:
    \`\`\`
    ${fileContent}
    \`\`\`
    
    Design Update Goal: ${updateGoal}
    
    Generate a plan (an array of 'edits') to modify the component code.
    
    Response format (JSON):
    {
      \"analysis\": \"Your analysis of the required design changes.\",
      \"edits\": [
        {
          \"find\": \"The exact text string to find.\",
          \"replace\": \"The replacement text.\",
          \"all\": false
        }
      ],
      \"sanityCheck\": \"A brief description of the visual change.\"
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
      return { success: true, plan, message: 'Design update plan generated successfully.' };
    } catch (error) {
      console.error('❌ Error in updatePageDesign:', error.message);
      return { success: false, message: 'Failed to generate design update plan.' };
    }
  }
}

// export default SmartPageBuilder;

/**
 * GeminiEngine - محرك Gemini المتقدم (محصّن 100%)
 * يولّد مواقع + يحسّن كود + يحافظ على الأصلي
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiEngine {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      }
    });
  }

  // === توليد كود من prompt ===
  async generateCode(prompt) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }

  // === توليد مشروع جديد ===
  async generateProjectCode(projectType, title, description, style = 'modern') {
    const prompt = `You are an expert web developer. Generate a complete, production-ready ${projectType}.

Title: ${title}
Description: ${description}
Style: ${style}

Requirements:
1. Single HTML file with embedded CSS and JS
2. Fully responsive (mobile-first)
3. Modern, clean, interactive design
4. Use Tailwind CDN or inline CSS
5. Smooth animations
6. SEO optimized
7. Start with <!DOCTYPE html>

Return ONLY the raw HTML code. NO markdown, NO explanations.`;

    const code = await this.generateCode(prompt);
    return this.cleanCode(code);
  }

  // === تحسين كود موجود (محصّن ضد النقصان) ===
  async improveCode(originalCode, command = "حسّن الكود") {
    const prompt = `
أنت "جو" — وكيل AI محترف في تطوير الكود.

**الأمر:** ${command}
**الكود الأصلي:**
\`\`\`html
${originalCode}
\`\`\`

**القواعد الصارمة (ممنوع خرقها):**
1. لا تمسح أي جزء من الكود الأصلي إلا إذا كان خطأ واضح
2. احتفظ بكل الوظائف، المتغيرات، الـ HTML، الـ CSS، الـ JS
3. إذا كان الأمر "أضف dark mode" → أضف الكود فقط
4. رجّع الكود الكامل 100%
5. لا تختصر، لا تلخص، لا تترك تعليقات
6. استخدم نفس الهيكل والـ indentation

**رد بـ JSON فقط:**

{
  "content": "<!DOCTYPE html>\\n<html>...</html>",
  "message": "تم إضافة dark mode"
}
`;

    try {
      const text = await this.generateCode(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      // تحقق من الحجم
      if (data.content && data.content.length < originalCode.length * 0.7) {
        console.warn("تحذير: الكود قصير — دمج مع الأصلي");
        data.content = this.mergeWithOriginal(originalCode, data.content);
      }

      data.content = this.cleanCode(data.content);
      return data;
    } catch (error) {
      throw new Error(`فشل التحسين: ${error.message}`);
    }
  }

  // === تنظيف الكود من markdown ===
  cleanCode(code) {
    return code
      .replace(/```html/gi, '')
      .replace(/```/g, '')
      .replace(/^[\s\S]*?(<!DOCTYPE)/, '$1')
      .trim();
  }

  // === دمج الكود الجديد مع الأصلي ===
  mergeWithOriginal(original, partial) {
    if (!partial || partial.length < 50) return original;

    // إضافة في النهاية قبل </body>
    if (partial.includes('dark') || partial.includes('button') || partial.includes('script')) {
      return original.replace('</body>', `${partial}\n</body>`);
    }

    // إضافة عامة
    return original + '\n\n<!-- جو: إضافة جديدة -->\n' + partial;
  }
}

// === تصدير كائن جاهز ===
let engine = null;
export const getGeminiEngine = (apiKey = process.env.GEMINI_API_KEY) => {
  if (!engine) {
    engine = new GeminiEngine(apiKey);
  }
  return engine;
};
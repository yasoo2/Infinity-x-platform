/**
 * Gemini Engine - محرك Gemini لتوليد وتحسين الكود
 * يحل محل OpenAI مع الحفاظ على الكود الأصلي 100%
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-pro",
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 8192,
  }
});

/**
 * تحسين كود موجود (محصّن ضد النقصان)
 */
export async function improveCode(originalCode, command = "حسّن الكود") {
  const prompt = `
أنت "جو" — وكيل AI محترف في تطوير الكود.

**الأمر:** ${command}
**الكود الأصلي:**
\`\`\`
${originalCode}
\`\`\`

**القواعد الصارمة (ممنوع خرقها):**
1. لا تمسح أي جزء من الكود الأصلي إلا إذا كان خطأ واضح
2. احتفظ بكل الوظائف، المتغيرات، الـ HTML، الـ CSS، الـ JS
3. إذا كان الأمر "أضف dark mode" → أضف الكود فقط، لا تعيد كتابة الملف كامل
4. رجّع الكود الكامل 100% للملف المعدّل
5. لا تختصر، لا تلخص، لا تترك تعليقات
6. استخدم نفس الهيكل، الأسماء، الـ indentation

**رد بـ JSON فقط:**

{
  "content": "<!DOCTYPE html>\\n<html>...الكود كامل هنا...</html>",
  "message": "تم إضافة dark mode"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // تحقق من الحجم
    if (data.content && data.content.length < originalCode.length * 0.7) {
      console.warn("تحذير: الكود قصير — دمج مع الأصلي");
      data.content = mergeWithOriginal(originalCode, data.content);
    }

    return data;
  } catch (error) {
    console.error('Gemini Engine Error:', error);
    throw new Error(`فشل تحسين الكود: ${error.message}`);
  }
}

/**
 * توليد موقع ويب كامل
 */
export async function generateWebsite(description, style = 'modern') {
  const prompt = `Create a complete, modern, responsive website based on this description:
"${description}"

Style: ${style}

Requirements:
- Single HTML file with embedded CSS and JavaScript
- Modern, professional design
- Fully responsive
- Use Tailwind CSS via CDN
- Include smooth animations
- SEO optimized

Return ONLY the complete HTML code, no explanations. Start with <!DOCTYPE html>`;

  try {
    const result = await model.generateContent(prompt);
    let code = result.response.text();

    // تنظيف
    code = code.replace(/```html/gi, '').replace(/```/g, '').trim();
    if (!code.startsWith('<!DOCTYPE')) {
      code = '<!DOCTYPE html>\n' + code;
    }

    return { content: code, message: `تم إنشاء موقع: ${description}` };
  } catch (error) {
    throw new Error(`فشل إنشاء الموقع: ${error.message}`);
  }
}

/**
 * دمج الكود الجديد مع الأصلي (حماية)
 */
function mergeWithOriginal(original, partial) {
  if (partial.includes('dark mode') || partial.includes('button')) {
    return original.replace('</body>', `${partial}\n</body>`);
  }
  return original + '\n\n<!-- جو: إضافة جديدة -->\n' + partial;
}
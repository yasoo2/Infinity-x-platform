/**
 * GrokEngine - محرك Grok للتكامل مع Grok API
 * يوفر قدرات توليد الكود والردود الذكية
 */

import axios from 'axios';

export class GrokEngine {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.x.ai/v1';
    this.model = 'grok-2';
  }

  /**
   * توليد رد من Grok
   */
  async generateResponse(prompt, context = []) {
    try {
      const messages = [
        ...context.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Grok API Error:', error.message);
      throw new Error(`فشل توليد الرد من Grok: ${error.message}`);
    }
  }

  /**
   * توليد كود من Grok
   */
  async generateCode(description, codeType = 'html') {
    const prompt = `أنت مطور ويب محترف. قم بإنشاء كود ${codeType} كامل وجاهز للإنتاج بناءً على الوصف التالي:

الوصف: ${description}

المتطلبات:
1. كود كامل وجاهز للاستخدام
2. تصميم حديث واحترافي
3. استجابة كاملة للأجهزة المختلفة
4. استخدم Tailwind CSS أو CSS مضمن
5. أضف تأثيرات سلسة وجميلة
6. محسّن للبحث (SEO)

رد بالكود فقط بدون شرح أو تعليقات.`;

    try {
      const code = await this.generateResponse(prompt);
      return this.cleanCode(code);
    } catch (error) {
      throw new Error(`فشل توليد الكود من Grok: ${error.message}`);
    }
  }

  /**
   * تحسين كود موجود
   */
  async improveCode(originalCode, command = 'حسّن الكود') {
    const prompt = `أنت "جو" — وكيل AI محترف في تطوير الكود.

**الأمر:** ${command}
**الكود الأصلي:**
\`\`\`
${originalCode}
\`\`\`

**القواعد الصارمة:**
1. لا تمسح أي جزء من الكود الأصلي إلا إذا كان خطأ واضح
2. احتفظ بكل الوظائف والمتغيرات
3. رجّع الكود الكامل 100%
4. استخدم نفس الهيكل والـ indentation

رد بـ JSON فقط:
{
  "content": "الكود المحسّن هنا",
  "message": "وصف التحسينات"
}`;

    try {
      const response = await this.generateResponse(prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      // تحقق من الحجم
      if (data.content && data.content.length < originalCode.length * 0.7) {
        console.warn("تحذير: الكود قصير — دمج مع الأصلي");
        data.content = this.mergeWithOriginal(originalCode, data.content);
      }

      data.content = this.cleanCode(data.content);
      return data;
    } catch (error) {
      throw new Error(`فشل التحسين من Grok: ${error.message}`);
    }
  }

  /**
   * تنظيف الكود من markdown
   */
  cleanCode(code) {
    return code
      .replace(/```html/gi, '')
      .replace(/```javascript/gi, '')
      .replace(/```css/gi, '')
      .replace(/```/g, '')
      .replace(/^[\s\S]*?(<!DOCTYPE|<html|function|class|const)/, '$1')
      .trim();
  }

  /**
   * دمج الكود الجديد مع الأصلي
   */
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

/**
 * تصدير كائن جاهز
 */
let engine = null;
export const getGrokEngine = (apiKey = process.env.GROK_API_KEY) => {
  if (!engine) {
    engine = new GrokEngine(apiKey);
  }
  return engine;
};

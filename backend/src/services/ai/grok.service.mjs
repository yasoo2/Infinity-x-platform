/**
 * GrokEngine Fixed - محرك Grok المحسّن مع معالجة أخطاء شاملة
 */

import axios from 'axios';

export class GrokEngine {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.x.ai/v1';
    this.model = 'grok-beta';
    this.timeout = 30000; // 30 seconds
  }

  /**
   * توليد رد من Grok مع معالجة أخطاء محسّنة
   */
  async generateResponse(prompt, context = []) {
    try {
      // التحقق من وجود API Key
      if (!this.apiKey || this.apiKey === 'your-grok-api-key-here') {
        throw new Error('GROK_API_KEY غير موجود أو غير صالح. يرجى تحديث المفتاح في ملف .env');
      }

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

      console.log('🤖 Grok API Request:', {
        url: `${this.baseURL}/chat/completions`,
        model: this.model,
        messagesCount: messages.length
      });

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
          },
          timeout: this.timeout
        }
      );

      console.log('✅ Grok API Response received');
      return response.data.choices[0].message.content;

    } catch (error) {
      console.error('❌ Grok API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      // معالجة أنواع الأخطاء المختلفة
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new Error('مفتاح Grok API غير صالح أو منتهي الصلاحية. يرجى تحديث GROK_API_KEY في ملف .env من https://console.x.ai');
        } else if (status === 403) {
          throw new Error('ليس لديك صلاحية للوصول إلى Grok API. تحقق من حسابك على https://console.x.ai');
        } else if (status === 429) {
          throw new Error('تم تجاوز حد الاستخدام لـ Grok API. يرجى الانتظار قليلاً والمحاولة مرة أخرى.');
        } else if (status === 500 || status === 502 || status === 503) {
          throw new Error('خطأ في خادم Grok API. يرجى المحاولة مرة أخرى لاحقاً.');
        } else {
          throw new Error(`خطأ من Grok API (${status}): ${errorData?.error?.message || error.message}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('انتهت مهلة الاتصال بـ Grok API. يرجى التحقق من اتصالك بالإنترنت.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('لا يمكن الاتصال بخادم Grok API. يرجى التحقق من اتصالك بالإنترنت.');
      } else {
        throw new Error(`فشل الاتصال بـ Grok: ${error.message}`);
      }
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
      throw error;
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
      throw error;
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

  /**
   * اختبار الاتصال بـ Grok API
   */
  async testConnection() {
    try {
      console.log('🧪 Testing Grok API connection...');
      const response = await this.generateResponse('مرحباً، هل تعمل؟');
      console.log('✅ Grok API connection successful!');
      return {
        success: true,
        message: 'الاتصال بـ Grok API ناجح',
        response
      };
    } catch (error) {
      console.error('❌ Grok API connection failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
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

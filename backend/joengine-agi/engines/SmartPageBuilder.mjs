/**
 * Smart Page Builder Engine - CORRECTED & SIMPLIFIED
 * This version uses standard string concatenation to avoid all escaping issues.
 */

import { OpenAI } from 'openai';
import { promises as fs } from 'fs';

export class SmartPageBuilder {
  constructor(config) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.model = 'gpt-4o';
  }

  async buildPageFromDescription(description, filePath, style = 'modern') {
    console.log(`\n🎨 Building smart page: ${description}`);

    // SAFE IMPLEMENTATION: Using standard string concatenation to build the prompt.
    const prompt = 'أنت **جو (Joe)** — مطور ويب محترف متخصص في إنشاء مواقع حديثة واحترافية.\n\n' +
      '**🎯 المطلوب:** إنشاء موقع ويب كامل\n\n' +
      '**📝 الوصف:** ' + description + '\n\n' +
      '**🎨 النمط:** ' + style + '\n\n' +
      '**📋 المتطلبات التقنية (CRITICAL):**\n' +
      '1.  **ملف HTML واحد كامل** مع CSS و JavaScript مضمّنين.\n' +
      '2.  **تصميم حديث واحترافي** يعكس النمط المطلوب.\n' +
      '3.  **استجابة كاملة (Responsive)** لجميع الأجهزة (Mobile, Tablet, Desktop).\n' +
      '4.  **استخدام Tailwind CSS عبر CDN** (لا تحميل محلي).\n' +
      '5.  **رسوم متحركة سلسة (Smooth Animations)** باستخدام CSS/JS.\n' +
      '6.  **تحسين SEO:** Meta tags, Semantic HTML5, Alt text, Structured data.\n' +
      '7.  **أداء عالي:** تحميل سريع, كود محسّن, Lazy loading للصور.\n' +
      '8.  **إمكانية الوصول (Accessibility):** ARIA labels, Keyboard navigation, Color contrast.\n' +
      '9.  **أيقونات جميلة** (استخدم Font Awesome أو Heroicons من CDN).\n' +
      '10. **تفاعلية:** أزرار، نماذج، قوائم تعمل بشكل كامل.\n\n' +
      '**🚫 ممنوع:**\n' +
      '- استخدام صور خارجية (استخدم placeholders من placehold.co أو SVG مضمن).\n' +
      '- روابط خارجية مكسورة.\n' +
      '- كود غير مكتمل أو "...".\n' +
      '- تعليقات TODO.\n\n' +
      '**📤 الرد:**\n' +
      'أرجع **فقط** كود HTML الكامل، بدون أي شرح أو markdown. ابدأ مباشرة بـ: <!DOCTYPE html>';

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a world-class web developer assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
      });

      let generatedCode = response.choices[0].message.content.trim();

      generatedCode = generatedCode.replace(/^```html\n?|\n?```$/g, '');

      if (!generatedCode.startsWith('<!DOCTYPE html>')) {
          generatedCode = '<!DOCTYPE html>\n' + generatedCode;
      }

      console.log(`✅ Page code generated successfully. Writing to file: ${filePath}`);

      await fs.writeFile(filePath, generatedCode);

      return { 
        success: true, 
        filePath, 
        code: generatedCode,
        message: `Page built and saved successfully to ${filePath}.`
      };
    } catch (error) {
      console.error('❌ Error in buildPageFromDescription:', error.message);
      return { success: false, message: `Failed to build page: ${error.message}` };
    }
  }
}

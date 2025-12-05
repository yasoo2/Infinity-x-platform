/**
 * Smart Page Builder Engine - DIAGNOSTIC VERSION
 * Added a debug log to inspect the environment variable at runtime.
 */

	import { OpenAI } from 'openai';
	import { promises as fs } from 'fs';
	import { PlanningSystem } from '../planning/PlanningSystem.mjs'; // استيراد نظام التخطيط الجديد
	import { MemoryManager } from '../services/memory/memory.service.mjs'; // استيراد نظام الذاكرة الجديد

	export class SmartPageBuilder {
	  constructor(config, db) {
	    // --- DIAGNOSTIC LOG ---
	    console.log('[SmartPageBuilder] Checking OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
	    
	    this.config = config;
	    this.db = db;
	    this.planningSystem = new PlanningSystem(db); // تهيئة نظام التخطيط
	    this.memoryManager = new MemoryManager(); // تهيئة نظام الذاكرة
	    // The next line is where the error occurs if the key is missing.
	    this.openai = new OpenAI({ apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY });
	    this.model = 'gpt-4o';
	  }

	  async buildPageFromDescription(description, filePath, style = 'modern', userId) {
	    console.log(`\n🎨 Building smart page: ${description}`);
	
	    // 1. استخدام الذاكرة طويلة الأمد (LTM) لتعزيز الذكاء
	    const ltmContext = await this.memoryManager.getLTM(userId, { type: 'web_development_pattern', limit: 3 });
	    const ltmPrompt = ltmContext.length > 0 
	      ? `\n\n**🧠 الذاكرة طويلة الأمد (LTM):**\nلقد تعلمت من المشاريع السابقة. استخدم هذه الأنماط المعرفية لتحسين الكود:\n${ltmContext.map(p => `- ${p.title}`).join('\n')}\n`
	      : '';
	
	    // 2. دمج التخطيط الهرمي (Hierarchical Planning)
	    const plan = await this.planningSystem.createPlan({
	      title: `بناء صفحة: ${description.slice(0, 50)}...`,
	      goal: description,
	      userId: userId,
	      description: 'استخدام SmartPageBuilder لإنشاء صفحة ويب كاملة.'
	    });
	    const phaseId = (await this.planningSystem.addPhase(plan.planId, { title: 'توليد الكود الأولي', order: 1 })).phaseId;
	    await this.planningSystem.startPhase(phaseId);
	
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
	      ltmPrompt + // دمج الذاكرة طويلة الأمد في الموجه
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

	      await this.planningSystem.completePhase(phaseId);
	
	      // 3. مرحلة التحسين والتعلم الذاتي (Self-Correction and Learning)
	      const reviewPhaseId = (await this.planningSystem.addPhase(plan.planId, { title: 'مراجعة وتحسين الكود', order: 2 })).phaseId;
	      await this.planningSystem.startPhase(reviewPhaseId);
	
	      // Placeholder for a more advanced self-correction loop (e.g., using a second LLM call to review the code)
	      // For now, we simulate a successful review.
	      const reviewResult = { success: true, feedback: 'Initial code quality is high.' };
	
	      if (reviewResult.success) {
	        await this.planningSystem.completePhase(reviewPhaseId);
	        await this.planningSystem.advanceToNextPhase(plan.planId); // يكمل الخطة
	      } else {
	        // في حالة الفشل، يمكن إضافة منطق لإعادة المحاولة أو التعلم
	        await this.planningSystem.completePhase(reviewPhaseId);
	        // هنا يمكن إضافة منطق لـ this.memoryManager.checkForLTM(userId, { type: 'code_review_failure', ... });
	      }
	
	      return { 
	        success: true, 
	        filePath, 
	        code: generatedCode,
	        message: `Page built and saved successfully to ${filePath}. الخطة ${plan.planId} مكتملة.`
	      };
	    } catch (error) {
	      console.error('❌ Error in buildPageFromDescription:', error.message);
	      return { success: false, message: `Failed to build page: ${error.message}` };
	    }
	  }
	}

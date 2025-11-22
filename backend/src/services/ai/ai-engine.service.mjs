/**
 * 🌟 Gemini Engine - محرك Gemini المتقدم لتوليد وتحسين الكود
 * محرك AI متطور يستخدم Google Gemini مع حماية كاملة للكود الأصلي
 * متوافق مع بنية Joe Advanced Engine
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';

// ✅ التحقق من وجود API Key
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ خطأ: GEMINI_API_KEY غير موجود في متغيرات البيئة');
  throw new Error('GEMINI_API_KEY is required');
}

// 🔧 إعداد Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🎯 إعدادات النموذج المحسّنة
const modelConfig = {
  model: "gemini-1.5-pro",
  generationConfig: {
    temperature: 0.3,        // دقة عالية
    maxOutputTokens: 8192,   // حد أقصى للإخراج
    topP: 0.95,              // تنوع معتدل
    topK: 40,                // تحديد الخيارات
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_NONE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_NONE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_NONE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_NONE",
    },
  ]
};

const model = genAI.getGenerativeModel(modelConfig);

/**
 * 🧠 إنشاء خطة عمل ذكية
 * @param {string} task - المهمة المعقدة المطلوبة
 * @param {object} context - السياق الحالي (ملفات، حالة، ...إلخ)
 * @returns {Promise<object>} - خطة عمل منظمة بصيغة JSON
 */
export async function createPlan(task, context = {}) {
  console.log(`🧠 جاري التخطيط لمهمة: "${task}"`);

  // 📖 قراءة ديناميكية للأدوات المتاحة
  const toolsDir = path.join(process.cwd(), 'backend', 'src', 'tools_refactored');
  const toolFiles = await fs.readdir(toolsDir);
  const availableTools = toolFiles
    .filter(file => file.endsWith('.mjs'))
    .map(file => file.replace('.mjs', ''));

  // 🎨 بناء Prompt قوي ومفصّل
  const prompt = `
أنت **جو (Joe)** — مخطط تقني خبير (Expert Technical Planner) ووكيل AI مستقل (Autonomous AI Agent).

**🎯 المهمة الأساسية:** ${task}

**📊 السياق الحالي (Context):**
${JSON.stringify(context, null, 2)}

**🛠️ الأدوات المتاحة (Available Tools):**
${availableTools.join(', ')}

**📖 تعليمات التخطيط:**

1.  **فكر خطوة بخطوة:** قسّم المهمة الأساسية إلى سلسلة من الخطوات الصغيرة والمنطقية والقابلة للتنفيذ.
2.  **اختر الأداة المناسبة:** لكل خطوة، اختر الأداة **الأنسب** من قائمة الأدوات المتاحة.
3.  **حدد الإجراء والمعلمات:** لكل خطوة، حدد الإجراء \`action\` المطلوب من الأداة، والمعلمات \`params\` اللازمة لتنفيذه بدقة.
4.  **اعتمد على النتائج:** يمكنك الإشارة إلى أن مدخل خطوة ما هو ناتج خطوة سابقة (e.g., "content": "result of step 1").
5.  **التفكير النقدي:** فكر في أفضل طريقة لإنجاز المهمة. هل تحتاج إلى قراءة ملف أولاً؟ هل تحتاج للبحث عن معلومة؟ هل تحتاج لكتابة كود؟
6.  **الخطة فقط:** يجب أن يكون الناتج خطة فقط. لا تقم بتنفيذ أي شيء بنفسك.

**🚫 ممنوع:**
- اختراع أدوات غير موجودة في القائمة.
- ترك معلمات مطلوبة فارغة.
- إنشاء خطط غير منطقية أو غير قابلة للتنفيذ.

**📤 صيغة الرد (JSON فقط - CRITICAL):**
يجب أن يكون الرد بصيغة JSON تحتوي على قائمة من الخطوات.

\`\`\`json
{
  "plan": [
    {
      "step": 1,
      "thought": "سأبدأ بقراءة محتوى الملف المطلوب لتحليله.",
      "tool": "fileSystem",
      "action": "readFile",
      "params": {
        "path": "path/to/file.js"
      }
    },
    {
      "step": 2,
      "thought": "الآن بعد أن حصلت على الكود، سأستخدم أداة تحليل الكود لفهم بنيته.",
      "tool": "code",
      "action": "analyze",
      "params": {
        "language": "javascript",
        "code": "result of step 1"
      }
    },
    {
      "step": 3,
      "thought": "بناءً على التحليل، سأقوم بكتابة ملف جديد يحتوي على التحسينات.",
      "tool": "fileSystem",
      "action": "writeFile",
      "params": {
        "path": "path/to/new_file.js",
        "content": "new generated code here"
      }
    }
  ]
}
\`\`\`

**ابدأ الآن في بناء الخطة للمهمة الأساسية.**
`;

  try {
    console.log('🔄 جاري توليد الخطة مع Gemini...');
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    let text = response.text();
    text = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    
    const jsonMatch = text.match(/{\s*[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error('الرد من Gemini غير صالح - لا يحتوي على JSON للخطة');
    }

    const planData = JSON.parse(jsonMatch[0]);

    console.log('✅ تم إنشاء الخطة بنجاح');
    return {
        success: true,
        task: task,
        plan: planData.plan || [],
        timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ خطأ في إنشاء الخطة:', error);
    throw new Error(`فشل إنشاء الخطة: ${error.message}`);
  }
}


/**
 * 🛡️ تحسين كود موجود مع حماية كاملة ضد الحذف
 * @param {string} originalCode - الكود الأصلي
 * @param {string} command - الأمر المطلوب (مثال: "أضف dark mode")
 * @param {object} options - خيارات إضافية
 * @returns {Promise<object>} - الكود المحسّن مع رسالة
 */
export async function improveCode(originalCode, command = "حسّن الكود", options = {}) {
  // 🔍 التحقق من المدخلات
  if (!originalCode || typeof originalCode !== 'string') {
    throw new Error('الكود الأصلي مطلوب ويجب أن يكون نص');
  }

  if (originalCode.trim().length === 0) {
    throw new Error('الكود الأصلي فارغ');
  }

  const originalLength = originalCode.length;
  const originalLines = originalCode.split('\n').length;

  console.log(`📊 معلومات الكود الأصلي:\n  - الطول: ${originalLength} حرف\n  - عدد الأسطر: ${originalLines}\n  - الأمر: ${command}`);

  // 🎨 بناء Prompt محسّن ومفصّل
  const prompt = `
أنت **جو (Joe)** — وكيل AI محترف متخصص في تطوير وتحسين الكود.

**🎯 الأمر المطلوب:** ${command}

**📄 الكود الأصلي:**
\`\`\`
${originalCode}
\`\`\`

**⚠️ القواعد الصارمة (CRITICAL - لا يمكن خرقها):**

1. **الحفاظ الكامل:** احتفظ بـ 100% من الكود الأصلي إلا إذا كان هناك خطأ برمجي واضح
2. **عدم الحذف:** ممنوع حذف أي دالة، متغير، class، HTML element، CSS rule، أو JavaScript function
3. **الإضافة فقط:** إذا كان الأمر "أضف X" → أضف الكود الجديد فقط دون إعادة كتابة الموجود
4. **الكود الكامل:** يجب إرجاع الملف كاملاً 100% بعد التعديل (لا اختصارات، لا "...")
5. **الهيكل الأصلي:** حافظ على نفس البنية، الأسماء، المسافات، التنسيق
6. **لا تعليقات زائدة:** لا تضف تعليقات توضيحية إلا إذا كانت ضرورية للكود الجديد
7. **التوافق:** تأكد من أن الكود الجديد متوافق مع الموجود
8. **الجودة:** حسّن الأداء والأمان دون تغيير الوظائف الأساسية

**📊 معلومات مهمة:**
- الكود الأصلي: ${originalLength} حرف، ${originalLines} سطر
- يجب أن يكون الناتج >= ${Math.floor(originalLength * 0.8)} حرف

**📤 صيغة الرد (JSON فقط):**

\`\`\`json
{
  "content": "الكود الكامل المعدّل هنا (كل سطر، كل حرف)",
  "message": "وصف مختصر للتعديلات",
  "changes": [
    "التعديل 1",
    "التعديل 2"
  ],
  "linesAdded": 0,
  "linesModified": 0
}
\`\`\`

**ابدأ الآن:**
`;

  try {
    // 🚀 إرسال الطلب إلى Gemini
    console.log('🔄 جاري معالجة الكود مع Gemini...');
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    // 🔍 استخراج النص
    let text = response.text();
    
    // 🧹 تنظيف النص من markdown
    text = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
    
    // 📦 استخراج JSON
    const jsonMatch = text.match(/{\s*[\s\S]*}/);
    
    if (!jsonMatch) {
      console.error('❌ فشل استخراج JSON من الرد');
      throw new Error('الرد من Gemini غير صالح - لا يحتوي على JSON');
    }

    const data = JSON.parse(jsonMatch[0]);

    // ✅ التحقق من وجود المحتوى
    if (!data.content || typeof data.content !== 'string') {
      throw new Error('الرد لا يحتوي على محتوى صالح');
    }

    const newLength = data.content.length;
    const newLines = data.content.split('\n').length;
    const sizeRatio = newLength / originalLength;

    console.log(`📊 معلومات الكود الجديد:\n  - الطول: ${newLength} حرف (${(sizeRatio * 100).toFixed(1)}%)\n  - عدد الأسطر: ${newLines}\n  - الفرق: ${newLength - originalLength} حرف`);

    // 🛡️ حماية من النقصان الكبير
    if (sizeRatio < 0.7) {
      console.warn(`⚠️ تحذير: الكود الجديد أقصر بكثير من الأصلي (${(sizeRatio * 100).toFixed(1)}%)`);
      console.warn('🔄 جاري دمج الكود مع الأصلي للحماية...');
      
      data.content = mergeWithOriginal(originalCode, data.content, command);
      data.message = `${data.message} (تم الدمج مع الأصلي للحماية)`;
      data.merged = true;
    }

    // 📊 إضافة إحصائيات
    data.stats = {
      originalLength,
      newLength: data.content.length,
      originalLines,
      newLines: data.content.split('\n').length,
      sizeRatio: data.content.length / originalLength,
      timestamp: new Date().toISOString()
    };

    console.log('✅ تم تحسين الكود بنجاح');
    
    return data;

  } catch (error) {
    console.error('❌ خطأ في Gemini Engine:', error);
    
    // 🔄 محاولة استرجاع جزئي
    if (error.message.includes('JSON')) {
      return {
        content: originalCode,
        message: `فشل التحسين: ${error.message}`,
        error: true,
        originalReturned: true
      };
    }
    
    throw new Error(`فشل تحسين الكود: ${error.message}`);
  }
}

/**
 * 🌐 توليد موقع ويب كامل من الصفر
 * @param {string} description - وصف الموقع المطلوب
 * @param {string} style - نمط التصميم (modern, minimal, creative, professional)
 * @param {object} options - خيارات إضافية
 * @returns {Promise<object>} - كود HTML كامل
 */
export async function generateWebsite(description, style = 'modern', options = {}) {
  // 🔍 التحقق من المدخلات
  if (!description || typeof description !== 'string') {
    throw new Error('وصف الموقع مطلوب');
  }

  const features = options.features || [];
  const colors = options.colors || 'blue and white';
  const framework = options.framework || 'Tailwind CSS';

  console.log(`🌐 جاري إنشاء موقع: ${description}`);
  console.log(`🎨 النمط: ${style}`);

  // 🎨 بناء Prompt مفصّل
  const prompt = `
أنت **جو (Joe)** — مطور ويب محترف متخصص في إنشاء مواقع حديثة واحترافية.

**🎯 المطلوب:** إنشاء موقع ويب كامل

**📝 الوصف:** ${description}

**🎨 النمط:** ${style}
**🎨 الألوان:** ${colors}
**⚙️ Framework:** ${framework}

**✨ المميزات المطلوبة:**
${features.length > 0 ? features.map(f => `- ${f}`).join('\n') : '- تصميم احترافي\n- استجابة كاملة\n- تجربة مستخدم ممتازة'}

**📋 المتطلبات التقنية:**

1. **ملف HTML واحد كامل** مع CSS و JavaScript مضمّنين
2. **تصميم حديث واحترافي** يعكس النمط المطلوب
3. **استجابة كاملة (Responsive)** لجميع الأجهزة (Mobile, Tablet, Desktop)
4. **استخدام ${framework} عبر CDN** (لا تحميل محلي)
5. **رسوم متحركة سلسة (Smooth Animations)** باستخدام CSS/JS
6. **تحسين SEO:**
   - Meta tags كاملة
   - Semantic HTML5
   - Alt text للصور
   - Structured data
7. **أداء عالي:**
   - تحميل سريع
   - كود محسّن
   - Lazy loading للصور
8. **إمكانية الوصول (Accessibility):**
   - ARIA labels
   - Keyboard navigation
   - Color contrast
9. **أيقونات جميلة** (Font Awesome أو Heroicons)
10. **تفاعلية:** أزرار، نماذج، قوائم تعمل بشكل كامل

**🚫 ممنوع:**
- استخدام صور خارجية (استخدم placeholders أو SVG)
- روابط خارجية مكسورة
- كود غير مكتمل أو "..."
- تعليقات TODO

**📤 الرد:**
أرجع **فقط** كود HTML الكامل، بدون شرح، بدون markdown.
ابدأ مباشرة بـ: <!DOCTYPE html>
`;

  try {
    console.log('🔄 جاري التوليد مع Gemini...');
    
    const result = await model.generateContent(prompt);
    let code = result.response.text();

    // 🧹 تنظيف الكود
    code = code
      .replace(/```html\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    // ✅ التحقق من البداية الصحيحة
    if (!code.startsWith('<!DOCTYPE')) {
      console.warn('⚠️ إضافة DOCTYPE للكود');
      code = '<!DOCTYPE html>\n' + code;
    }

    // ✅ التحقق من الاكتمال
    if (!code.includes('</html>')) {
      console.warn('⚠️ الكود غير مكتمل - إضافة closing tags');
      code += '\n</body>\n</html>';
    }

    console.log(`✅ تم إنشاء الموقع بنجاح (${code.length} حرف)`);

    return {
      content: code,
      message: `تم إنشاء موقع: ${description}`,
      style,
      stats: {
        length: code.length,
        lines: code.split('\n').length,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('❌ خطأ في توليد الموقع:', error);
    throw new Error(`فشل إنشاء الموقع: ${error.message}`);
  }
}

/**
 * 🔧 دمج الكود الجديد مع الأصلي (حماية ذكية)
 * @param {string} original - الكود الأصلي
 * @param {string} partial - الكود الجزئي الجديد
 * @param {string} command - الأمر المطلوب
 * @returns {string} - الكود المدمج
 */
function mergeWithOriginal(original, partial, command = '') {
  console.log('🔄 جاري دمج الكود...');

  // 🔍 تحليل نوع التعديل
  const isAddition = command.toLowerCase().includes('أضف') || 
                     command.toLowerCase().includes('add');
  
  const isDarkMode = command.toLowerCase().includes('dark mode') ||
                     command.toLowerCase().includes('وضع داكن');

  const isFeature = command.toLowerCase().includes('feature') ||
                    command.toLowerCase().includes('ميزة');

  // 📦 دمج ذكي حسب النوع
  if (isDarkMode) {
    // إضافة Dark Mode قبل </body>
    if (original.includes('</body>')) {
      return original.replace('</body>', `\n<!-- Dark Mode by Joe -->\n${partial}\n</body>`);
    }
  }

  if (isAddition || isFeature) {
    // إضافة الميزة الجديدة في المكان المناسب
    if (original.includes('</body>')) {
      return original.replace('</body>', `\n<!-- New Feature by Joe -->\n${partial}\n</body>`);
    } else if (original.includes('</html>')) {
      return original.replace('</html>', `\n${partial}\n</html>`);
    }
  }

  // 🔄 دمج افتراضي: إضافة في النهاية
  return `${original}\n\n<!-- ===== Joe: إضافة جديدة ===== -->\n${partial}`;
}

/**
 * 🧪 تحليل كود وإعطاء اقتراحات
 * @param {string} code - الكود المراد تحليله
 * @returns {Promise<object>} - التحليل والاقتراحات
 */
export async function analyzeCode(code) {
  if (!code || typeof code !== 'string') {
    throw new Error('الكود مطلوب للتحليل');
  }

  const prompt = `
أنت **جو (Joe)** — محلل كود محترف.

**📄 الكود:**
\`\`\`
${code}
\`\`\`

**🔍 المطلوب:**
حلل الكود وأعطِ:
1. نقاط القوة
2. نقاط الضعف
3. اقتراحات للتحسين
4. مشاكل الأمان (إن وجدت)
5. مشاكل الأداء (إن وجدت)

**📤 الرد بـ JSON:**
\`\`\`json
{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestions": ["..."],
  "securityIssues": ["..."],
  "performanceIssues": ["..."],
  "score": 0-100
}
\`\`\`
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text()
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const jsonMatch = text.match(/{\s*[\s\S]*}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
  } catch (error) {
    throw new Error(`فشل تحليل الكود: ${error.message}`);
  }
}

/**
 * 🔄 تحويل كود من لغة إلى أخرى
 * @param {string} code - الكود الأصلي
 * @param {string} fromLang - اللغة الأصلية
 * @param {string} toLang - اللغة المستهدفة
 * @returns {Promise<object>} - الكود المحول
 */
export async function convertCode(code, fromLang, toLang) {
  const prompt = `
Convert this ${fromLang} code to ${toLang}:

\`\`\`${fromLang}
${code}
\`\`\`

Return only the converted code in JSON format:
{
  "content": "converted code here",
  "message": "Converted from ${fromLang} to ${toLang}"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text()
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const jsonMatch = text.match(/{\s*[\s\S]*}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
  } catch (error) {
    throw new Error(`فشل تحويل الكود: ${error.message}`);
  }
}

// 📤 تصدير جميع الدوال
export default {
  createPlan,
  improveCode,
  generateWebsite,
  analyzeCode,
  convertCode,
  model
};

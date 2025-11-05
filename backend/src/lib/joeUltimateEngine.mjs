/**
 * JOE Ultimate Engine - المحرك النهائي الكامل
 * يجمع جميع القدرات: البحث، التصفح، التطوير، التطوير الذاتي، التحديث التلقائي
 */

import OpenAI from 'openai';
import { webSearchTools } from '../tools/webSearchTools.mjs';
import { buildTools } from '../tools/buildTools.mjs';
import { softwareDevelopmentTools } from '../tools/softwareDevelopmentTools.mjs';
import { ecommerceTools } from '../tools/ecommerceTools.mjs';
import { deploymentTools } from '../tools/deploymentTools.mjs';
import { advancedBrowserTools } from '../tools/advancedBrowserTools.mjs';
import { advancedSearchTools } from '../tools/advancedSearchTools.mjs';
import { selfEvolutionTools } from '../tools/selfEvolutionTools.mjs';
import { autoUpdateTools } from '../tools/autoUpdateTools.mjs';

const openai = new OpenAI();

/**
 * تعريف جميع الأدوات المتاحة لـ JOE Ultimate
 */
const ULTIMATE_TOOLS = [
  // أدوات البحث المتقدم
  {
    type: 'function',
    function: {
      name: 'advanced_web_search',
      description: 'بحث متقدم وذكي في الإنترنت مع تحليل النتائج',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'استعلام البحث' },
          maxResults: { type: 'number', description: 'عدد النتائج (افتراضي: 10)' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deep_search',
      description: 'بحث عميق - يبحث ثم يتصفح أفضل النتائج',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'استعلام البحث' },
          maxDepth: { type: 'number', description: 'عمق البحث (افتراضي: 3)' }
        },
        required: ['query']
      }
    }
  },
  // أدوات التصفح المتقدم
  {
    type: 'function',
    function: {
      name: 'advanced_browse',
      description: 'تصفح متقدم لأي موقع مع استخراج شامل للمحتوى',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'رابط الموقع' },
          extractImages: { type: 'boolean', description: 'استخراج الصور' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'intelligent_search_in_page',
      description: 'بحث ذكي في محتوى صفحة ويب',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'رابط الصفحة' },
          query: { type: 'string', description: 'ما تبحث عنه' }
        },
        required: ['url', 'query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compare_websites',
      description: 'مقارنة عدة مواقع وتحليل الفروقات',
      parameters: {
        type: 'object',
        properties: {
          urls: { type: 'array', items: { type: 'string' }, description: 'قائمة المواقع' }
        },
        required: ['urls']
      }
    }
  },
  // أدوات تطوير البرمجيات
  {
    type: 'function',
    function: {
      name: 'create_react_project',
      description: 'إنشاء مشروع React كامل',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'اسم المشروع' },
          features: { type: 'array', items: { type: 'string' }, description: 'المميزات' }
        },
        required: ['projectName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_express_api',
      description: 'إنشاء API بـ Express',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'اسم المشروع' },
          features: { type: 'array', items: { type: 'string' }, description: 'المميزات' }
        },
        required: ['projectName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_code',
      description: 'تحليل كود وإعطاء اقتراحات',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'الكود' },
          language: { type: 'string', description: 'اللغة' }
        },
        required: ['code']
      }
    }
  },
  // أدوات المتاجر
  {
    type: 'function',
    function: {
      name: 'create_ecommerce_store',
      description: 'إنشاء متجر إلكتروني كامل',
      parameters: {
        type: 'object',
        properties: {
          storeName: { type: 'string', description: 'اسم المتجر' },
          currency: { type: 'string', description: 'العملة' },
          language: { type: 'string', description: 'اللغة' }
        },
        required: ['storeName']
      }
    }
  },
  // أدوات النشر
  {
    type: 'function',
    function: {
      name: 'deploy_to_vercel',
      description: 'تجهيز للنشر على Vercel',
      parameters: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'مسار المشروع' },
          projectName: { type: 'string', description: 'اسم المشروع' }
        },
        required: ['projectPath', 'projectName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_dockerfile',
      description: 'إنشاء Dockerfile',
      parameters: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'مسار المشروع' },
          projectType: { type: 'string', enum: ['node', 'react'], description: 'نوع المشروع' }
        },
        required: ['projectPath']
      }
    }
  },
  // أدوات التطوير الذاتي
  {
    type: 'function',
    function: {
      name: 'analyze_my_capabilities',
      description: 'تحليل قدرات JOE الحالية',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggest_improvements',
      description: 'اقتراح تحسينات على JOE',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_new_tool',
      description: 'إنشاء أداة جديدة لـ JOE',
      parameters: {
        type: 'object',
        properties: {
          toolName: { type: 'string', description: 'اسم الأداة' },
          description: { type: 'string', description: 'وصف الأداة' }
        },
        required: ['toolName', 'description']
      }
    }
  },
  // أدوات التحديث التلقائي
  {
    type: 'function',
    function: {
      name: 'check_for_updates',
      description: 'فحص التحديثات المتاحة',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'auto_update',
      description: 'تحديث JOE تلقائياً',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

/**
 * تنفيذ الأداة
 */
async function executeUltimateFunction(functionName, args) {
  console.log(`⚡ JOE Ultimate executing: ${functionName}`, args);

  try {
    switch (functionName) {
      // البحث المتقدم
      case 'advanced_web_search':
        return await advancedSearchTools.advancedWebSearch(args.query, { maxResults: args.maxResults || 10 });
      case 'deep_search':
        return await advancedSearchTools.deepSearch(args.query, args.maxDepth || 3);
      
      // التصفح المتقدم
      case 'advanced_browse':
        return await advancedBrowserTools.advancedBrowse(args.url, { extractImages: args.extractImages });
      case 'intelligent_search_in_page':
        return await advancedBrowserTools.intelligentSearch(args.url, args.query);
      case 'compare_websites':
        return await advancedBrowserTools.compareSites(args.urls);
      
      // تطوير البرمجيات
      case 'create_react_project':
        return await softwareDevelopmentTools.createReactProject(args.projectName, args.features || []);
      case 'create_express_api':
        return await softwareDevelopmentTools.createExpressAPI(args.projectName, args.features || []);
      case 'analyze_code':
        return await softwareDevelopmentTools.analyzeCode(args.code, args.language || 'javascript');
      
      // المتاجر
      case 'create_ecommerce_store':
        return await ecommerceTools.createEcommerceStore(args.storeName, {
          currency: args.currency || 'USD',
          language: args.language || 'ar'
        });
      
      // النشر
      case 'deploy_to_vercel':
        return await deploymentTools.deployToVercel(args.projectPath, args.projectName);
      case 'create_dockerfile':
        return await deploymentTools.createDockerfile(args.projectPath, args.projectType || 'node');
      
      // التطوير الذاتي
      case 'analyze_my_capabilities':
        return await selfEvolutionTools.analyzeCurrentCapabilities();
      case 'suggest_improvements':
        return await selfEvolutionTools.suggestImprovements();
      case 'create_new_tool':
        return await selfEvolutionTools.createNewTool(args.toolName, args.description);
      
      // التحديث التلقائي
      case 'check_for_updates':
        return await autoUpdateTools.checkForUpdates();
      case 'auto_update':
        return await autoUpdateTools.autoUpdate();

      default:
        return {
          success: false,
          error: `Unknown function: ${functionName}`
        };
    }
  } catch (error) {
    console.error(`❌ Function failed:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * معالجة الرسالة مع جميع الأدوات
 */
export async function processMessageUltimate(message, context = []) {
  try {
    const messages = [
      {
        role: 'system',
        content: `أنت JOE Ultimate (Just One Engine)، أقوى نظام ذكاء اصطناعي من XElite Solutions.

🌟 **قدراتك الكاملة:**

**1. البحث والتصفح المتقدم:**
- advanced_web_search: بحث ذكي مع تحليل
- deep_search: بحث عميق مع تصفح النتائج
- advanced_browse: تصفح شامل للمواقع
- intelligent_search_in_page: بحث ذكي في الصفحات
- compare_websites: مقارنة المواقع

**2. تطوير البرمجيات:**
- create_react_project: مشاريع React
- create_express_api: APIs احترافية
- analyze_code: تحليل وتحسين الكود

**3. المتاجر الإلكترونية:**
- create_ecommerce_store: متاجر كاملة

**4. النشر:**
- deploy_to_vercel: نشر على Vercel
- create_dockerfile: Docker containers

**5. التطوير الذاتي:**
- analyze_my_capabilities: تحليل قدراتي
- suggest_improvements: اقتراح تحسينات
- create_new_tool: إنشاء أدوات جديدة

**6. التحديث التلقائي:**
- check_for_updates: فحص التحديثات
- auto_update: تحديث تلقائي

**أنت ذكي جداً، استباقي، وتطور نفسك باستمرار. استخدم الأدوات بذكاء ورد بالعربية.**`
      },
      ...context.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: ULTIMATE_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7
    });

    let assistantMessage = response.choices[0].message;
    const toolCalls = assistantMessage.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      messages.push(assistantMessage);

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResult = await executeUltimateFunction(functionName, functionArgs);

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult)
        });
      }

      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages
      });

      assistantMessage = response.choices[0].message;
    }

    return {
      success: true,
      response: assistantMessage.content,
      toolsUsed: toolCalls ? toolCalls.map(tc => tc.function.name) : []
    };

  } catch (error) {
    console.error('❌ JOE Ultimate error:', error);
    return {
      success: false,
      error: error.message,
      response: 'عذراً، حدث خطأ.'
    };
  }
}

export const joeUltimateEngine = {
  processMessageUltimate,
  ULTIMATE_TOOLS
};

/**
 * JOE Advanced Engine FULL - محرك JOE المتقدم الكامل
 * يوفر قدرات متقدمة مثل Manus AI مع جميع الأدوات
 */

import OpenAI from 'openai';
import { webSearchTools } from '../tools/webSearchTools.mjs';
import { buildTools } from '../tools/buildTools.mjs';
import { browserTools } from '../tools/browserTools.mjs';
import { softwareDevelopmentTools } from '../tools/softwareDevelopmentTools.mjs';
import { ecommerceTools } from '../tools/ecommerceTools.mjs';
import { deploymentTools } from '../tools/deploymentTools.mjs';

const openai = new OpenAI();

/**
 * تعريف جميع الأدوات المتاحة لـ JOE
 */
const TOOLS = [
  // أدوات البحث والتصفح
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'البحث في الإنترنت عن معلومات محدثة',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'استعلام البحث' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'الحصول على معلومات الطقس',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'اسم المدينة' }
        },
        required: ['city']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browse_website',
      description: 'تصفح موقع ويب وجمع المعلومات منه',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'رابط الموقع' }
        },
        required: ['url']
      }
    }
  },
  // أدوات تطوير البرمجيات
  {
    type: 'function',
    function: {
      name: 'create_react_project',
      description: 'إنشاء مشروع React كامل مع جميع الإعدادات',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'اسم المشروع' },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: 'المميزات المطلوبة (router, tailwind, etc.)'
          }
        },
        required: ['projectName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_express_api',
      description: 'إنشاء API باستخدام Express.js',
      parameters: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'اسم المشروع' },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: 'المميزات (mongodb, auth, etc.)'
          }
        },
        required: ['projectName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_code',
      description: 'تحليل كود وإعطاء اقتراحات للتحسين',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'الكود المراد تحليله' },
          language: { type: 'string', description: 'لغة البرمجة' }
        },
        required: ['code']
      }
    }
  },
  // أدوات المتاجر الإلكترونية
  {
    type: 'function',
    function: {
      name: 'create_ecommerce_store',
      description: 'إنشاء متجر إلكتروني كامل مع سلة تسوق ونظام دفع',
      parameters: {
        type: 'object',
        properties: {
          storeName: { type: 'string', description: 'اسم المتجر' },
          currency: { type: 'string', description: 'العملة (USD, EUR, SAR)' },
          language: { type: 'string', description: 'اللغة (ar, en)' }
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
      description: 'تجهيز المشروع للنشر على Vercel',
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
      description: 'إنشاء Dockerfile للمشروع',
      parameters: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'مسار المشروع' },
          projectType: { type: 'string', enum: ['node', 'react'], description: 'نوع المشروع' }
        },
        required: ['projectPath']
      }
    }
  }
];

/**
 * تنفيذ الأداة المطلوبة
 */
async function executeFunction(functionName, args) {
  console.log(`🔧 JOE executing: ${functionName}`, args);

  try {
    switch (functionName) {
      // أدوات البحث
      case 'search_web':
        return await webSearchTools.searchWeb(args.query);
      case 'get_weather':
        return await webSearchTools.getWeather(args.city);
      case 'browse_website':
        return await browserTools.browseWebsite(args.url);
      
      // أدوات تطوير البرمجيات
      case 'create_react_project':
        return await softwareDevelopmentTools.createReactProject(args.projectName, args.features || []);
      case 'create_express_api':
        return await softwareDevelopmentTools.createExpressAPI(args.projectName, args.features || []);
      case 'analyze_code':
        return await softwareDevelopmentTools.analyzeCode(args.code, args.language || 'javascript');
      
      // أدوات المتاجر
      case 'create_ecommerce_store':
        return await ecommerceTools.createEcommerceStore(args.storeName, {
          currency: args.currency || 'USD',
          language: args.language || 'ar'
        });
      
      // أدوات النشر
      case 'deploy_to_vercel':
        return await deploymentTools.deployToVercel(args.projectPath, args.projectName);
      case 'create_dockerfile':
        return await deploymentTools.createDockerfile(args.projectPath, args.projectType || 'node');

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
 * معالجة الرسالة مع Function Calling
 */
export async function processMessageWithTools(message, context = []) {
  try {
    const messages = [
      {
        role: 'system',
        content: `أنت JOE (Just One Engine)، ذكاء اصطناعي متقدم من XElite Solutions بقدرات مثل Manus AI.

🌟 **قدراتك الكاملة:**

**1. البحث والتصفح:**
- search_web: البحث في الإنترنت
- get_weather: معلومات الطقس
- browse_website: تصفح المواقع

**2. تطوير البرمجيات:**
- create_react_project: إنشاء مشروع React كامل
- create_express_api: إنشاء API بـ Express
- analyze_code: تحليل وتحسين الكود

**3. المتاجر الإلكترونية:**
- create_ecommerce_store: بناء متجر إلكتروني كامل

**4. النشر والاستضافة:**
- deploy_to_vercel: النشر على Vercel
- create_dockerfile: إنشاء Docker container

**قواعد:**
- استخدم الأدوات تلقائياً عندما تحتاج
- كن ذكياً واستباقياً
- رد بالعربية بشكل طبيعي
- اشرح ما قمت به بوضوح`
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
      tools: TOOLS,
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
        const functionResult = await executeFunction(functionName, functionArgs);

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
    console.error('❌ JOE error:', error);
    return {
      success: false,
      error: error.message,
      response: 'عذراً، حدث خطأ.'
    };
  }
}

export const joeAdvancedEngineFull = {
  processMessageWithTools,
  TOOLS
};

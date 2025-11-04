/**
 * JOE Advanced Engine - محرك JOE المتقدم
 * يوفر قدرات متقدمة مثل Manus AI مع Function Calling
 */

import OpenAI from 'openai';
import { webSearchTools } from '../tools/webSearchTools.mjs';
import { buildTools } from '../tools/buildTools.mjs';
import { browserTools } from '../tools/browserTools.mjs';

const openai = new OpenAI();

/**
 * تعريف جميع الأدوات المتاحة لـ JOE
 */
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'البحث في الإنترنت عن معلومات محدثة',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'استعلام البحث'
          }
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
          city: {
            type: 'string',
            description: 'اسم المدينة'
          }
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
          url: {
            type: 'string',
            description: 'رابط الموقع المراد تصفحه'
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'extract_info_from_url',
      description: 'استخراج معلومات محددة من صفحة ويب',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'رابط الموقع'
          },
          query: {
            type: 'string',
            description: 'المعلومات المطلوب البحث عنها'
          }
        },
        required: ['url', 'query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'build_website',
      description: 'بناء موقع ويب كامل',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'وصف الموقع المطلوب'
          },
          projectType: {
            type: 'string',
            enum: ['website', 'landing-page', 'portfolio', 'blog', 'e-commerce'],
            description: 'نوع المشروع'
          }
        },
        required: ['description', 'projectType']
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
      case 'search_web':
        return await webSearchTools.searchWeb(args.query);

      case 'get_weather':
        return await webSearchTools.getWeather(args.city);

      case 'browse_website':
        return await browserTools.browseWebsite(args.url);

      case 'extract_info_from_url':
        return await browserTools.extractInfo(args.url, args.query);

      case 'build_website':
        return await buildTools.buildProject({
          projectType: args.projectType,
          description: args.description,
          style: 'modern',
          features: ['Responsive', 'Animations']
        });

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
        content: `أنت JOE (Just One Engine)، ذكاء اصطناعي متقدم من XElite Solutions. لديك قدرات متقدمة: البحث على الإنترنت (search_web)، تصفح المواقع (browse_website)، استخراج المعلومات (extract_info_from_url)، معلومات الطقس (get_weather)، بناء المواقع (build_website). استخدم الأدوات تلقائياً عندما تحتاج إليها. رد دائماً بالعربية بشكل طبيعي وودود.`
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

export const joeAdvancedEngine = {
  processMessageWithTools,
  TOOLS
};

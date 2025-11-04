/**
 * JOE Function Calling System
 * نظام متقدم لاستخدام الأدوات والوظائف - مثل Manus AI
 */

import { webSearchTools } from '../tools/webSearchTools.mjs';
import { buildTools } from '../tools/buildTools.mjs';
import { githubTools } from '../tools/githubTools.mjs';
import { renderTools } from '../tools/renderTools.mjs';
import { mongodbTools } from '../tools/mongodbTools.mjs';
import { cloudflareTools } from '../tools/cloudflareTools.mjs';
import { testingTools } from '../tools/testingTools.mjs';
import { evolutionTools } from '../tools/evolutionTools.mjs';

/**
 * تعريف جميع الأدوات المتاحة لـ JOE
 */
export const JOE_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'البحث في الإنترنت عن معلومات محدثة. استخدم هذه الأداة عندما تحتاج إلى معلومات حديثة أو أخبار أو بيانات من الويب.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'استعلام البحث (مثل: "أخبار الذكاء الاصطناعي 2025")'
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
      description: 'الحصول على معلومات الطقس الحالية لمدينة معينة',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'اسم المدينة (مثل: "Istanbul", "Dubai", "Cairo")'
          }
        },
        required: ['city']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'build_website',
      description: 'بناء موقع ويب كامل بناءً على الوصف المعطى',
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
  },
  {
    type: 'function',
    function: {
      name: 'deploy_to_github',
      description: 'نشر الكود على GitHub',
      parameters: {
        type: 'object',
        properties: {
          repoName: {
            type: 'string',
            description: 'اسم المستودع'
          },
          code: {
            type: 'string',
            description: 'الكود المراد نشره'
          }
        },
        required: ['repoName', 'code']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deploy_to_render',
      description: 'نشر الموقع على Render.com',
      parameters: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: 'اسم الخدمة'
          },
          githubRepo: {
            type: 'string',
            description: 'رابط مستودع GitHub'
          }
        },
        required: ['serviceName', 'githubRepo']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_tests',
      description: 'تشغيل الاختبارات للتحقق من صحة النظام',
      parameters: {
        type: 'object',
        properties: {
          testType: {
            type: 'string',
            enum: ['health', 'diagnostic', 'integration'],
            description: 'نوع الاختبار'
          }
        },
        required: ['testType']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'evolve_self',
      description: 'تطوير وتحسين قدرات JOE الذاتية',
      parameters: {
        type: 'object',
        properties: {
          aspect: {
            type: 'string',
            description: 'الجانب المراد تطويره (مثل: "intelligence", "speed", "capabilities")'
          }
        },
        required: []
      }
    }
  }
];

/**
 * تنفيذ الأداة المطلوبة
 */
export async function executeFunction(functionName, args) {
  console.log(`🔧 JOE is executing function: ${functionName}`, args);

  try {
    switch (functionName) {
      case 'search_web':
        return await webSearchTools.searchWeb(args.query);

      case 'get_weather':
        return await webSearchTools.getWeather(args.city);

      case 'build_website':
        return await buildTools.buildProject({
          projectType: args.projectType,
          description: args.description,
          style: 'modern',
          features: ['Responsive', 'Animations']
        });

      case 'deploy_to_github':
        return await githubTools.createRepo(args.repoName, args.code);

      case 'deploy_to_render':
        return await renderTools.deployService(args.serviceName, args.githubRepo);

      case 'run_tests':
        if (args.testType === 'health') {
          return await testingTools.runHealthChecks();
        } else if (args.testType === 'diagnostic') {
          return await testingTools.runDiagnostic();
        } else {
          return await testingTools.runIntegrationTests();
        }

      case 'evolve_self':
        return await evolutionTools.analyzeSelf();

      default:
        return {
          success: false,
          error: `Unknown function: ${functionName}`
        };
    }
  } catch (error) {
    console.error(`❌ Function execution failed:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

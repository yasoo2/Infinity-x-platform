
// 📁 backend/src/lib/joeAdvancedEngine-fixed.mjs - النسخة الكاملة والمطورة
// 🎯 ٤٥٠+ سطر مع جميع مميزات Manus المتقدمة

import { OpenAI } from 'openai';
import { MongoClient, ObjectId } from 'mongodb';
import { getDB } from '../db.mjs';
import { WebSocket } from 'ws';
import puppeteer from 'puppeteer-core';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

// 🔌 إعداد OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-proj-dummy'
});

// ... (بقية الكود يبقى كما هو)

// 🧠 المحرك المتقدم
class JoeAdvancedEngine {
    // ... (بقية الكود يبقى كما هو)

    async processCommand(command, userId, streamSessionId) {
        // ... (بقية الكود يبقى كما هو)

        let context = {
            userId,
            command,
            timestamp: new Date(),
            toolsAvailable: this.getAvailableTools(),
            systemStatus: await this.getSystemStatus()
        };

        // ... (بقية الكود يبقى كما هو)

        try {
            // ... (بقية الكود يبقى كما هو)

            // 💡 التطوير: جلب سياق المحادثة وتمريره إلى النموذج
            const conversationContext = await memoryTools.getConversationContext(userId, 5);
            if (conversationContext && conversationContext.length > 0) {
                context.conversationHistory = conversationContext;
            }

            // ... (بقية الكود يبقى كما هو)

        } catch (error) {
            // ... (بقية الكود يبقى كما هو)
        }
    } * JOE Ultimate Engine - المحرك النهائي الكامل
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

    /**
 * JOE Manus Engine - المحرك الكامل بقوة Manus AI
 * يجمع جميع القدرات مع System Prompt ذكي
 */

import OpenAI from 'openai';
import MANUS_STYLE_PROMPT from '../prompts/manusStylePrompt.mjs';
import { fileSystemTools } from '../tools/fileSystemTools.mjs';
import { gitTools } from '../tools/gitTools.mjs';
import { searchTools } from '../tools/searchTools.mjs';
import { webSearchTools } from '../tools/webSearchTools.mjs';
import { buildTools } from '../tools/buildTools.mjs';
import { memoryTools } from '../tools/memoryTools.mjs';
import { multimodalTools } from '../tools/multimodalTools.mjs';
import { automationTools } from '../tools/automationTools.mjs';

const openai = new OpenAI();

/**
 * تعريف جميع الأدوات (Manus-Style)
 */
const MANUS_TOOLS = [
  // File System Tools
  {
    type: 'function',
    function: {
      name: 'readFile',
      description: 'قراءة محتوى ملف',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'مسار الملف' }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'writeFile',
      description: 'كتابة أو إنشاء ملف',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'مسار الملف' },
          content: { type: 'string', description: 'المحتوى' }
        },
        required: ['filePath', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'editFile',
      description: 'تعديل ملف (البحث والاستبدال)',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: 'مسار الملف' },
          findText: { type: 'string', description: 'النص المراد البحث عنه' },
          replaceText: { type: 'string', description: 'النص البديل' },
          replaceAll: { type: 'boolean', description: 'استبدال جميع التطابقات' }
        },
        required: ['filePath', 'findText', 'replaceText']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listDirectory',
      description: 'عرض محتويات مجلد',
      parameters: {
        type: 'object',
        properties: {
          dirPath: { type: 'string', description: 'مسار المجلد' },
          recursive: { type: 'boolean', description: 'بحث متداخل' }
        },
        required: ['dirPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'findFiles',
      description: 'البحث عن ملفات',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'نمط البحث' },
          directory: { type: 'string', description: 'المجلد' }
        },
        required: ['pattern']
      }
    }
  },
  // Git Tools
  {
    type: 'function',
    function: {
      name: 'gitQuickCommit',
      description: 'عملية Git سريعة: add + commit + push',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'رسالة الـ commit' },
          files: { type: 'array', items: { type: 'string' }, description: 'الملفات' },
          branch: { type: 'string', description: 'الفرع' },
          directory: { type: 'string', description: 'المجلد' }
        },
        required: ['message']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'gitStatus',
      description: 'عرض حالة Git',
      parameters: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'المجلد' }
        }
      }
    }
  },
  // Search Tools
  {
    type: 'function',
    function: {
      name: 'searchInFiles',
      description: 'البحث في محتوى الملفات',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'نص البحث' },
          directory: { type: 'string', description: 'المجلد' },
          filePattern: { type: 'string', description: 'نمط الملفات' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchInCode',
      description: 'البحث في الكود مع السياق',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'نص البحث' },
          directory: { type: 'string', description: 'المجلد' },
          contextLines: { type: 'number', description: 'عدد سطور السياق' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'findFunction',
      description: 'البحث عن دالة في الكود',
      parameters: {
        type: 'object',
        properties: {
          functionName: { type: 'string', description: 'اسم الدالة' },
          directory: { type: 'string', description: 'المجلد' }
        },
        required: ['functionName']
      }
    }
  },
  // Web Search Tools
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'البحث في الإنترنت',
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
      name: 'browse_website',
      description: 'تصفح موقع ويب',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'رابط الموقع' }
        },
        required: ['url']
      }
    }
  },
  // Multimodal Tools - Image Generation
  {
    type: 'function',
    function: {
      name: 'generateImage',
      description: 'إنشاء صورة باستخدام DALL-E 3',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'وصف الصورة المطلوبة' },
          size: { type: 'string', description: 'حجم الصورة (1024x1024, 1792x1024, 1024x1792)', enum: ['1024x1024', '1792x1024', '1024x1792'] },
          quality: { type: 'string', description: 'جودة الصورة (standard, hd)', enum: ['standard', 'hd'] }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyzeImage',
      description: 'تحليل صورة باستخدام Vision AI',
      parameters: {
        type: 'object',
        properties: {
          imageUrl: { type: 'string', description: 'رابط الصورة' },
          prompt: { type: 'string', description: 'ما تريد معرفته عن الصورة' }
        },
        required: ['imageUrl']
      }
    }
  },
  // Build Tools
  {
    type: 'function',
    function: {
      name: 'build_website',
      description: 'بناء موقع ويب كامل',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'وصف الموقع' },
          features: { type: 'array', items: { type: 'string' }, description: 'الميزات المطلوبة' }
        },
        required: ['description']
      }
    }
  }
];

/**
 * تنفيذ الأدوات
 */
async function executeManusFunction(functionName, args) {
  try {
    switch (functionName) {
      // File System
      case 'readFile':
        return await fileSystemTools.readFile(args.filePath);
      case 'writeFile':
        return await fileSystemTools.writeFile(args.filePath, args.content);
      case 'editFile':
        return await fileSystemTools.editFile(args.filePath, args.findText, args.replaceText, args.replaceAll);
      case 'listDirectory':
        return await fileSystemTools.listDirectory(args.dirPath, args.recursive);
      case 'findFiles':
        return await fileSystemTools.findFiles(args.pattern, args.directory);

      // Git
      case 'gitQuickCommit':
        return await gitTools.gitQuickCommit(args.message, args.files, args.branch, args.directory);
      case 'gitStatus':
        return await gitTools.gitStatus(args.directory);

      // Search
      case 'searchInFiles':
        return await searchTools.searchInFiles(args.query, args.directory, args.filePattern);
      case 'searchInCode':
        return await searchTools.searchInCode(args.query, args.directory, args.contextLines);
      case 'findFunction':
        return await searchTools.findFunction(args.functionName, args.directory);

      // Web
      case 'search_web':
        return await webSearchTools.searchWeb(args.query);
      case 'browse_website':
        return await webSearchTools.browseWebsite(args.url);

      // Multimodal - Images
      case 'generateImage':
        return await multimodalTools.generateImage(args.prompt, args.size, args.quality);
      case 'analyzeImage':
        return await multimodalTools.analyzeImage(args.imageUrl, args.prompt);

      // Build
      case 'build_website':
        return await buildTools.buildWebsite(args.description, args.features);

      default:
        return { success: false, error: `Unknown function: ${functionName}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * معالجة الرسائل مع Manus-Style
 */
export async function processMessageManus(userMessage, userId = 'default') {
  try {
    // استرجاع السياق من الذاكرة
    const context = await memoryTools.getConversationContext(userId, 5);

    const messages = [
      {
        role: 'system',
        content: MANUS_STYLE_PROMPT
      },
      {
        role: 'user',
        content: userMessage
      }
    ];

    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: MANUS_TOOLS,
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
        const functionResult = await executeManusFunction(functionName, functionArgs);

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

    // حفظ المحادثة في الذاكرة
    await memoryTools.saveConversation(userId, userMessage, assistantMessage.content);

    return {
      success: true,
      response: assistantMessage.content,
      toolsUsed: toolCalls ? toolCalls.map(tc => tc.function.name) : []
    };

  } catch (error) {
    console.error('❌ JOE Manus error:', error);
    return {
      success: false,
      error: error.message,
      response: 'عذراً، حدث خطأ.'
    };
  }
}

export const joeManusEngine = {
  processMessageManus,
  MANUS_TOOLS
};

// Export for compatibility
export const joeAdvancedEngine = joeManusEngine;
export const joeUltimateEngine = joeManusEngine;
}

// ... (بقية الكود يبقى كما هو)

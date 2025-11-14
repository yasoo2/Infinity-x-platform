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
    // استرجاع السياق من الذاكرة (تم تعطيله مؤقتاً لتحديد الخطأ)
    // const context = await memoryTools.getConversationContext(userId, 5);
    const context = [];
    
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
  processMessageUltimate: processMessageManus,
  processMessageWithTools: processMessageManus,
  MANUS_TOOLS
};

// Export for compatibility
export const joeAdvancedEngine = joeManusEngine;
export const joeUltimateEngine = joeManusEngine;
export { processMessageManus as processMessageUltimate };

  /**
   * 🚀 JOE Advanced Engine - المحرك الأقوى والأذكى
   * النسخة المحسّنة مع قدرات متقدمة جداً
   * 
   * @module joeAdvancedEngine
   * @version 4.0.0 - Ultimate Edition
   */

  import OpenAI from 'openai';
  import { getDB } from '../db.mjs';

  // ✅ استيراد جميع الأدوات
  import { fileSystemTools } from '../tools/fileSystemTools.mjs';
  import { gitTools } from '../tools/gitTools.mjs';
  import { searchTools } from '../tools/searchTools.mjs';
  import { webSearchTools } from '../tools/webSearchTools.mjs';
  import { buildTools } from '../tools/buildTools.mjs';
  import { memoryTools } from '../tools/memoryTools.mjs';
  import { multimodalTools } from '../tools/multimodalTools.mjs';
  import { automationTools } from '../tools/automationTools.mjs';
  import { advancedBrowserTools } from '../tools/advancedBrowserTools.mjs';
  import { advancedSearchTools } from '../tools/advancedSearchTools.mjs';
  import { softwareDevelopmentTools } from '../tools/softwareDevelopmentTools.mjs';
  import { ecommerceTools } from '../tools/ecommerceTools.mjs';
  import { deploymentTools } from '../tools/deploymentTools.mjs';
  import { selfEvolutionTools } from '../tools/selfEvolutionTools.mjs';
  import { autoUpdateTools } from '../tools/autoUpdateTools.mjs';

  // ✅ استيراد System Prompt
  import MANUS_STYLE_PROMPT from '../prompts/manusStylePrompt.mjs';

  // ✅ إعداد OpenAI
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // =========================
  // 🧠 نظام الذاكرة المتقدم
  // =========================

  class AdvancedMemorySystem {
    constructor() {
      this.shortTermMemory = new Map();
      this.workingMemory = new Map();
      this.semanticMemory = new Map();
    }

    saveShortTerm(userId, key, value, ttl = 300000) {
      const data = { value, timestamp: Date.now(), ttl };
      this.shortTermMemory.set(`${userId}:${key}`, data);
      setTimeout(() => this.shortTermMemory.delete(`${userId}:${key}`), ttl);
    }

    getShortTerm(userId, key) {
      const data = this.shortTermMemory.get(`${userId}:${key}`);
      if (!data || Date.now() - data.timestamp > data.ttl) {
        this.shortTermMemory.delete(`${userId}:${key}`);
        return null;
      }
      return data.value;
    }

    saveWorkingMemory(userId, taskId, context) {
      this.workingMemory.set(`${userId}:${taskId}`, {
        context,
        timestamp: Date.now(),
        status: 'active'
      });
    }

    getWorkingMemory(userId, taskId) {
      return this.workingMemory.get(`${userId}:${taskId}`);
    }
  }

  const advancedMemory = new AdvancedMemorySystem();

  // =========================
  // 🎯 نظام اتخاذ القرار الذكي
  // =========================

  class IntelligentDecisionMaker {
    constructor() {
      this.decisionHistory = [];
      this.successRate = new Map();
    }

    detectRequestType(message) {
      const patterns = {
        search: /ابحث|بحث|search|find/i,
        code: /كود|برمجة|code|program/i,
        image: /صورة|image|picture/i,
        analysis: /حلل|analyze/i,
        build: /انشئ|create|build/i
      };

      for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(message)) return type;
      }
      return 'general';
    }

    estimateComplexity(message) {
      let complexity = 1;
      if (message.length > 200) complexity += 1;
      if (/متقدم|advanced/i.test(message)) complexity += 2;
      return Math.min(complexity, 5);
    }
  }

  const decisionMaker = new IntelligentDecisionMaker();

  // =========================
  // 🛠️ تعريف جميع الأدوات
  // =========================

  const ALL_TOOLS = [
    // 📁 File System
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
        description: 'كتابة ملف',
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
        description: 'تعديل ملف',
        parameters: {
          type: 'object',
          properties: {
            filePath: { type: 'string' },
            findText: { type: 'string' },
            replaceText: { type: 'string' },
            replaceAll: { type: 'boolean' }
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
            dirPath: { type: 'string' },
            recursive: { type: 'boolean' }
          },
          required: ['dirPath']
        }
      }
    },
    // 🔀 Git
    {
      type: 'function',
      function: {
        name: 'gitQuickCommit',
        description: 'Git: add + commit + push',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            files: { type: 'array', items: { type: 'string' } },
            branch: { type: 'string' }
          },
          required: ['message']
        }
      }
    },
    // 🔍 Search
    {
      type: 'function',
      function: {
        name: 'searchInFiles',
        description: 'البحث في الملفات',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            directory: { type: 'string' }
          },
          required: ['query']
        }
      }
    },
    // 🌐 Web
    {
      type: 'function',
      function: {
        name: 'search_web',
        description: 'البحث في الإنترنت',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'browse_website',
        description: 'تصفح موقع',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string' }
          },
          required: ['url']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'advanced_web_search',
        description: 'بحث متقدم',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            maxResults: { type: 'number' }
          },
          required: ['query']
        }
      }
    },
    // 🖼️ Images
    {
      type: 'function',
      function: {
        name: 'generateImage',
        description: 'إنشاء صورة بـ DALL-E',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string' },
            size: { type: 'string', enum: ['1024x1024', '1792x1024', '1024x1792'] }
          },
          required: ['prompt']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'analyzeImage',
        description: 'تحليل صورة',
        parameters: {
          type: 'object',
          properties: {
            imageUrl: { type: 'string' },
            prompt: { type: 'string' }
          },
          required: ['imageUrl']
        }
      }
    },
    // 💻 Development
    {
      type: 'function',
      function: {
        name: 'create_react_project',
        description: 'إنشاء مشروع React',
        parameters: {
          type: 'object',
          properties: {
            projectName: { type: 'string' },
            features: { type: 'array', items: { type: 'string' } }
          },
          required: ['projectName']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'analyze_code',
        description: 'تحليل كود',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' }
          },
          required: ['code']
        }
      }
    },
    // 🛒 E-commerce
    {
      type: 'function',
      function: {
        name: 'create_ecommerce_store',
        description: 'إنشاء متجر إلكتروني',
        parameters: {
          type: 'object',
          properties: {
            storeName: { type: 'string' },
            currency: { type: 'string' }
          },
          required: ['storeName']
        }
      }
    },
    // 🧮 أدوات جديدة - الحسابات
    {
      type: 'function',
      function: {
        name: 'calculate',
        description: 'حسابات رياضية معقدة',
        parameters: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'التعبير الرياضي' }
          },
          required: ['expression']
        }
      }
    },
    // 📊 تحليل البيانات
    {
      type: 'function',
      function: {
        name: 'analyze_data',
        description: 'تحليل بيانات إحصائي',
        parameters: {
          type: 'object',
          properties: {
            data: { type: 'array', description: 'البيانات' },
            analysisType: { type: 'string', enum: ['statistical', 'trend', 'prediction'] }
          },
          required: ['data', 'analysisType']
        }
      }
    },
    // 🔐 الأمان
    {
      type: 'function',
      function: {
        name: 'security_audit',
        description: 'فحص أمني للكود',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            language: { type: 'string' }
          },
          required: ['code']
        }
      }
    },
    // 📝 معالجة النصوص
    {
      type: 'function',
      function: {
        name: 'advanced_text_processing',
        description: 'ترجمة، تلخيص، إعادة صياغة',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            operation: { type: 'string', enum: ['translate', 'summarize', 'paraphrase', 'sentiment'] },
            targetLanguage: { type: 'string' }
          },
          required: ['text', 'operation']
        }
      }
    },
    // 🗄️ قواعد البيانات
    {
      type: 'function',
      function: {
        name: 'database_query',
        description: 'استعلام قاعدة بيانات',
        parameters: {
          type: 'object',
          properties: {
            collection: { type: 'string' },
            operation: { type: 'string', enum: ['find', 'count', 'aggregate'] },
            query: { type: 'object' }
          },
          required: ['collection', 'operation']
        }
      }
    }
  ];

  // =========================
  // ⚙️ تنفيذ الأدوات
  // =========================

  async function executeFunction(functionName, args) {
    console.log(`⚡ Executing: ${functionName}`);

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

        // Git
        case 'gitQuickCommit':
          return await gitTools.gitQuickCommit(args.message, args.files, args.branch);

        // Search
        case 'searchInFiles':
          return await searchTools.searchInFiles(args.query, args.directory);

        // Web
        case 'search_web':
          return await webSearchTools.searchWeb(args.query);
        case 'browse_website':
          return await webSearchTools.browseWebsite(args.url);
        case 'advanced_web_search':
          return await advancedSearchTools.advancedWebSearch(args.query, { maxResults: args.maxResults || 10 });

        // Images
        case 'generateImage':
          return await multimodalTools.generateImage(args.prompt, args.size);
        case 'analyzeImage':
          return await multimodalTools.analyzeImage(args.imageUrl, args.prompt);

        // Development
        case 'create_react_project':
          return await softwareDevelopmentTools.createReactProject(args.projectName, args.features || []);
        case 'analyze_code':
          return await softwareDevelopmentTools.analyzeCode(args.code, args.language || 'javascript');

        // E-commerce
        case 'create_ecommerce_store':
          return await ecommerceTools.createEcommerceStore(args.storeName, { currency: args.currency || 'USD' });

        // الأدوات الجديدة
        case 'calculate':
          return calculateExpression(args.expression);
        case 'analyze_data':
          return analyzeData(args.data, args.analysisType);
        case 'security_audit':
          return securityAudit(args.code, args.language);
        case 'advanced_text_processing':
          return await advancedTextProcessing(args.text, args.operation, args.targetLanguage);
        case 'database_query':
          return await databaseQuery(args.collection, args.operation, args.query);

        default:
          return { success: false, error: `Unknown function: ${functionName}` };
      }
    } catch (error) {
      console.error(`❌ Function failed:`, error);
      return { success: false, error: error.message };
    }
  }

  // =========================
  // 🛠️ تطبيق الأدوات الجديدة
  // =========================

  function calculateExpression(expression) {
    try {
      const result = Function(`'use strict'; return (${expression})`)();
      return { success: true, expression, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  function analyzeData(data, analysisType) {
    try {
      let analysis = {};

      if (analysisType === 'statistical') {
        const sum = data.reduce((a, b) => a + b, 0);
        const mean = sum / data.length;
        const sorted = [...data].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        
        analysis = {
          count: data.length,
          sum,
          mean,
          median,
          min: Math.min(...data),
          max: Math.max(...data)
        };
      }

      return { success: true, analysisType, analysis };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  function securityAudit(code, language = 'javascript') {
    try {
      const issues = [];
      
      if (/eval\s*\(/.test(code)) {
        issues.push({ type: 'Code Injection', severity: 'critical', message: 'eval() detected' });
      }
      if (/innerHTML\s*=/.test(code)) {
        issues.push({ type: 'XSS', severity: 'medium', message: 'innerHTML usage detected' });
      }

      return {
        success: true,
        language,
        issues,
        score: Math.max(0, 100 - issues.length * 20)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function advancedTextProcessing(text, operation, targetLanguage) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: operation === 'translate' 
              ? `Translate to ${targetLanguage}` 
              : operation === 'summarize'
              ? 'Summarize this text'
              : 'Paraphrase this text'
          },
          { role: 'user', content: text }
        ]
      });

      return {
        success: true,
        operation,
        result: response.choices[0].message.content
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async function databaseQuery(collection, operation, query) {
    try {
      const db = await getDB();
      let result;

      switch (operation) {
        case 'find':
          result = await db.collection(collection).find(query || {}).toArray();
          break;
        case 'count':
          result = await db.collection(collection).countDocuments(query || {});
          break;
        case 'aggregate':
          result = await db.collection(collection).aggregate(query || []).toArray();
          break;
      }

      return { success: true, collection, operation, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // =========================
  // 💬 معالجة الرسائل الذكية
  // =========================

  export async function processMessage(userMessage, userId = 'default') {
    try {
      console.log(`📨 Processing message for user: ${userId}`);

      // تحليل الطلب
      const requestType = decisionMaker.detectRequestType(userMessage);
      const complexity = decisionMaker.estimateComplexity(userMessage);
      
      console.log(`🎯 Request type: ${requestType}, Complexity: ${complexity}`);

      // حفظ في الذاكرة قصيرة المدى
      advancedMemory.saveShortTerm(userId, 'lastRequest', {
        message: userMessage,
        type: requestType,
        complexity
      });

      // استرجاع السياق
      let conversationHistory = [];
      try {
        const context = await memoryTools.getConversationContext(userId, 5);
        if (context && Array.isArray(context)) {
          conversationHistory = context;
        }
      } catch (error) {
        console.warn('⚠️  Could not load history');
      }

      // بناء الرسائل
      const messages = [
        {
          role: 'system',
          content: MANUS_STYLE_PROMPT || `أنت JOE (Just One Engine)، مساعد ذكي متقدم من XElite Solutions.

🌟 **قدراتك:**

**1. البحث والتصفح:**
- بحث في الإنترنت وتصفح المواقع
- بحث متقدم مع تحليل

**2. إدارة الملفات:**
- قراءة وكتابة وتعديل الملفات
- البحث في الكود
- إدارة Git

**3. تطوير البرمجيات:**
- إنشاء مشاريع React و Express
- تحليل الكود
- فحص أمني

**4. الصور:**
- إنشاء صور بـ DALL-E 3
- تحليل الصور

**5. أدوات متقدمة:**
- حسابات رياضية
- تحليل بيانات إحصائي
- معالجة نصوص (ترجمة، تلخيص)
- استعلامات قواعد البيانات

**6. المتاجر:**
- إنشاء متاجر إلكترونية كاملة

استخدم الأدوات بذكاء ورد بالعربية بشكل واضح ومفيد.`
        },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: userMessage
        }
      ];

      // الطلب الأول
      let response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: ALL_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 4000
      });

      let assistantMessage = response.choices[0].message;
      const toolCalls = assistantMessage.tool_calls;

      // تنفيذ الأدوات
      if (toolCalls && toolCalls.length > 0) {
        console.log(`🔧 Executing ${toolCalls.length} tool(s)...`);
        
        messages.push(assistantMessage);

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`  → ${functionName}`);
          const functionResult = await executeFunction(functionName, functionArgs);

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          });
        }

        // الطلب الثاني
        response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 4000
        });

        assistantMessage = response.choices[0].message;
      }

      // حفظ المحادثة
      try {
        await memoryTools.saveConversation(userId, userMessage, assistantMessage.content);
      } catch (error) {
        console.warn('⚠️  Could not save conversation');
      }

      return {
        success: true,
        response: assistantMessage.content,
        toolsUsed: toolCalls ? toolCalls.map(tc => tc.function.name) : [],
        requestType,
        complexity,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ JOE error:', error);
      return {
        success: false,
        error: error.message,
        response: 'عذراً، حدث خطأ أثناء معالجة طلبك.',
        timestamp: new Date().toISOString()
      };
    }
  }

  // =========================
  // 📤 Exports
  // =========================

  export const joeAdvancedEngine = {
    processMessage,
    tools: ALL_TOOLS,
    executeFunction,
    advancedMemory,
    decisionMaker
  };

  export const joeManusEngine = joeAdvancedEngine;
  export const joeUltimateEngine = joeAdvancedEngine;

  export default joeAdvancedEngine;
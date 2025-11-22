/**
 * Self Evolution Tools - أدوات التطوير الذاتي
 * يسمح لـ JOE بتطوير نفسه وتحديث قدراته تلقائياً
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';

const execAsync = promisify(exec);
const openai = new OpenAI();

/**
 * تحليل قدرات JOE الحالية
 */
export async function analyzeCurrentCapabilities() {
  try {
    console.log('🔍 Analyzing JOE current capabilities...');

    const toolsPath = path.join(process.cwd(), 'src', 'tools');
    const files = await fs.readdir(toolsPath);
    
    const capabilities = {
      totalTools: 0,
      toolFiles: [],
      functions: []
    };

    for (const file of files) {
      if (file.endsWith('.mjs') || file.endsWith('.js')) {
        const filePath = path.join(toolsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // استخراج الدوال المصدرة
        const exportMatches = content.match(/export\s+(async\s+)?function\s+(\w+)/g) || [];
        const functions = exportMatches.map(m => m.match(/function\s+(\w+)/)[1]);
        
        capabilities.toolFiles.push({
          name: file,
          path: filePath,
          functions,
          size: content.length
        });
        
        capabilities.functions.push(...functions);
        capabilities.totalTools += functions.length;
      }
    }

    return {
      success: true,
      capabilities,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Analyze capabilities error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * اقتراح تحسينات على JOE
 */
export async function suggestImprovements() {
  try {
    console.log('💡 Suggesting improvements for JOE...');

    const currentCaps = await analyzeCurrentCapabilities();
    
    if (!currentCaps.success) {
      return currentCaps;
    }

    const prompt = `أنت مستشار تطوير AI. قم بتحليل قدرات JOE الحالية واقترح تحسينات:

**القدرات الحالية:**
${JSON.stringify(currentCaps.capabilities, null, 2)}

**المطلوب:**
1. تحديد النقاط القوية
2. تحديد الفجوات والنقاط الضعيفة
3. اقتراح أدوات جديدة يجب إضافتها
4. اقتراح تحسينات على الأدوات الموجودة

رد بصيغة JSON:
{
  "strengths": ["..."],
  "weaknesses": ["..."],
  "suggestedTools": [{"name": "...", "description": "...", "priority": "high/medium/low"}],
  "improvements": [{"tool": "...", "suggestion": "..."}]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const suggestions = JSON.parse(response.choices[0].message.content);

    return {
      success: true,
      currentCapabilities: currentCaps.capabilities,
      suggestions,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Suggest improvements error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * إنشاء أداة جديدة تلقائياً
 */
export async function createNewTool(toolName, description, requirements = []) {
  try {
    console.log(`🛠️ Creating new tool: ${toolName}`);

    const prompt = `أنت مطور AI متخصص. قم بإنشاء أداة JavaScript/Node.js جديدة:

**اسم الأداة:** ${toolName}
**الوصف:** ${description}
**المتطلبات:** ${requirements.join(', ')}

**المطلوب:**
1. كود كامل وجاهز للاستخدام
2. استخدم ES6 modules (import/export)
3. معالجة أخطاء شاملة
4. توثيق JSDoc
5. دوال async/await
6. return objects مع success/error

رد بالكود فقط بدون شرح.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    const code = response.choices[0].message.content
      .replace(/```javascript/g, '')
      .replace(/```js/g, '')
      .replace(/```/g, '')
      .trim();

    // حفظ الأداة الجديدة
    const toolPath = path.join(process.cwd(), 'src', 'tools', `${toolName}.mjs`);
    await fs.writeFile(toolPath, code);

    return {
      success: true,
      toolName,
      toolPath,
      code,
      message: `تم إنشاء الأداة ${toolName} بنجاح`
    };

  } catch (error) {
    console.error('Create new tool error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تحسين أداة موجودة
 */
export async function improveTool(toolName, improvementType = 'optimize') {
  try {
    console.log(`⚡ Improving tool: ${toolName}`);

    const toolPath = path.join(process.cwd(), 'src', 'tools', `${toolName}.mjs`);
    const currentCode = await fs.readFile(toolPath, 'utf-8');

    const prompt = `أنت مطور AI خبير. قم بتحسين هذا الكود:

**نوع التحسين:** ${improvementType}
**الكود الحالي:**
\`\`\`javascript
${currentCode}
\`\`\`

**المطلوب:**
1. تحسين الأداء
2. إضافة معالجة أخطاء أفضل
3. تحسين التوثيق
4. إضافة ميزات جديدة إن أمكن
5. الحفاظ على جميع الوظائف الحالية

رد بـ JSON:
{
  "improvedCode": "الكود المحسّن",
  "changes": ["قائمة التغييرات"],
  "newFeatures": ["الميزات الجديدة"]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content);

    // إنشاء نسخة احتياطية
    await fs.writeFile(`${toolPath}.backup`, currentCode);

    // حفظ الكود المحسّن
    await fs.writeFile(toolPath, result.improvedCode);

    return {
      success: true,
      toolName,
      changes: result.changes,
      newFeatures: result.newFeatures,
      backupPath: `${toolPath}.backup`
    };

  } catch (error) {
    console.error('Improve tool error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * التحديث الذاتي الكامل
 */
export async function selfUpdate() {
  try {
    console.log('🔄 Starting self-update process...');

    // 1. تحليل القدرات الحالية
    const analysis = await analyzeCurrentCapabilities();
    
    // 2. الحصول على اقتراحات التحسين
    const suggestions = await suggestImprovements();

    // 3. تطبيق التحسينات ذات الأولوية العالية
    const improvements = [];
    
    if (suggestions.success && suggestions.suggestions.suggestedTools) {
      for (const tool of suggestions.suggestions.suggestedTools) {
        if (tool.priority === 'high') {
          const newTool = await createNewTool(
            tool.name,
            tool.description,
            tool.requirements || []
          );
          if (newTool.success) {
            improvements.push(newTool);
          }
        }
      }
    }

    return {
      success: true,
      analysis,
      suggestions,
      improvements,
      message: `تم تحديث JOE بنجاح. تم إضافة ${improvements.length} أداة جديدة.`
    };

  } catch (error) {
    console.error('Self update error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * مراقبة الأداء وتحسينه
 */
export async function monitorPerformance() {
  try {
    console.log('📊 Monitoring JOE performance...');

    const metrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString()
    };

    // تحليل الأداء
    const analysis = {
      memoryUsageMB: Math.round(metrics.memory.heapUsed / 1024 / 1024),
      memoryLimitMB: Math.round(metrics.memory.heapTotal / 1024 / 1024),
      uptimeHours: Math.round(metrics.uptime / 3600 * 100) / 100,
      status: 'healthy'
    };

    if (analysis.memoryUsageMB > 500) {
      analysis.status = 'warning';
      analysis.recommendation = 'Consider restarting the service';
    }

    return {
      success: true,
      metrics,
      analysis
    };

  } catch (error) {
    console.error('Monitor performance error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export const selfEvolutionTools = {
  analyzeCurrentCapabilities,
  suggestImprovements,
  createNewTool,
  improveTool,
  selfUpdate,
  monitorPerformance
};

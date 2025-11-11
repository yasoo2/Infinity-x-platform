/**
 * Tools System - نظام إدارة الأدوات لـ JOEngine AGI
 * 
 * المسؤوليات:
 * - إدارة جميع الأدوات المتاحة
 * - تسجيل أدوات جديدة
 * - توفير واجهة موحدة لاستخدام الأدوات
 */

export class ToolsSystem {
  constructor() {
    this.tools = new Map();
    this.toolsUsageStats = new Map();
  }

  /**
   * تسجيل أداة جديدة
   */
  registerTool(name, tool) {
    if (this.tools.has(name)) {
      console.warn(`⚠️  Tool '${name}' already registered, overwriting...`);
    }

    this.tools.set(name, tool);
    this.toolsUsageStats.set(name, {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalDuration: 0
    });

    console.log(`✅ Tool '${name}' registered`);
  }

  /**
   * الحصول على أداة
   */
  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * الحصول على قائمة جميع الأدوات
   */
  getAllTools() {
    return Array.from(this.tools.keys());
  }

  /**
   * الحصول على معلومات أداة
   */
  getToolInfo(name) {
    const tool = this.tools.get(name);
    if (!tool) return null;

    return {
      name,
      description: tool.description,
      parameters: tool.parameters,
      examples: tool.examples,
      stats: this.toolsUsageStats.get(name)
    };
  }

  /**
   * تنفيذ أداة مع تتبع الإحصائيات
   */
  async executeTool(name, params) {
    const rawName = name ?? '';
    const normalized = typeof rawName === 'string' ? rawName.trim().toLowerCase() : '';

    // ✅ حالة tool = None أو اسم فاضي → لا نرمي Error ولا نكسر التاسك
    if (!normalized || normalized === 'none') {
      console.warn(`⚠️  executeTool called with empty/None tool name ('${rawName}'). Skipping tool execution.`);
      // نرجّع نص بسيط يفهمه الـ LLM كملاحظة / observation
      return `No tool executed (tool name was '${rawName}').`;
    }

    const tool = this.tools.get(name);
    if (!tool) {
      const available = this.getAllTools();
      console.warn(`⚠️  Tool '${name}' not found. Available tools: ${available.join(', ') || 'none'}`);
      // بدل ما نرمي Error، نرجّع ملاحظة نصيّة للـ LLM
      return `Tool '${name}' is not available. Try one of: ${available.join(', ') || 'no tools registered'}.`;
    }

    const stats = this.toolsUsageStats.get(name);
    if (stats) {
      stats.totalCalls++;
    }

    const startTime = Date.now();

    try {
      const result = await tool.execute(params);
      
      if (stats) {
        stats.successfulCalls++;
        stats.totalDuration += Date.now() - startTime;
      }

      return result;
    } catch (error) {
      if (stats) {
        stats.failedCalls++;
      }
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الأدوات
   */
  getStats() {
    const stats = {};
    
    for (const [name, toolStats] of this.toolsUsageStats.entries()) {
      stats[name] = {
        ...toolStats,
        successRate: toolStats.totalCalls > 0
          ? (toolStats.successfulCalls / toolStats.totalCalls) * 100
          : 0,
        avgDuration: toolStats.successfulCalls > 0
          ? toolStats.totalDuration / toolStats.successfulCalls
          : 0
      };
    }

    return stats;
  }
}

/**
 * Base Tool Class - الفئة الأساسية لجميع الأدوات
 */
export class BaseTool {
  constructor(name, description, parameters = {}) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.examples = [];
  }

  /**
   * تنفيذ الأداة (يجب تنفيذها في الفئات الفرعية)
   */
  async execute(params) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * التحقق من صحة المعاملات
   */
  validateParams(params) {
    for (const [key, schema] of Object.entries(this.parameters)) {
      if (schema.required && !(key in params)) {
        throw new Error(`Parameter '${key}' is required`);
      }

      if (key in params && schema.type) {
        const actualType = typeof params[key];
        if (actualType !== schema.type) {
          throw new Error(`Parameter '${key}' must be of type ${schema.type}, got ${actualType}`);
        }
      }
    }

    return true;
  }
}

export default ToolsSystem;

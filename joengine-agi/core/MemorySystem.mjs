/**
 * Memory System - نظام الذاكرة المتقدم لـ JOEngine AGI
 * 
 * المسؤوليات:
 * - إدارة الذاكرة قصيرة المدى (Short-Term Memory - STM) للحوار الحالي.
 * - إدارة الذاكرة طويلة المدى (Long-Term Memory - LTM) للتعلم والخبرات السابقة.
 * - توفير سياق ديناميكي (Dynamic Context) للمحرك الأساسي.
 */
export class MemorySystem {
  constructor(maxShortTermMemory = 10, maxLongTermMemory = 50) {
    this.shortTermMemory = []; // سجل الحوارات الأخيرة
    this.longTermMemory = [];  // سجل الخبرات والتعلم (يجب أن يكون قاعدة بيانات في تطبيق حقيقي)
    this.maxSTM = maxShortTermMemory;
    this.maxLTM = maxLongTermMemory;
  }

  /**
   * إضافة حدث جديد إلى الذاكرة قصيرة المدى
   */
  addEvent(event) {
    const timestamp = new Date().toISOString();
    this.shortTermMemory.push({ timestamp, event });

    // الحفاظ على حجم الذاكرة قصيرة المدى
    if (this.shortTermMemory.length > this.maxSTM) {
      this.shortTermMemory.shift();
    }
  }

  /**
   * استرجاع الذاكرة قصيرة المدى (السياق الحالي)
   */
  getShortTermContext() {
    return this.shortTermMemory.map(item => `[${item.timestamp}] ${item.event}`).join('\n');
  }

  /**
   * إضافة خبرة أو تعلم مهم إلى الذاكرة طويلة المدى
   */
  addLongTermFact(fact) {
    const timestamp = new Date().toISOString();
    this.longTermMemory.push({ timestamp, fact });

    // الحفاظ على حجم الذاكرة طويلة المدى
    if (this.longTermMemory.length > this.maxLTM) {
      this.longTermMemory.shift();
    }
  }

  /**
   * استرجاع الذاكرة طويلة المدى ذات الصلة (لأغراض المحاكاة)
   */
  getLongTermContext(query) {
    // في تطبيق حقيقي، سيتم استخدام بحث دلالي (Semantic Search) هنا
    // لاسترجاع الحقائق ذات الصلة بالاستعلام (query).
    const relevantFacts = this.longTermMemory.filter(item => item.fact.includes(query));
    
    if (relevantFacts.length === 0) {
      return 'No relevant long-term memory found.';
    }

    return relevantFacts.map(item => `[LTM Fact] ${item.fact}`).join('\n');
  }

  /**
   * مسح جميع الذاكرة
   */
  clearMemory() {
    this.shortTermMemory = [];
    this.longTermMemory = [];
  }
}

export default MemorySystem;

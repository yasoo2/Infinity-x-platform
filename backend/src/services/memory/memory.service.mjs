/**
 * 🧠 JOE Advanced Memory Management System
 * نظام ذاكرة متطور مع تعلم آلي وتحليل أنماط ذكي
 * 
 * @module MemoryManager
 * @version 3.0.0
 * @description نظام ذاكرة قوي يتعلم من التفاعلات ويحسن الأداء تلقائياً
 */

import { getDB } from '../db.mjs';
import { EventEmitter } from 'events';

/**
 * 🧠 مدير الذاكرة المتقدم
 */
export class MemoryManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // 💾 الذاكرة المؤقتة
        this.conversations = new Map();
        this.contexts = new Map();
        this.learning = new Map();
        this.shortTermMemory = new Map();
        this.longTermMemory = new Map();
        
        // ⚙️ الإعدادات
        this.config = {
            maxConversationHistory: options.maxConversationHistory || 100,
            maxContextAge: options.maxContextAge || 24 * 60 * 60 * 1000, // 24 ساعة
            shortTermMemoryTTL: options.shortTermMemoryTTL || 30 * 60 * 1000, // 30 دقيقة
            longTermMemoryThreshold: options.longTermMemoryThreshold || 5, // عدد التكرارات
            cleanupInterval: options.cleanupInterval || 60 * 60 * 1000, // ساعة واحدة
            enableLearning: options.enableLearning !== false,
            enableCompression: options.enableCompression !== false,
            enableEncryption: options.enableEncryption || false
        };

        // 📊 الإحصائيات
        this.stats = {
            totalInteractions: 0,
            totalContexts: 0,
            totalPatterns: 0,
            cacheHits: 0,
            cacheMisses: 0,
            learningEvents: 0,
            memoryCleanups: 0,
            averageResponseTime: 0
        };

        // 🔄 بدء التنظيف التلقائي
        this.startAutoCleanup();
        
        console.log('✅ Memory Manager initialized with advanced features');
    }

    /**
     * 💾 حفظ تفاعل جديد
     */
    async saveInteraction(userId, command, result, metadata = {}) {
        const startTime = Date.now();
        
        try {
            const db = getDB();
            
            // 🆔 إنشاء معرف فريد
            const interactionId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const interaction = {
                _id: interactionId,
                userId,
                command,
                result,
                metadata: {
                    timestamp: new Date(),
                    sessionId: metadata.sessionId || this.generateSessionId(userId),
                    intent: metadata.intent,
                    service: metadata.service,
                    confidence: metadata.confidence || 0.8,
                    language: metadata.language || 'ar',
                    platform: metadata.platform || 'web',
                    duration: metadata.duration || 0,
                    tokens: metadata.tokens || 0,
                    ...metadata
                },
                analysis: {
                    sentiment: this.analyzeSentiment(command),
                    complexity: this.analyzeComplexity(command),
                    category: this.categorizeCommand(command),
                    keywords: this.extractKeywords(command)
                }
            };

            // 💾 حفظ في قاعدة البيانات
            await db.collection('joe_interactions').insertOne(interaction);
            
            // 💾 حفظ في الذاكرة المؤقتة
            this.addToConversationMemory(userId, interaction);
            
            // 💾 حفظ في الذاكرة قصيرة المدى
            this.addToShortTermMemory(userId, interaction);
            
            // 🧠 تحديث التعلم
            if (this.config.enableLearning) {
                await this.updateLearning(userId, interaction);
            }
            
            // 📊 تحديث الإحصائيات
            this.stats.totalInteractions++;
            this.updateAverageResponseTime(Date.now() - startTime);
            
            // 🔔 إطلاق حدث
            this.emit('interaction:saved', { userId, interactionId, interaction });
            
            console.log(`💾 Interaction saved: ${interactionId} for user: ${userId}`);
            
            return { 
                success: true, 
                interactionId,
                executionTime: Date.now() - startTime
            };

        } catch (error) {
            console.error('❌ Save interaction error:', error);
            this.emit('error', { type: 'save_interaction', error });
            return { success: false, error: error.message };
        }
    }

    /**
     * 📝 إضافة إلى ذاكرة المحادثة
     */
    addToConversationMemory(userId, interaction) {
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, []);
        }
        
        const userConversations = this.conversations.get(userId);
        userConversations.push(interaction);
        
        // الاحتفاظ بآخر N محادثة فقط
        if (userConversations.length > this.config.maxConversationHistory) {
            userConversations.shift();
        }
    }

    /**
     * ⚡ إضافة إلى الذاكرة قصيرة المدى
     */
    addToShortTermMemory(userId, interaction) {
        const key = `${userId}:${interaction.analysis.category}`;
        
        if (!this.shortTermMemory.has(key)) {
            this.shortTermMemory.set(key, {
                interactions: [],
                count: 0,
                lastAccess: Date.now()
            });
        }
        
        const memory = this.shortTermMemory.get(key);
        memory.interactions.push(interaction);
        memory.count++;
        memory.lastAccess = Date.now();
        
        // نقل إلى الذاكرة طويلة المدى إذا تكرر كثيراً
        if (memory.count >= this.config.longTermMemoryThreshold) {
            this.promoteToLongTermMemory(userId, key, memory);
        }
    }

    /**
     * 🏆 ترقية إلى الذاكرة طويلة المدى
     */
    promoteToLongTermMemory(userId, key, memory) {
        this.longTermMemory.set(key, {
            ...memory,
            promotedAt: Date.now(),
            importance: this.calculateImportance(memory)
        });
        
        console.log(`🏆 Memory promoted to long-term: ${key}`);
        this.emit('memory:promoted', { userId, key });
    }

    /**
     * 🎯 حساب الأهمية
     */
    calculateImportance(memory) {
        const frequency = memory.count;
        const recency = Date.now() - memory.lastAccess;
        const successRate = memory.interactions.filter(i => i.result?.success).length / memory.count;
        
        // معادلة الأهمية: التكرار × معدل النجاح / الحداثة
        return (frequency * successRate) / (recency / 1000);
    }

    /**
     * 🔍 الحصول على سياق المحادثة
     */
    async getConversationContext(userId, options = {}) {
        const startTime = Date.now();
        
        try {
            const limit = options.limit || 10;
            const includeAnalysis = options.includeAnalysis !== false;
            const timeRange = options.timeRange; // { start, end }
            
            // 💾 محاولة الحصول من الذاكرة المؤقتة أولاً
            const cacheKey = `context:${userId}:${limit}`;
            const cached = this.getFromCache(cacheKey);
            
            if (cached && !timeRange) {
                this.stats.cacheHits++;
                return cached;
            }
            
            this.stats.cacheMisses++;
            
            const db = getDB();
            
            // 🔍 بناء الاستعلام
            const query = { userId };
            if (timeRange) {
                query['metadata.timestamp'] = {
                    $gte: timeRange.start,
                    $lte: timeRange.end
                };
            }
            
            const context = await db.collection('joe_interactions')
                .find(query)
                .sort({ 'metadata.timestamp': -1 })
                .limit(limit)
                .toArray();

            // 🧠 معالجة السياق
            const processedContext = this.processContext(context, includeAnalysis);
            
            // 💾 حفظ في الذاكرة المؤقتة
            this.saveToCache(cacheKey, processedContext, 5 * 60 * 1000); // 5 دقائق
            
            console.log(`📖 Context retrieved for ${userId}: ${context.length} interactions in ${Date.now() - startTime}ms`);
            
            return processedContext;

        } catch (error) {
            console.error('❌ Get conversation context error:', error);
            this.emit('error', { type: 'get_context', error });
            return [];
        }
    }

    /**
     * 🧠 معالجة السياق
     */
    processContext(interactions, includeAnalysis = true) {
        return interactions.map(interaction => {
            const processed = {
                id: interaction._id,
                command: interaction.command,
                result: interaction.result,
                timestamp: interaction.metadata.timestamp,
                intent: interaction.metadata.intent,
                success: interaction.result?.success !== false,
                duration: interaction.metadata.duration
            };
            
            if (includeAnalysis && interaction.analysis) {
                processed.analysis = interaction.analysis;
            }
            
            return processed;
        });
    }

    /**
     * 🧠 تحديث التعلم
     */
    async updateLearning(userId, interaction) {
        try {
            // 🔍 استخراج الأنماط
            const patterns = this.extractPatterns(interaction);
            
            // 💾 حفظ كل نمط
            for (const pattern of patterns) {
                await this.savePattern(userId, pattern);
            }
            
            // 📊 تحديث الإحصائيات
            this.stats.learningEvents++;
            this.stats.totalPatterns += patterns.length;
            
            // 🔔 إطلاق حدث
            this.emit('learning:updated', { userId, patterns });
            
        } catch (error) {
            console.error('❌ Update learning error:', error);
            this.emit('error', { type: 'update_learning', error });
        }
    }

    /**
     * 🔍 استخراج الأنماط
     */
    extractPatterns(interaction) {
        const patterns = [];
        
        // 1️⃣ نمط الأمر
        const commandPattern = this.extractCommandPattern(interaction.command);
        patterns.push({
            type: 'command_pattern',
            pattern: commandPattern,
            frequency: 1,
            success: interaction.result?.success !== false,
            metadata: {
                originalCommand: interaction.command,
                category: interaction.analysis.category,
                complexity: interaction.analysis.complexity
            }
        });

        // 2️⃣ نمط الخدمة
        if (interaction.metadata.service) {
            patterns.push({
                type: 'service_preference',
                pattern: interaction.metadata.service,
                frequency: 1,
                success: interaction.result?.success !== false,
                metadata: {
                    intent: interaction.metadata.intent,
                    confidence: interaction.metadata.confidence
                }
            });
        }

        // 3️⃣ نمط النية
        if (interaction.metadata.intent) {
            patterns.push({
                type: 'intent_pattern',
                pattern: interaction.metadata.intent,
                frequency: 1,
                success: interaction.result?.success !== false,
                metadata: {
                    service: interaction.metadata.service,
                    sentiment: interaction.analysis.sentiment
                }
            });
        }

        // 4️⃣ نمط الوقت
        const timePattern = this.extractTimePattern(interaction.metadata.timestamp);
        patterns.push({
            type: 'time_pattern',
            pattern: timePattern,
            frequency: 1,
            success: interaction.result?.success !== false,
            metadata: {
                hour: new Date(interaction.metadata.timestamp).getHours(),
                dayOfWeek: new Date(interaction.metadata.timestamp).getDay()
            }
        });

        // 5️⃣ نمط الكلمات المفتاحية
        if (interaction.analysis.keywords && interaction.analysis.keywords.length > 0) {
            patterns.push({
                type: 'keyword_pattern',
                pattern: interaction.analysis.keywords.join(','),
                frequency: 1,
                success: interaction.result?.success !== false,
                metadata: {
                    keywords: interaction.analysis.keywords,
                    category: interaction.analysis.category
                }
            });
        }

        return patterns;
    }

    /**
     * 🔤 استخراج نمط الأمر
     */
    extractCommandPattern(command) {
        return command
            .toLowerCase()
            .replace(/\d+/g, 'N')           // الأرقام → N
            .replace(/[a-z]+/g, 'W')        // الكلمات الإنجليزية → W
            .replace(/[\u0600-\u06FF]+/g, 'A') // الكلمات العربية → A
            .replace(/\s+/g, ' ')           // المسافات المتعددة → مسافة واحدة
            .trim();
    }

    /**
     * ⏰ استخراج نمط الوقت
     */
    extractTimePattern(timestamp) {
        const date = new Date(timestamp);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        
        let timeOfDay;
        if (hour >= 5 && hour < 12) timeOfDay = 'morning';
        else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
        else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
        else timeOfDay = 'night';
        
        const dayType = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';
        
        return `${dayType}_${timeOfDay}`;
    }

    /**
     * 💾 حفظ نمط
     */
    async savePattern(userId, pattern) {
        try {
            const db = getDB();
            
            const now = new Date();
            
            // 🔄 تحديث أو إنشاء نمط
            const result = await db.collection('joe_learning_patterns').findOneAndUpdate(
                {
                    userId,
                    'pattern.type': pattern.type,
                    'pattern.pattern': pattern.pattern
                },
                {
                    $inc: { 
                        'pattern.frequency': pattern.frequency,
                        'pattern.totalUses': 1
                    },
                    $set: {
                        'pattern.lastUsed': now,
                        'pattern.lastSuccess': pattern.success ? now : undefined
                    },
                    $push: {
                        'pattern.history': {
                            $each: [{
                                timestamp: now,
                                success: pattern.success,
                                metadata: pattern.metadata
                            }],
                            $slice: -50 // الاحتفاظ بآخر 50 استخدام
                        }
                    },
                    $setOnInsert: {
                        userId,
                        pattern: {
                            type: pattern.type,
                            pattern: pattern.pattern,
                            firstSeen: now,
                            createdAt: now
                        }
                    }
                },
                { 
                    upsert: true,
                    returnDocument: 'after'
                }
            );
            
            // 📊 حساب معدل النجاح
            if (result.value) {
                const successRate = this.calculatePatternSuccessRate(result.value.pattern.history);
                await db.collection('joe_learning_patterns').updateOne(
                    { _id: result.value._id },
                    { $set: { 'pattern.successRate': successRate } }
                );
            }
            
        } catch (error) {
            console.error('❌ Save pattern error:', error);
            this.emit('error', { type: 'save_pattern', error });
        }
    }

    /**
     * 📊 حساب معدل نجاح النمط
     */
    calculatePatternSuccessRate(history) {
        if (!history || history.length === 0) return 0;
        
        const successCount = history.filter(h => h.success).length;
        return (successCount / history.length) * 100;
    }

    /**
     * 👤 الحصول على تفضيلات المستخدم
     */
    async getUserPreferences(userId) {
        try {
            const db = getDB();
            
            const patterns = await db.collection('joe_learning_patterns')
                .find({ userId })
                .sort({ 'pattern.frequency': -1, 'pattern.successRate': -1 })
                .limit(100)
                .toArray();

            const preferences = {
                userId,
                patterns: this.processPatterns(patterns),
                summary: this.generatePreferencesSummary(patterns),
                lastUpdated: new Date()
            };

            return preferences;

        } catch (error) {
            console.error('❌ Get user preferences error:', error);
            this.emit('error', { type: 'get_preferences', error });
            return { userId, patterns: [], summary: {} };
        }
    }

    /**
     * 🧠 معالجة الأنماط
     */
    processPatterns(patterns) {
        return patterns.map(p => ({
            type: p.pattern.type,
            pattern: p.pattern.pattern,
            frequency: p.pattern.frequency,
            totalUses: p.pattern.totalUses,
            successRate: p.pattern.successRate || 0,
            lastUsed: p.pattern.lastUsed,
            firstSeen: p.pattern.firstSeen,
            importance: this.calculatePatternImportance(p.pattern)
        }));
    }

    /**
     * 🎯 حساب أهمية النمط
     */
    calculatePatternImportance(pattern) {
        const frequency = pattern.frequency || 0;
        const successRate = pattern.successRate || 0;
        const recency = Date.now() - new Date(pattern.lastUsed).getTime();
        const recencyScore = Math.max(0, 1 - (recency / (30 * 24 * 60 * 60 * 1000))); // آخر 30 يوم
        
        return (frequency * 0.4 + successRate * 0.4 + recencyScore * 100 * 0.2);
    }

    /**
     * 📊 توليد ملخص التفضيلات
     */
    generatePreferencesSummary(patterns) {
        const summary = {
            totalPatterns: patterns.length,
            byType: {},
            topPatterns: [],
            averageSuccessRate: 0,
            mostActiveTime: null,
            preferredServices: []
        };

        // تجميع حسب النوع
        patterns.forEach(p => {
            const type = p.pattern.type;
            if (!summary.byType[type]) {
                summary.byType[type] = { count: 0, totalFrequency: 0 };
            }
            summary.byType[type].count++;
            summary.byType[type].totalFrequency += p.pattern.frequency;
        });

        // أفضل 5 أنماط
        summary.topPatterns = patterns
            .slice(0, 5)
            .map(p => ({
                type: p.pattern.type,
                pattern: p.pattern.pattern,
                frequency: p.pattern.frequency,
                successRate: p.pattern.successRate
            }));

        // متوسط معدل النجاح
        const totalSuccessRate = patterns.reduce((sum, p) => sum + (p.pattern.successRate || 0), 0);
        summary.averageSuccessRate = patterns.length > 0 ? totalSuccessRate / patterns.length : 0;

        // أكثر وقت نشاط
        const timePatterns = patterns.filter(p => p.pattern.type === 'time_pattern');
        if (timePatterns.length > 0) {
            summary.mostActiveTime = timePatterns
                .sort((a, b) => b.pattern.frequency - a.pattern.frequency)[0]
                .pattern.pattern;
        }

        // الخدمات المفضلة
        const servicePatterns = patterns.filter(p => p.pattern.type === 'service_preference');
        summary.preferredServices = servicePatterns
            .slice(0, 5)
            .map(p => ({
                service: p.pattern.pattern,
                frequency: p.pattern.frequency,
                successRate: p.pattern.successRate
            }));

        return summary;
    }

    /**
     * 🔍 البحث عن تفاعلات مشابهة
     */
    async getSimilarInteractions(userId, command, options = {}) {
        try {
            const limit = options.limit || 5;
            const threshold = options.similarityThreshold || 0.6;
            
            const db = getDB();
            
            // استخراج الكلمات المفتاحية من الأمر
            const keywords = this.extractKeywords(command);
            
            // البحث باستخدام الكلمات المفتاحية
            const similarInteractions = await db.collection('joe_interactions')
                .find({
                    userId,
                    $or: [
                        { 'analysis.keywords': { $in: keywords } },
                        { command: { $regex: keywords[0], $options: 'i' } }
                    ]
                })
                .sort({ 'metadata.timestamp': -1 })
                .limit(limit * 2) // جلب أكثر للفلترة
                .toArray();

            // حساب التشابه وفلترة
            const scored = similarInteractions
                .map(interaction => ({
                    ...interaction,
                    similarity: this.calculateSimilarity(command, interaction.command)
                }))
                .filter(interaction => interaction.similarity >= threshold)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);

            return scored;

        } catch (error) {
            console.error('❌ Get similar interactions error:', error);
            this.emit('error', { type: 'get_similar', error });
            return [];
        }
    }

    /**
     * 🔢 حساب التشابه بين نصين
     */
    calculateSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size; // Jaccard similarity
    }

    /**
     * 🗂️ إنشاء ذاكرة سياق
     */
    async createContextMemory(userId, contextData) {
        try {
            const contextId = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const context = {
                _id: contextId,
                userId,
                type: contextData.type || 'general',
                data: contextData.data,
                metadata: {
                    createdAt: new Date(),
                    expiresAt: contextData.expiresAt || new Date(Date.now() + this.config.maxContextAge),
                    tags: contextData.tags || [],
                    priority: contextData.priority || 'normal',
                    source: contextData.source || 'user',
                    accessCount: 0,
                    lastAccessed: null
                }
            };

            const db = getDB();
            await db.collection('joe_contexts').insertOne(context);
            
            // 💾 حفظ في الذاكرة المؤقتة
            this.contexts.set(contextId, context);
            
            // 📊 تحديث الإحصائيات
            this.stats.totalContexts++;
            
            // 🔔 إطلاق حدث
            this.emit('context:created', { userId, contextId, context });
            
            console.log(`💾 Context memory created: ${contextId}`);
            return { success: true, contextId, context };

        } catch (error) {
            console.error('❌ Create context memory error:', error);
            this.emit('error', { type: 'create_context', error });
            return { success: false, error: error.message };
        }
    }

    /**
     * 📖 الحصول على ذاكرة السياق
     */
    async getContextMemory(userId, type = null, options = {}) {
        try {
            const db = getDB();
            
            // 🔍 بناء الاستعلام
            const query = { 
                userId,
                'metadata.expiresAt': { $gt: new Date() }
            };
            
            if (type) {
                query.type = type;
            }
            
            if (options.tags && options.tags.length > 0) {
                query['metadata.tags'] = { $in: options.tags };
            }
            
            const contexts = await db.collection('joe_contexts')
                .find(query)
                .sort({ 'metadata.createdAt': -1 })
                .limit(options.limit || 10)
                .toArray();

            // 📊 تحديث عداد الوصول
            const contextIds = contexts.map(c => c._id);
            await db.collection('joe_contexts').updateMany(
                { _id: { $in: contextIds } },
                { 
                    $inc: { 'metadata.accessCount': 1 },
                    $set: { 'metadata.lastAccessed': new Date() }
                }
            );

            return contexts;

        } catch (error) {
            console.error('❌ Get context memory error:', error);
            this.emit('error', { type: 'get_context_memory', error });
            return [];
        }
    }

    /**
     * 🗑️ حذف ذاكرة السياق
     */
    async deleteContextMemory(contextId) {
        try {
            const db = getDB();
            
            const result = await db.collection('joe_contexts').deleteOne({ _id: contextId });
            
            // حذف من الذاكرة المؤقتة
            this.contexts.delete(contextId);
            
            console.log(`🗑️ Context memory deleted: ${contextId}`);
            this.emit('context:deleted', { contextId });
            
            return { success: true, deleted: result.deletedCount };

        } catch (error) {
            console.error('❌ Delete context memory error:', error);
            this.emit('error', { type: 'delete_context', error });
            return { success: false, error: error.message };
        }
    }

    /**
     * 🧹 تنظيف الذاكرة منتهية الصلاحية
     */
    async cleanupExpiredMemory() {
        try {
            const db = getDB();
            const now = new Date();
            
            // حذف السياقات منتهية الصلاحية
            const contextsResult = await db.collection('joe_contexts').deleteMany({
                'metadata.expiresAt': { $lt: now }
            });
            
            // حذف التفاعلات القديمة جداً (أكثر من 6 أشهر)
            const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
            const interactionsResult = await db.collection('joe_interactions').deleteMany({
                'metadata.timestamp': { $lt: sixMonthsAgo }
            });
            
            // تنظيف الذاكرة المؤقتة
            this.cleanupShortTermMemory();
            
            // 📊 تحديث الإحصائيات
            this.stats.memoryCleanups++;
            
            console.log(`🧹 Memory cleanup completed: ${contextsResult.deletedCount} contexts, ${interactionsResult.deletedCount} interactions`);
            this.emit('memory:cleaned', { 
                contexts: contextsResult.deletedCount,
                interactions: interactionsResult.deletedCount
            });
            
            return {
                success: true,
                deleted: {
                    contexts: contextsResult.deletedCount,
                    interactions: interactionsResult.deletedCount
                }
            };

        } catch (error) {
            console.error('❌ Cleanup expired memory error:', error);
            this.emit('error', { type: 'cleanup_memory', error });
            return { success: false, error: error.message };
        }
    }

    /**
     * 🧹 تنظيف الذاكرة قصيرة المدى
     */
    cleanupShortTermMemory() {
        const now = Date.now();
        const expired = [];
        
        for (const [key, memory] of this.shortTermMemory.entries()) {
            if (now - memory.lastAccess > this.config.shortTermMemoryTTL) {
                expired.push(key);
            }
        }
        
        expired.forEach(key => this.shortTermMemory.delete(key));
        
        console.log(`🧹 Short-term memory cleaned: ${expired.length} entries`);
    }

    /**
     * ⏰ بدء التنظيف التلقائي
     */
    startAutoCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredMemory();
        }, this.config.cleanupInterval);
        
        console.log('⏰ Auto cleanup started');
    }

    /**
     * ⏹️ إيقاف التنظيف التلقائي
     */
    stopAutoCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            console.log('⏹️ Auto cleanup stopped');
        }
    }

    /**
     * 💾 الحصول من الذاكرة المؤقتة
     */
    getFromCache(key) {
        const cached = this.shortTermMemory.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.lastAccess > this.config.shortTermMemoryTTL) {
            this.shortTermMemory.delete(key);
            return null;
        }
        
        cached.lastAccess = Date.now();
        return cached.data;
    }

    /**
     * 💾 الحفظ في الذاكرة المؤقتة
     */
    saveToCache(key, data, ttl = null) {
        this.shortTermMemory.set(key, {
            data,
            lastAccess: Date.now(),
            ttl: ttl || this.config.shortTermMemoryTTL
        });
    }

    /**
     * 🔤 استخراج الكلمات المفتاحية
     */
    extractKeywords(text) {
        // كلمات التوقف العربية والإنجليزية
        const stopWords = new Set([
            'في', 'من', 'إلى', 'على', 'عن', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي',
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'
        ]);
        
        return text
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word))
            .slice(0, 10); // أول 10 كلمات
    }

    /**
     * 😊 تحليل المشاعر
     */
    analyzeSentiment(text) {
        // تحليل بسيط - يمكن تحسينه بنموذج ML
        const positiveWords = ['شكرا', 'رائع', 'ممتاز', 'جيد', 'أحب', 'thanks', 'great', 'good', 'love'];
        const negativeWords = ['سيء', 'خطأ', 'مشكلة', 'فشل', 'bad', 'error', 'problem', 'fail'];
        
        const lowerText = text.toLowerCase();
        let score = 0;
        
        positiveWords.forEach(word => {
            if (lowerText.includes(word)) score += 1;
        });
        
        negativeWords.forEach(word => {
            if (lowerText.includes(word)) score -= 1;
        });
        
        if (score > 0) return 'positive';
        if (score < 0) return 'negative';
        return 'neutral';
    }

    /**
     * 🎯 تحليل التعقيد
     */
    analyzeComplexity(text) {
        const wordCount = text.split(/\s+/).length;
        const charCount = text.length;
        const avgWordLength = charCount / wordCount;
        
        if (wordCount < 5 || avgWordLength < 4) return 'simple';
        if (wordCount < 15 || avgWordLength < 6) return 'medium';
        return 'complex';
    }

    /**
     * 🏷️ تصنيف الأمر
     */
    categorizeCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        // تصنيفات بسيطة
        if (lowerCommand.includes('بناء') || lowerCommand.includes('build') || lowerCommand.includes('create')) {
            return 'build';
        }
        if (lowerCommand.includes('نشر') || lowerCommand.includes('deploy')) {
            return 'deploy';
        }
        if (lowerCommand.includes('بحث') || lowerCommand.includes('search')) {
            return 'search';
        }
        if (lowerCommand.includes('تحليل') || lowerCommand.includes('analyze')) {
            return 'analyze';
        }
        if (lowerCommand.includes('اختبار') || lowerCommand.includes('test')) {
            return 'test';
        }
        
        return 'general';
    }

    /**
     * 🆔 توليد معرف الجلسة
     */
    generateSessionId(userId) {
        return `session_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 📊 تحديث متوسط وقت الاستجابة
     */
    updateAverageResponseTime(responseTime) {
        const total = this.stats.averageResponseTime * (this.stats.totalInteractions - 1) + responseTime;
        this.stats.averageResponseTime = total / this.stats.totalInteractions;
    }

    /**
     * 📊 الحصول على الإحصائيات
     */
    getStats() {
        return {
            ...this.stats,
            memoryUsage: {
                conversations: this.conversations.size,
                contexts: this.contexts.size,
                shortTerm: this.shortTermMemory.size,
                longTerm: this.longTermMemory.size
            },
            cacheHitRate: this.stats.cacheHits + this.stats.cacheMisses > 0
                ? ((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * 🔄 إعادة تعيين الإحصائيات
     */
    resetStats() {
        this.stats = {
            totalInteractions: 0,
            totalContexts: 0,
            totalPatterns: 0,
            cacheHits: 0,
            cacheMisses: 0,
            learningEvents: 0,
            memoryCleanups: 0,
            averageResponseTime: 0
        };
        
        console.log('🔄 Stats reset');
    }

    /**
     * 💾 تصدير الذاكرة
     */
    async exportMemory(userId, format = 'json') {
        try {
            const db = getDB();
            
            const data = {
                user: userId,
                exportedAt: new Date(),
                interactions: await db.collection('joe_interactions')
                    .find({ userId })
                    .toArray(),
                contexts: await db.collection('joe_contexts')
                    .find({ userId })
                    .toArray(),
                patterns: await db.collection('joe_learning_patterns')
                    .find({ userId })
                    .toArray()
            };
            
            if (format === 'json') {
                return JSON.stringify(data, null, 2);
            }
            
            return data;

        } catch (error) {
            console.error('❌ Export memory error:', error);
            this.emit('error', { type: 'export_memory', error });
            return null;
        }
    }

    /**
     * 📥 استيراد الذاكرة
     */
    async importMemory(data) {
        try {
            const db = getDB();
            
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
            
            // استيراد التفاعلات
            if (data.interactions && data.interactions.length > 0) {
                await db.collection('joe_interactions').insertMany(data.interactions);
            }
            
            // استيراد السياقات
            if (data.contexts && data.contexts.length > 0) {
                await db.collection('joe_contexts').insertMany(data.contexts);
            }
            
            // استيراد الأنماط
            if (data.patterns && data.patterns.length > 0) {
                await db.collection('joe_learning_patterns').insertMany(data.patterns);
            }
            
            console.log(`📥 Memory imported for user: ${data.user}`);
            this.emit('memory:imported', { userId: data.user, data });
            
            return { success: true, imported: data };

        } catch (error) {
            console.error('❌ Import memory error:', error);
            this.emit('error', { type: 'import_memory', error });
            return { success: false, error: error.message };
        }
    }

    /**
     * 🧹 مسح كل الذاكرة لمستخدم
     */
    async clearUserMemory(userId) {
        try {
            const db = getDB();
            
            const results = await Promise.all([
                db.collection('joe_interactions').deleteMany({ userId }),
                db.collection('joe_contexts').deleteMany({ userId }),
                db.collection('joe_learning_patterns').deleteMany({ userId })
            ]);
            
            // مسح من الذاكرة المؤقتة
            this.conversations.delete(userId);
            for (const [key] of this.shortTermMemory) {
                if (key.startsWith(userId)) {
                    this.shortTermMemory.delete(key);
                }
            }
            for (const [key] of this.longTermMemory) {
                if (key.startsWith(userId)) {
                    this.longTermMemory.delete(key);
                }
            }
            
            console.log(`🧹 All memory cleared for user: ${userId}`);
            this.emit('memory:cleared', { userId });
            
            return {
                success: true,
                deleted: {
                    interactions: results[0].deletedCount,
                    contexts: results[1].deletedCount,
                    patterns: results[2].deletedCount
                }
            };

        } catch (error) {
            console.error('❌ Clear user memory error:', error);
            this.emit('error', { type: 'clear_memory', error });
            return { success: false, error: error.message };
        }
    }

    /**
     * 🔚 إغلاق المدير
     */
    async shutdown() {
        console.log('🔚 Shutting down Memory Manager...');
        
        this.stopAutoCleanup();
        
        // مسح الذاكرة المؤقتة
        this.conversations.clear();
        this.contexts.clear();
        this.learning.clear();
        this.shortTermMemory.clear();
        this.longTermMemory.clear();
        
        // إزالة جميع المستمعين
        this.removeAllListeners();
        
        console.log('✅ Memory Manager shutdown complete');
    }
}

// 🎯 تصدير مثيل واحد
export const memoryManager = new MemoryManager();

export default MemoryManager;

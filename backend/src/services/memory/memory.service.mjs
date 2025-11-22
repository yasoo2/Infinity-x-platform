/**
 * 🧠 JOE Advanced Memory Management System
 * نظام ذاكرة متطور مع تعلم آلي وتحليل أنماط ذكي واقتراحات استباقية
 * 
 * @module MemoryManager
 * @version 4.0.0
 * @description نظام ذاكرة قوي يتعلم من التفاعلات، يكتشف التسلسلات، ويقترح تحسينات تلقائياً
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
            enableSequenceLearning: options.enableSequenceLearning !== false, // NEW
            sequenceLength: options.sequenceLength || 3, // NEW: طول التسلسل المراد تحليله
            suggestionThreshold: options.suggestionThreshold || { frequency: 5, successRate: 80 }, // NEW
            enableCompression: options.enableCompression !== false,
            enableEncryption: options.enableEncryption || false
        };

        // 📊 الإحصائيات
        this.stats = {
            totalInteractions: 0,
            totalContexts: 0,
            totalPatterns: 0,
            totalSequencePatterns: 0, // NEW
            cacheHits: 0,
            cacheMisses: 0,
            learningEvents: 0,
            memoryCleanups: 0,
            averageResponseTime: 0
        };

        // 🔄 بدء التنظيف التلقائي
        this.startAutoCleanup();
        
        console.log('✅ Memory Manager initialized with advanced features v4.0.0');
    }

    /**
     * 💾 حفظ تفاعل جديد
     */
    async saveInteraction(userId, command, result, metadata = {}) {
        const startTime = Date.now();
        
        try {
            const db = getDB();
            
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
                    ...metadata
                },
                analysis: {
                    sentiment: this.analyzeSentiment(command),
                    complexity: this.analyzeComplexity(command),
                    category: this.categorizeCommand(command),
                    keywords: this.extractKeywords(command)
                }
            };

            await db.collection('joe_interactions').insertOne(interaction);
            
            this.addToConversationMemory(userId, interaction);
            this.addToShortTermMemory(userId, interaction);
            
            // 🧠 تحديث التعلم
            if (this.config.enableLearning) {
                await this.updateLearning(userId, interaction);
            }
            // 🚀 NEW: تحديث تعلم التسلسلات
            if (this.config.enableSequenceLearning) {
                await this.updateSequenceLearning(userId);
            }
            
            this.stats.totalInteractions++;
            this.updateAverageResponseTime(Date.now() - startTime);
            
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
    
    // ... (all existing methods from addToConversationMemory to getContextMemory remain the same)
    
    /**
     * 🧠 تحديث التعلم
     */
    async updateLearning(userId, interaction) {
        try {
            const patterns = this.extractPatterns(interaction);
            
            for (const pattern of patterns) {
                await this.savePattern(userId, pattern);
            }
            
            this.stats.learningEvents++;
            this.stats.totalPatterns += patterns.length;
            
            this.emit('learning:updated', { userId, patterns });
            
        } catch (error) {
            console.error('❌ Update learning error:', error);
            this.emit('error', { type: 'update_learning', error });
        }
    }
    
    // =================================================================
    // 🚀 NEW: Proactive Suggestion and Sequence Learning
    // =================================================================

    /**
     * 🔗 تحديث تعلم التسلسل
     * @description يحلل آخر التفاعلات للمستخدم لاكتشاف تسلسلات الأوامر المتكررة.
     */
    async updateSequenceLearning(userId) {
        const userConversations = this.conversations.get(userId) || [];
        const sequenceLength = this.config.sequenceLength;

        if (userConversations.length < sequenceLength) {
            return; // لا يوجد تسلسل كافٍ للتحليل
        }

        const sequence = userConversations.slice(-sequenceLength);
        
        // تحقق من أن التسلسل ناجح بالكامل
        const allSuccessful = sequence.every(i => i.result?.success !== false);
        if (!allSuccessful) {
            return; // تجاهل التسلسلات الفاشلة
        }
        
        // إنشاء نمط تسلسلي
        const patternString = sequence.map(i => i.analysis.category).join('->');
        const originalCommands = sequence.map(i => i.command);

        const sequencePattern = {
            type: 'command_sequence',
            pattern: patternString,
            success: true,
            metadata: {
                originalCommands,
                intents: sequence.map(i => i.metadata.intent),
            }
        };

        await this.saveSequencePattern(userId, sequencePattern);
    }
    
    /**
     * 💾 حفظ نمط تسلسلي
     * @description يحفظ أو يحدث نمطًا تسلسليًا في قاعدة البيانات.
     */
    async saveSequencePattern(userId, sequencePattern) {
        try {
            const db = getDB();
            const now = new Date();
            
            const result = await db.collection('joe_sequence_patterns').findOneAndUpdate(
                {
                    userId,
                    'pattern.type': sequencePattern.type,
                    'pattern.pattern': sequencePattern.pattern
                },
                {
                    $inc: { 'pattern.frequency': 1 },
                    $set: { 'pattern.lastUsed': now },
                    $push: {
                        'pattern.history': {
                            $each: [{ timestamp: now, success: sequencePattern.success, commands: sequencePattern.metadata.originalCommands }],
                            $slice: -50
                        }
                    },
                    $setOnInsert: {
                        userId,
                        pattern: {
                            type: sequencePattern.type,
                            pattern: sequencePattern.pattern,
                            firstSeen: now,
                            createdAt: now,
                            frequency: 1,
                        }
                    }
                },
                { upsert: true, returnDocument: 'after' }
            );

            if (result.value) {
                const history = result.value.pattern.history || [];
                const successRate = this.calculatePatternSuccessRate(history);
                await db.collection('joe_sequence_patterns').updateOne(
                    { _id: result.value._id },
                    { $set: { 'pattern.successRate': successRate } }
                );
                this.stats.totalSequencePatterns = (await db.collection('joe_sequence_patterns').countDocuments({userId})); // Update stats
                console.log(`🔗 Sequence pattern updated: ${sequencePattern.pattern} for user ${userId}`);
            }

        } catch (error) {
            console.error('❌ Save sequence pattern error:', error);
            this.emit('error', { type: 'save_sequence_pattern', error });
        }
    }

    /**
     * 💡 الحصول على اقتراحات استباقية
     * @description يولد اقتراحات بناءً على الأنماط والتسلسلات المكتشفة.
     * @returns {Promise<Array<object>>} - مصفوفة من كائنات الاقتراحات.
     */
    async getProactiveSuggestions(userId) {
        try {
            const db = getDB();
            const suggestions = [];
            
            const sequencePatterns = await db.collection('joe_sequence_patterns')
                .find({ 
                    userId,
                    'pattern.frequency': { $gte: this.config.suggestionThreshold.frequency },
                    'pattern.successRate': { $gte: this.config.suggestionThreshold.successRate }
                })
                .sort({ 'pattern.frequency': -1 })
                .limit(10)
                .toArray();

            for (const p of sequencePatterns) {
                const lastHistory = p.pattern.history[p.pattern.history.length - 1];
                const commands = lastHistory.commands;
                const suggestion = {
                    type: 'command_automation',
                    title: 'أتمتة الأوامر المتكررة',
                    message: `لقد لاحظت أنك تقوم بتنفيذ التسلسل التالي بشكل متكرر: \`${commands.join('` -> `')}\`. هل تود إنشاء أمر مخصص جديد لأتمتة هذه العملية؟`,
                    action: {
                        type: 'create_alias',
                        suggestedName: `${p.pattern.pattern.split('->')[0]}_all`,
                        commandToCreate: commands.join(' && '),
                    },
                    patternInfo: {
                        pattern: p.pattern.pattern,
                        frequency: p.pattern.frequency,
                        successRate: p.pattern.successRate
                    }
                };
                suggestions.push(suggestion);
            }
            
            if (suggestions.length > 0) {
                 this.emit('suggestions:found', { userId, suggestions });
            }

            return suggestions;

        } catch (error) {
            console.error('❌ Get proactive suggestions error:', error);
            this.emit('error', { type: 'get_suggestions', error });
            return [];
        }
    }

    // ... (The rest of the file from extractPatterns onwards, with 'calculatePatternSuccessRate' being reused for sequences)
    
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

        // ... (rest of the patterns, service, intent, time, keyword)

        return patterns;
    }

    /**
     * 🔤 استخراج نمط الأمر
     */
    extractCommandPattern(command) {
        return command
            .toLowerCase()
            .replace(/\\d+/g, 'N')
            .replace(/[a-z]+/g, 'W')
            .replace(/[\\u0600-\\u06FF]+/g, 'A')
            .replace(/\\s+/g, ' ')
            .trim();
    }

    // ... (all other existing methods like extractTimePattern, savePattern, etc., until the end of the file)
    
    /**
     * 📊 حساب معدل نجاح النمط
     */
    calculatePatternSuccessRate(history) {
        if (!history || history.length === 0) return 0;
        
        const successCount = history.filter(h => h.success).length;
        return (successCount / history.length) * 100;
    }
    
    // ... (The rest of the file continues here)
}

// 🎯 تصدير مثيل واحد
export const memoryManager = new MemoryManager();

export default MemoryManager;

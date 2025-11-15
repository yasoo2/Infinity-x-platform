// backend/src/lib/memoryManager.mjs
// 💾 نظام الذاكرة المتقدم لـ Joe

import { getDB } from '../db.mjs';

export class MemoryManager {
    constructor() {
        this.conversations = new Map();
        this.contexts = new Map();
        this.learning = new Map();
    }

    async saveInteraction(userId, command, result, metadata = {}) {
        try {
            const db = getDB();
            
            const interaction = {
                userId,
                command,
                result,
                metadata: {
                    timestamp: new Date(),
                    sessionId: metadata.sessionId,
                    intent: metadata.intent,
                    service: metadata.service,
                    ...metadata
                }
            };

            // حفظ في قاعدة البيانات
            await db.collection('joe_interactions').insertOne(interaction);
            
            // حفظ في الذاكرة المؤقتة
            if (!this.conversations.has(userId)) {
                this.conversations.set(userId, []);
            }
            this.conversations.get(userId).push(interaction);
            
            // تحديث التعلم
            await this.updateLearning(userId, interaction);
            
            console.log(`💾 Interaction saved for user: ${userId}`);
            return { success: true, interactionId: interaction._id };

        } catch (error) {
            console.error('❌ Save interaction error:', error);
            return { success: false, error: error.message };
        }
    }

    async getConversationContext(userId, limit = 10) {
        try {
            const db = getDB();
            
            const context = await db.collection('joe_interactions')
                .find({ userId })
                .sort({ 'metadata.timestamp': -1 })
                .limit(limit)
                .toArray();

            // معالجة السياق
            const processedContext = this.processContext(context);
            
            return processedContext;

        } catch (error) {
            console.error('❌ Get conversation context error:', error);
            return [];
        }
    }

    processContext(interactions) {
        return interactions.map(interaction => ({
            command: interaction.command,
            result: interaction.result,
            timestamp: interaction.metadata.timestamp,
            intent: interaction.metadata.intent,
            success: interaction.result?.success !== false
        }));
    }

    async updateLearning(userId, interaction) {
        try {
            const patterns = this.extractPatterns(interaction);
            
            for (const pattern of patterns) {
                await this.savePattern(userId, pattern);
            }
            
        } catch (error) {
            console.error('❌ Update learning error:', error);
        }
    }

    extractPatterns(interaction) {
        const patterns = [];
        
        // استخراج نمط الأمر
        const commandPattern = this.extractCommandPattern(interaction.command);
        patterns.push({
            type: 'command_pattern',
            pattern: commandPattern,
            frequency: 1,
            success: interaction.result?.success !== false
        });

        // استخراج نوع الخدمة
        if (interaction.metadata.service) {
            patterns.push({
                type: 'service_preference',
                pattern: interaction.metadata.service,
                frequency: 1,
                success: interaction.result?.success !== false
            });
        }

        // استخراج النية
        if (interaction.metadata.intent) {
            patterns.push({
                type: 'intent_pattern',
                pattern: interaction.metadata.intent,
                frequency: 1,
                success: interaction.result?.success !== false
            });
        }

        return patterns;
    }

    extractCommandPattern(command) {
        // تحويل الأمر إلى نمط عام
        return command
            .toLowerCase()
            .replace(/\d+/g, 'N') // الأرقام
            .replace(/[a-z]+/g, 'L') // الكلمات
            .replace(/\s+/g, ' ') // المسافات
            .trim();
    }

    async savePattern(userId, pattern) {
        try {
            const db = getDB();
            
            // تحديث أو إنشاء نمط
            await db.collection('joe_learning_patterns').updateOne(
                {
                    userId,
                    'pattern.type': pattern.type,
                    'pattern.pattern': pattern.pattern
                },
                {
                    $inc: { 'pattern.frequency': pattern.frequency },
                    $set: {
                        'pattern.lastUsed': new Date(),
                        'pattern.successRate': this.calculateSuccessRate(userId, pattern)
                    },
                    $setOnInsert: {
                        userId,
                        pattern: {
                            type: pattern.type,
                            pattern: pattern.pattern,
                            firstSeen: new Date()
                        }
                    }
                },
                { upsert: true }
            );
            
        } catch (error) {
            console.error('❌ Save pattern error:', error);
        }
    }

    calculateSuccessRate(userId, pattern) {
        // حساب نسبة النجاح بناءً على السجل
        // هذه دالة مبسطة - يمكن تحسينها
        return pattern.success ? 0.9 : 0.1;
    }

    async getUserPreferences(userId) {
        try {
            const db = getDB();
            
            const patterns = await db.collection('joe_learning_patterns')
                .find({ userId })
                .sort({ 'pattern.frequency': -1 })
                .limit(50)
                .toArray();

            const preferences = {
                userId,
                patterns: this.processPatterns(patterns),
                lastUpdated: new Date()
            };

            return preferences;

        } catch (error) {
            console.error('❌ Get user preferences error:', error);
            return { userId, patterns: [] };
        }
    }

    processPatterns(patterns) {
        return patterns.map(p => ({
            type: p.pattern.type,
            pattern: p.pattern.pattern,
            frequency: p.pattern.frequency,
            successRate: p.pattern.successRate,
            lastUsed: p.pattern.lastUsed,
            firstSeen: p.pattern.firstSeen
        }));
    }

    async getSimilarInteractions(userId, command, limit = 5) {
        try {
            const db = getDB();
            
            // البحث عن تفاعلات مشابهة
            const similarInteractions = await db.collection('joe_interactions')
                .find({
                    userId,
                    command: { $regex: command.split(' ')[0], $options: 'i' }
                })
                .sort({ 'metadata.timestamp': -1 })
                .limit(limit)
                .toArray();

            return similarInteractions;

        } catch (error) {
            console.error('❌ Get similar interactions error:', error);
            return [];
        }
    }

    async createContextMemory(userId, contextData) {
        try {
            const contextId = `ctx_${Date.now()}`;
            
            const context = {
                id: contextId,
                userId,
                type: contextData.type || 'general',
                data: contextData.data,
                metadata: {
                    createdAt: new Date(),
                    expiresAt: contextData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
                    tags: contextData.tags || []
                }
            };

            const db = getDB();
            await db.collection('joe_contexts').insertOne(context);
            
            this.contexts.set(contextId, context);
            
            console.log(`💾 Context memory created: ${contextId}`);
            return { success: true, contextId };

        } catch (error) {
            console.error('❌ Create context memory error:', error);
            return { success: false, error: error.message };
        }
    }

    async getContextMemory(userId, type = null) {
        try {
            const db = getD

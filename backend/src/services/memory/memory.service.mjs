/**
 * 🧠 JOE Advanced Memory Management System
 * نظام ذاكرة متطور مع تعلم آلي وتحليل أنماط ذكي واقتراحات استباقية
 * 
 * @module MemoryManager
 * @version 4.1.0
 * @description نظام ذاكرة قوي يتعلم من التفاعلات، يكتشف التسلسلات، ويقترح تحسينات تلقائياً. Includes auto-cleanup.
 */

import { getDB } from '../../core/database.mjs';
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
            enableSequenceLearning: options.enableSequenceLearning !== false,
            sequenceLength: options.sequenceLength || 3,
            suggestionThreshold: options.suggestionThreshold || { frequency: 5, successRate: 80 },
            enableCompression: options.enableCompression !== false,
            enableEncryption: options.enableEncryption || false
        };

        // 📊 الإحصائيات
        this.stats = {
            totalInteractions: 0,
            totalContexts: 0,
            totalPatterns: 0,
            totalSequencePatterns: 0,
            cacheHits: 0,
            cacheMisses: 0,
            learningEvents: 0,
            memoryCleanups: 0,
            averageResponseTime: 0
        };

        // 🔄 بدء التنظيف التلقائي
        this.startAutoCleanup();
        
        console.log('✅ Memory Manager initialized with advanced features v4.1.0');
    }

    /**
     * 🧹 [FIX] Starts the automatic cleanup process for short-term memory.
     */
    startAutoCleanup() {
        console.log(`🧹 Auto-cleanup scheduled every ${this.config.cleanupInterval / 1000 / 60} minutes.`);
        setInterval(() => this.performCleanup(), this.config.cleanupInterval);
    }

    /**
     * 🗑️ [FIX] Performs the cleanup of expired short-term memory items.
     */
    performCleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        console.log('🗑️ Performing memory cleanup...');

        for (const [userId, memoryItems] of this.shortTermMemory.entries()) {
            const validItems = memoryItems.filter(item => (now - item.metadata.timestamp.getTime()) < this.config.shortTermMemoryTTL);
            if (validItems.length < memoryItems.length) {
                cleanedCount += (memoryItems.length - validItems.length);
                this.shortTermMemory.set(userId, validItems);
            }
        }

        if (cleanedCount > 0) {
            this.stats.memoryCleanups++;
            console.log(`✅ Cleanup complete. Removed ${cleanedCount} expired items.`);
            this.emit('cleanup:complete', { cleanedCount });
        }
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
            
            if (this.config.enableLearning) {
                await this.updateLearning(userId, interaction);
            }
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
    
    // ... (rest of the methods: addToConversationMemory, addToShortTermMemory etc.)
     addToConversationMemory(userId, interaction) { const history = this.conversations.get(userId) || []; history.push(interaction); if (history.length > this.config.maxConversationHistory) { history.shift(); } this.conversations.set(userId, history); } addToShortTermMemory(userId, interaction) { const memory = this.shortTermMemory.get(userId) || []; memory.push(interaction); this.shortTermMemory.set(userId, memory); } generateSessionId(userId) { return `sess_${userId}_${new Date().toISOString().split('T')[0]}`; } analyzeSentiment(text) { return 'neutral'; } analyzeComplexity(text) { return text.length / 10; } categorizeCommand(command) { return command.split(' ')[0]; } extractKeywords(command) { return command.split(' '); } updateAverageResponseTime(time) { this.stats.averageResponseTime = (this.stats.averageResponseTime * (this.stats.totalInteractions - 1) + time) / this.stats.totalInteractions; }

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
    
    async updateSequenceLearning(userId) {
        const userConversations = this.conversations.get(userId) || [];
        const sequenceLength = this.config.sequenceLength;

        if (userConversations.length < sequenceLength) return;

        const sequence = userConversations.slice(-sequenceLength);
        const allSuccessful = sequence.every(i => i.result?.success !== false);
        if (!allSuccessful) return;
        
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
    
    async saveSequencePattern(userId, sequencePattern) {
        try {
            const db = getDB();
            const now = new Date();
            
            const result = await db.collection('joe_sequence_patterns').findOneAndUpdate(
                { userId, 'pattern.type': sequencePattern.type, 'pattern.pattern': sequencePattern.pattern },
                {
                    $inc: { 'pattern.frequency': 1 },
                    $set: { 'pattern.lastUsed': now },
                    $push: { 'pattern.history': { $each: [{ timestamp: now, success: sequencePattern.success, commands: sequencePattern.metadata.originalCommands }], $slice: -50 } },
                    $setOnInsert: { userId, pattern: { type: sequencePattern.type, pattern: sequencePattern.pattern, firstSeen: now, createdAt: now, frequency: 1 } }
                },
                { upsert: true, returnDocument: 'after' }
            );

            if (result.value) {
                const history = result.value.pattern.history || [];
                const successRate = this.calculatePatternSuccessRate(history);
                await db.collection('joe_sequence_patterns').updateOne({ _id: result.value._id }, { $set: { 'pattern.successRate': successRate } });
                this.stats.totalSequencePatterns = (await db.collection('joe_sequence_patterns').countDocuments({userId}));
                console.log(`🔗 Sequence pattern updated: ${sequencePattern.pattern} for user ${userId}`);
            }

        } catch (error) {
            console.error('❌ Save sequence pattern error:', error);
            this.emit('error', { type: 'save_sequence_pattern', error });
        }
    }

    async getProactiveSuggestions(userId) {
        try {
            const db = getDB();
            const suggestions = [];
            
            const sequencePatterns = await db.collection('joe_sequence_patterns')
                .find({ userId, 'pattern.frequency': { $gte: this.config.suggestionThreshold.frequency }, 'pattern.successRate': { $gte: this.config.suggestionThreshold.successRate } })
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
                    patternInfo: { pattern: p.pattern.pattern, frequency: p.pattern.frequency, successRate: p.pattern.successRate }
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

    extractPatterns(interaction) {
        const patterns = [];
        const commandPattern = this.extractCommandPattern(interaction.command);
        patterns.push({
            type: 'command_pattern',
            pattern: commandPattern,
            frequency: 1,
            success: interaction.result?.success !== false,
            metadata: { originalCommand: interaction.command, category: interaction.analysis.category, complexity: interaction.analysis.complexity }
        });
        return patterns;
    }

    extractCommandPattern(command) {
        return command.toLowerCase().replace(/\d+/g, 'N').replace(/[a-z]+/g, 'W').replace(/[\u0600-\u06FF]+/g, 'A').replace(/\s+/g, ' ').trim();
    }

    calculatePatternSuccessRate(history) {
        if (!history || history.length === 0) return 0;
        const successCount = history.filter(h => h.success).length;
        return (successCount / history.length) * 100;
    }
}

export const memoryManager = new MemoryManager();

export default MemoryManager;

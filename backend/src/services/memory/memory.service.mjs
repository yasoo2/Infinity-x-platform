/**
 * 🧠 JOE Advanced Memory Management System
 * @module MemoryManager
 * @version 4.4.0 - Activated and implemented memory cleanup logic.
 */

import { getDB } from '../../core/database.mjs';
import { EventEmitter } from 'events';

class MemoryManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.db = null; 

        this.shortTermMemory = new Map();
        this.conversations = new Map();
        this.longTermMemory = new Map(); // Cache for LTM patterns/knowledge

        this.config = {
            shortTermMemoryTTL: options.shortTermMemoryTTL || 30 * 60 * 1000, // 30 minutes
            cleanupInterval: options.cleanupInterval || 5 * 60 * 1000, // 5 minutes
        };

        this.stats = {};

        this.startAutoCleanup();
        console.log('✅ Memory Manager v4.4.0 initialized. DB will be fetched on-demand.');
        try {
            this.initializeLTMCollections();
        } catch (e) {
            try { console.warn('⚠️ MemoryManager: LTM initialization skipped, DB not available.', e?.message || String(e)); } catch { /* noop */ }
        }
    }

    _getDB() {
        try {
            if (!this.db) {
                this.db = getDB();
            }
            return this.db;
        } catch {
            return null;
        }
    }

    startAutoCleanup() {
        console.log(`🧹 Auto-cleanup scheduled every ${this.config.cleanupInterval / 1000 / 60} minutes.`);
        setInterval(() => this.performCleanup(), this.config.cleanupInterval);
    }

    /**
     * Cleans up expired entries from the in-memory caches.
     */
    performCleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        console.log('🧹 Performing memory cleanup...');
        this.cleanLTM();

        // Clean Short-Term Memory
        for (const [userId, memory] of this.shortTermMemory.entries()) {
            const originalCount = memory.length;
            const freshMemory = memory.filter(interaction => {
                const timestamp = new Date(interaction.metadata.timestamp).getTime();
                return (now - timestamp) < this.config.shortTermMemoryTTL;
            });

            if (freshMemory.length < originalCount) {
                cleanedCount += (originalCount - freshMemory.length);
                if (freshMemory.length === 0) {
                    this.shortTermMemory.delete(userId);
                } else {
                    this.shortTermMemory.set(userId, freshMemory);
                }
            }
        }

        if (cleanedCount > 0) {
            console.log(`✨ Cleaned up ${cleanedCount} expired short-term memory entries.`);
        } else {
            console.log('✨ Short-term memory is fresh. No entries needed cleaning.');
        }
    }

    async saveInteraction(userId, command, result, metadata = {}) {
        const db = this._getDB();
        const interaction = {
            userId,
            command,
            result,
            metadata: {
                timestamp: new Date(),
                ...metadata
            },
        };
        try {
            if (db) {
                await db.collection('joe_interactions').insertOne(interaction);
            }
        } catch { /* ignore DB write failure */ }
        this.addToShortTermMemory(userId, interaction);
        this.addToConversationMemory(userId, interaction);
        try { this.checkForLTM(userId, interaction); } catch { /* noop */ }
        try { this.emit('interaction:saved', { userId, sessionId: interaction.metadata.sessionId, interaction }); } catch { /* noop */ }
        return { success: true, inMemoryOnly: !db };
    }

    // --- Long-Term Memory (LTM) Methods ---

    initializeLTMCollections() {
        try {
            const db = this._getDB();
            if (!db) return;
            // Ensure indexes for efficient querying
            db.collection('joe_knowledge_patterns').createIndex({ userId: 1, type: 1 });
            db.collection('joe_knowledge_patterns').createIndex({ keywords: 1 });
        } catch { /* ignore when DB is unavailable */ }
    }

    async checkForLTM(userId, interaction) {
        // Placeholder for complex LTM logic (e.g., pattern recognition, summarization)
        // For now, we'll save a simple "lesson learned" if the interaction was a successful code fix.
        if (interaction.metadata.type === 'code_fix' && interaction.result.success) {
            const lesson = {
                userId,
                type: 'code_fix_pattern',
                title: `Successful fix for: ${interaction.command.slice(0, 50)}...`,
                content: JSON.stringify(interaction),
                keywords: ['code', 'fix', 'success', interaction.metadata.language],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await this.saveLTM(lesson);
        }
    }

    async saveLTM(knowledgePattern) {
        try {
            const db = this._getDB();
            const result = await db.collection('joe_knowledge_patterns').insertOne(knowledgePattern);
            this.longTermMemory.delete(knowledgePattern.userId); // Invalidate cache
            return { success: true, id: result.insertedId };
        } catch (error) {
            console.error('❌ Save LTM error:', error);
            return { success: false, error: error.message };
        }
    }

    async getLTM(userId, { type, keywords, limit = 5 } = {}) {
        try {
            const db = this._getDB();
            const query = { userId };
            if (type) query.type = type;
            if (keywords && keywords.length > 0) query.keywords = { $in: keywords };

            const cached = this.longTermMemory.get(userId);
            if (cached) return cached;

            const patterns = await db.collection('joe_knowledge_patterns')
                .find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .toArray();
            
            this.longTermMemory.set(userId, patterns);
            return patterns;
        } catch (error) {
            console.error('❌ Get LTM error:', error);
            return [];
        }
    }

    cleanLTM() {
        // LTM cleanup logic (e.g., removing old, unused, or redundant patterns)
        // For now, we'll just clear the in-memory cache.
        this.longTermMemory.clear();
        console.log('✨ LTM cache cleared.');
    }

    // --- End LTM Methods ---

    async getConversationContext(userId, { limit = 15 } = {}) {
        const cachedConversation = this.conversations.get(userId);
        if (cachedConversation && cachedConversation.length > 0) {
            return cachedConversation.slice(-limit);
        }

        const db = this._getDB();
        if (!db) {
            return this.conversations.get(userId) || [];
        }
        try {
            const interactions = await db.collection('joe_interactions')
                .find({ userId })
                .sort({ 'metadata.timestamp': -1 })
                .limit(limit)
                .toArray();
            this.conversations.set(userId, interactions.slice().reverse());
            return interactions;
        } catch {
            return this.conversations.get(userId) || [];
        }
    }

    addToShortTermMemory(userId, interaction) {
        const memory = this.shortTermMemory.get(userId) || [];
        memory.push(interaction);
        this.shortTermMemory.set(userId, memory);
    }

    addToConversationMemory(userId, interaction) {
        const history = this.conversations.get(userId) || [];
        history.push(interaction);
        this.conversations.set(userId, history);
    }

    async listSessions(userId) {
        try {
            const db = this._getDB();
            const pipeline = [
                { $match: { userId } },
                { $match: { 'metadata.deleted': { $ne: true } } },
                { $group: { _id: '$metadata.sessionId', lastModified: { $max: '$metadata.timestamp' }, count: { $sum: 1 } } },
                { $sort: { lastModified: -1 } }
            ];
            const groups = await db.collection('joe_interactions').aggregate(pipeline).toArray();
            const sessions = groups
                .filter(g => g._id)
                .map(g => ({ id: g._id, lastModified: g.lastModified, count: g.count }));
            return sessions;
        } catch (error) {
            console.error('listSessions error:', error);
            return [];
        }
    }

    async getSession(sessionId, userId) {
        try {
            const db = this._getDB();
            const interactions = await db.collection('joe_interactions')
                .find({ userId, 'metadata.sessionId': sessionId, 'metadata.deleted': { $ne: true } })
                .sort({ 'metadata.timestamp': 1 })
                .toArray();
            if (!interactions || interactions.length === 0) return null;
            return { id: sessionId, interactions };
        } catch (error) {
            console.error('getSession error:', error);
            return null;
        }
    }

    async deleteSession(sessionId, userId) {
        try {
            const db = this._getDB();
            const result = await db.collection('joe_interactions').updateMany(
                { userId, 'metadata.sessionId': sessionId },
                { $set: { 'metadata.deleted': true } }
            );
            if (!result.matchedCount) {
                return { success: false, error: 'NOT_FOUND' };
            }
            return { success: true };
        } catch (error) {
            console.error('deleteSession error:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserContext(userId, { limit = 100 } = {}) {
        try {
            const db = this._getDB();
            const interactions = await db.collection('joe_interactions')
                .find({ userId })
                .sort({ 'metadata.timestamp': -1 })
                .limit(limit)
                .toArray();
            return interactions;
        } catch (error) {
            console.error('getUserContext error:', error);
            return [];
        }
    }
}

// Export the class, not an instance.
export default MemoryManager;

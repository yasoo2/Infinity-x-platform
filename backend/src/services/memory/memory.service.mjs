/**
 * 🧠 JOE Advanced Memory Management System
 * @module MemoryManager
 * @version 4.2.1 - Exporting a singleton instance.
 */

import { getDB } from '../../core/database.mjs';
import { EventEmitter } from 'events';

class MemoryManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.shortTermMemory = new Map();
        this.conversations = new Map();
        this.db = getDB();

        this.config = {
            shortTermMemoryTTL: options.shortTermMemoryTTL || 30 * 60 * 1000, 
            cleanupInterval: options.cleanupInterval || 5 * 60 * 1000,
        };

        this.stats = {};

        this.startAutoCleanup();
        console.log('✅ Memory Manager v4.2.1 initialized. Auto-cleanup is active.');
    }

    startAutoCleanup() {
        console.log(`🧹 Auto-cleanup scheduled every ${this.config.cleanupInterval / 1000 / 60} minutes.`);
        setInterval(() => this.performCleanup(), this.config.cleanupInterval);
    }

    performCleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        console.log('🗑️ Performing memory cleanup...');

        for (const [userId, memoryItems] of this.shortTermMemory.entries()) {
            const validItems = memoryItems.filter(item => (now - item.metadata.timestamp.getTime()) < this.config.shortTermMemoryTTL);
            
            if (validItems.length < memoryItems.length) {
                cleanedCount += (memoryItems.length - validItems.length);
                if (validItems.length > 0) {
                    this.shortTermMemory.set(userId, validItems);
                } else {
                    this.shortTermMemory.delete(userId);
                }
            }
        }

        if (cleanedCount > 0) {
            console.log(`✅ Cleanup complete. Removed ${cleanedCount} expired short-term memory items.`);
            this.emit('cleanup:complete', { cleanedCount });
        }
    }

    async saveInteraction(userId, command, result, metadata = {}) {
        try {
            const interaction = {
                userId,
                command,
                result,
                metadata: {
                    timestamp: new Date(),
                    ...metadata
                },
            };

            await this.db.collection('joe_interactions').insertOne(interaction);
            
            this.addToShortTermMemory(userId, interaction);
            this.addToConversationMemory(userId, interaction);

            return { success: true, interactionId: interaction._id };

        } catch (error) {
            console.error('❌ Save interaction error:', error);
            return { success: false, error: error.message };
        }
    }

    async getConversationContext(userId, { limit = 15 } = {}) {
        const cachedConversation = this.conversations.get(userId);
        if (cachedConversation && cachedConversation.length > 0) {
            return cachedConversation.slice(-limit);
        }

        try {
            const interactions = await this.db.collection('joe_interactions')
                .find({ userId })
                .sort({ 'metadata.timestamp': -1 })
                .limit(limit)
                .toArray();
            
            this.conversations.set(userId, interactions.slice().reverse());
            return interactions;
        } catch (error) {
            console.error('❌ Get conversation context error:', error);
            return [];
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
}

// Create and export a single instance (singleton)
const memoryManager = new MemoryManager();
export default memoryManager;

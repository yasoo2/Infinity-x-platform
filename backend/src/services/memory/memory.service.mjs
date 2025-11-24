/**
 * 🧠 JOE Advanced Memory Management System
 * @module MemoryManager
 * @version 4.3.0 - Implemented lazy loading for DB connection.
 */

import { getDB } from '../../core/database.mjs';
import { EventEmitter } from 'events';

class MemoryManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // DB is no longer fetched here. It will be fetched on-demand.
        this.db = null; 

        this.shortTermMemory = new Map();
        this.conversations = new Map();

        this.config = {
            shortTermMemoryTTL: options.shortTermMemoryTTL || 30 * 60 * 1000, 
            cleanupInterval: options.cleanupInterval || 5 * 60 * 1000,
        };

        this.stats = {};

        this.startAutoCleanup();
        console.log('✅ Memory Manager v4.3.0 initialized. DB will be fetched on-demand.');
    }

    // Private helper to get DB connection, ensuring it's initialized.
    _getDB() {
        if (!this.db) {
            this.db = getDB(); // This will throw an error if not initialized, which is correct.
        }
        return this.db;
    }

    startAutoCleanup() {
        console.log(`🧹 Auto-cleanup scheduled every ${this.config.cleanupInterval / 1000 / 60} minutes.`);
        setInterval(() => this.performCleanup(), this.config.cleanupInterval);
    }

    performCleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        // No DB interaction here, so no change needed.
        // ... (cleanup logic remains the same)
    }

    async saveInteraction(userId, command, result, metadata = {}) {
        try {
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

            await db.collection('joe_interactions').insertOne(interaction);
            
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
            const db = this._getDB();
            const interactions = await db.collection('joe_interactions')
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

// Export the class, not an instance.
export default MemoryManager;

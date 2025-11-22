/**
 * Memory Tools - Long-term memory system
 * Allows JOE to remember conversations and learn from experiences.
 * @version 2.0.0 - ToolManager Compliant
 */

import { memoryManager } from '../services/memory/memory.service.mjs';

// Note: This tool now acts as a simplified adapter for the more robust memoryManager service.

async function saveToMemory({ userId, key, value }) {
    // This is a simplified abstraction. The memoryManager has a more sophisticated structure.
    const data = { [key]: value };
    try {
        await memoryManager.saveInteraction(userId, `User stored data for key: ${key}`, 'Data saved to profile.', { customData: data });
        return { success: true, message: `Saved data for key '${key}' to user profile.` };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
saveToMemory.metadata = {
    name: "saveToMemory",
    description: "Saves a key-value pair to the user's long-term memory profile. Use this to remember user preferences, facts, or specific information for later use.",
    parameters: {
        type: "object",
        properties: {
            userId: { type: "string", description: "The ID of the user to associate the memory with." },
            key: { type: "string", description: "The unique key for the information being stored." },
            value: { type: "any", description: "The information (string, number, object) to be stored." }
        },
        required: ["userId", "key", "value"]
    }
};

async function retrieveFromMemory({ userId, key }) {
    try {
        const profile = await memoryManager.getUserProfile(userId);
        const value = profile?.customData?.[key];
        if (value !== undefined) {
            return { success: true, key, value };
        } else {
            return { success: false, message: `No data found for key '${key}'.` };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}
retrieveFromMemory.metadata = {
    name: "retrieveFromMemory",
    description: "Retrieves a specific piece of information from the user's long-term memory using a key.",
    parameters: {
        type: "object",
        properties: {
            userId: { type: "string", description: "The ID of the user whose memory to access." },
            key: { type: "string", description: "The key of the information to retrieve." }
        },
        required: ["userId", "key"]
    }
};

async function searchConversations({ userId, query }) {
    try {
        const results = await memoryManager.searchInteractions(userId, query, { limit: 10 });
        return { success: true, results };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
searchConversations.metadata = {
    name: "searchConversations",
    description: "Searches through the user's past conversation history for a specific query.",
    parameters: {
        type: "object",
        properties: {
            userId: { type: "string", description: "The user's ID to search within their conversations." },
            query: { type: "string", description: "The text to search for in past messages and responses." }
        },
        required: ["userId", "query"]
    }
};

export default { saveToMemory, retrieveFromMemory, searchConversations };

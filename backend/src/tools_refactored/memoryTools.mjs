/**
 * 🛠️ Memory Management Tools - Refactored for Dynamic Loading
 * @version 2.0.1
 * @description Provides tools for the AI to interact with its own memory, now corrected to import the singleton instance.
 */

// Corrected import to match the singleton export from memory.service.mjs
import memoryManager from '../services/memory/memory.service.mjs';

// --- Tool Functions ---

async function saveToMemory({ userId, data, metadata }) {
    if (!userId || !data) {
        return { success: false, error: 'userId and data are required to save to memory.' };
    }
    const result = await memoryManager.saveInteraction(userId, 'manual_save', data, metadata);
    return result;
}

async function retrieveFromMemory({ userId, limit = 10 }) {
    if (!userId) {
        return { success: false, error: 'userId is required to retrieve from memory.' };
    }
    const context = await memoryManager.getConversationContext(userId, { limit });
    return { success: true, memory: context };
}

// --- Metadata for ToolManager ---

saveToMemory.metadata = {
    name: "saveToMemory",
    description: "Saves a piece of information to the user's long-term memory for future reference.",
    parameters: {
        type: "object",
        properties: {
            userId: { 
                type: "string", 
                description: "The unique identifier for the user."
            },
            data: { 
                type: "string", 
                description: "The information or data to be saved."
            },
            metadata: { 
                type: "object", 
                description: "Optional metadata to provide context about the saved information."
            }
        },
        required: ["userId", "data"]
    }
};

retrieveFromMemory.metadata = {
    name: "retrieveFromMemory",
    description: "Retrieves the recent conversation history or saved data for a specific user.",
    parameters: {
        type: "object",
        properties: {
            userId: { 
                type: "string", 
                description: "The unique identifier for the user to retrieve memory for."
            },
            limit: { 
                type: "integer", 
                description: "The maximum number of recent interactions to retrieve. Defaults to 10."
            }
        },
        required: ["userId"]
    }
};

// --- Exporting the tools ---

export default {
    saveToMemory,
    retrieveFromMemory
};

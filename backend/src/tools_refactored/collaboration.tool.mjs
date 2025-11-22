/**
 * Collaboration Tool - Bridge to the Real-time Collaboration System
 * @version 1.0.0
 */

import { collaborationSystem } from '../systems/collaboration.service.mjs';

/**
 * Creates a new real-time collaboration room.
 * @param {object} params - The parameters for creating a room.
 * @param {string} params.roomId - A unique ID for the new room.
 * @returns {Promise<object>} - The result of the room creation operation.
 */
async function createCollaborationRoom({ roomId }) {
  try {
    const result = await collaborationSystem.createRoom(roomId);
    return { success: true, ...result };
  } catch (error) {
    console.error('❌ Failed to create collaboration room:', error);
    return { success: false, error: `Failed to create room: ${error.message}` };
  }
}

createCollaborationRoom.metadata = {
    name: "createCollaborationRoom",
    description: "Creates a new real-time collaboration room for developers to code together. Returns a unique room ID.",
    parameters: {
        type: "object",
        properties: { 
            roomId: { type: "string", description: "A unique ID for the room. If not provided, one will be generated." }
        },
        required: ["roomId"]
    }
};

/**
 * Retrieves statistics from the collaboration system.
 * @returns {Promise<object>} - An object containing collaboration statistics.
 */
async function getCollaborationStats() {
    try {
        const stats = collaborationSystem.getStats();
        return { success: true, stats };
    } catch (error) {
        console.error('❌ Failed to get collaboration stats:', error);
        return { success: false, error: `Could not retrieve stats: ${error.message}` };
    }
}

getCollaborationStats.metadata = {
    name: "getCollaborationStats",
    description: "Retrieves statistics from the real-time collaboration system, such as the number of active rooms and users.",
    parameters: { type: "object", properties: {} }
};


export default { createCollaborationRoom, getCollaborationStats };

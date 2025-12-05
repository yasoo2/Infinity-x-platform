/**
 * 📥 File Ingestion Tool - The AI's Eyes on User Files
 * @version 1.0.0
 * This tool allows the system to receive and process files from users, making the AI aware of their contents.
 * It saves the file and records the event in memory, enabling context-aware conversations about the file.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// We need a stable place to store these uploads, at least temporarily.
const UPLOAD_DIR = path.join(os.tmpdir(), 'infinity-uploads');

// We can import the memoryManager directly if it's a singleton, but it's better to pass it in.
// For now, we will assume it is available as a dependency injected elsewhere, and this tool is a proxy.
// This file is about defining the tool, the execution is handled by the ToolManager which has context.
import MemoryManager from '../services/memory/memory.service.mjs';
const memoryManager = new MemoryManager(); // Lightweight instantiation for access to methods.

async function initializeService() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to initialize upload directory:', error);
    }
}
initializeService();

// --- Tool Function ---

async function ingestFile({ fileName, fileContent, userId, sessionId }) {
    const fileId = uuidv4();
    const fileExtension = path.extname(fileName);
    const storedFileName = `${fileId}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, storedFileName);

    try {
        // 1. Save the file to a known location
        await fs.writeFile(filePath, Buffer.from(fileContent, 'base64'));

        // 2. Create a summary of the event for the AI's memory
        const summary = `A file named "${fileName}" has been uploaded by the user. It is stored with reference ID ${storedFileName}. Its contents are now available for analysis, review, or processing.`;

        // 3. Save this event as a special interaction in the AI's memory
        await memoryManager.saveInteraction(userId, `[System Event: File Upload - ${fileName}]`, summary, {
            sessionId,
            service: 'file-ingestion-tool',
            isSystemEvent: true,
            fileMetadata: {
                originalName: fileName,
                storedName: storedFileName,
                filePath: filePath,
                size: Buffer.from(fileContent, 'base64').length
            }
        });

        return {
            success: true,
            message: `File "${fileName}" has been ingested and is now part of the conversation context.`,
            fileName: fileName,
            fileId: storedFileName
        };

    } catch (error) {
        console.error(`[FileIngestionTool] Error ingesting file ${fileName}:`, error);
        return { success: false, error: `Failed to ingest file: ${error.message}` };
    }
}

// --- Metadata for Dynamic Discovery ---

ingestFile.metadata = {
    name: "ingestFile",
    description: "Processes a user-uploaded file by saving it and making its content available to the AI for further actions like code review, analysis, or summarization. The file content should be base64 encoded.",
    parameters: {
        type: "object",
        properties: {
            fileName: {
                type: "string",
                description: "The original name of the file (e.g., 'main.py', 'package.json')."
            },
            fileContent: {
                type: "string",
                description: "The base64 encoded content of the file."
            },
            userId: {
                type: "string",
                description: "The ID of the user uploading the file."
            },
            sessionId: {
                type: "string",
                description: "The current session ID to associate the file with the ongoing conversation."
            }
        },
        required: ["fileName", "fileContent", "userId", "sessionId"]
    }
};

// --- Exporting the tool in the expected format ---

export default { ingestFile };

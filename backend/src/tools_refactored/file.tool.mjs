/**
 * File System Tool - A simplified and robust tool for file system operations.
 * Provides basic file and directory manipulation functions, compliant with ToolManager.
 * @version 1.0.0
 */

import { promises as fs } from 'fs';
// Removed unused imports

// --- File Operations ---

async function readFile({ filePath }) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: `Failed to read file: ${error.message}` };
  }
}
readFile.metadata = {
    name: "readFile",
    description: "Reads the entire content of a specified file.",
    parameters: {
        type: "object",
        properties: {
            filePath: { type: "string", description: "The path to the file to be read." }
        },
        required: ["filePath"]
    }
};

async function writeFile({ filePath, content }) {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true, message: `File successfully written to ${filePath}.` };
  } catch (error) {
    return { success: false, error: `Failed to write file: ${error.message}` };
  }
}
writeFile.metadata = {
    name: "writeFile",
    description: "Writes or overwrites content to a specified file.",
    parameters: {
        type: "object",
        properties: {
            filePath: { type: "string", description: "The path of the file to write to." },
            content: { type: "string", description: "The content to write to the file." }
        },
        required: ["filePath", "content"]
    }
};

async function deleteFile({ filePath }) {
    try {
        await fs.unlink(filePath);
        return { success: true, message: `File ${filePath} deleted successfully.` };
    } catch (error) {
        return { success: false, error: `Failed to delete file: ${error.message}` };
    }
}
deleteFile.metadata = {
    name: "deleteFile",
    description: "Deletes a specified file.",
    parameters: {
        type: "object",
        properties: {
            filePath: { type: "string", description: "The path to the file to be deleted." }
        },
        required: ["filePath"]
    }
};

// --- Directory Operations ---

async function listFiles({ directoryPath = '.' }) {
  try {
    const files = await fs.readdir(directoryPath);
    // Optional: To provide more detail, you could stat each file.
    // For now, just listing names is sufficient and fast.
    return { success: true, files };
  } catch (error) {
    return { success: false, error: `Failed to list files: ${error.message}` };
  }
}
listFiles.metadata = {
    name: "listFiles",
    description: "Lists all files and subdirectories in a specified directory.",
    parameters: {
        type: "object",
        properties: {
            directoryPath: { type: "string", description: "The path to the directory.", default: "." }
        },
        required: []
    }
};


export default { readFile, writeFile, deleteFile, listFiles };

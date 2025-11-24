/**
 * 🛠️ Sandbox Tools - Refactored with Dependency Injection
 * @version 2.0.0
 * This module exports a factory function that creates the sandbox tools, 
 * ensuring they use the server-level singleton instance of SandboxManager.
 */

// --- Tool Function Definitions ---
// These functions are defined but need the sandboxManager instance to be useful.

async function executeShellCommand(sandboxManager, { command, sessionId, cwd }) {
    return sandboxManager.executeShell(command, { sessionId, cwd });
}

async function createSandboxFile(sandboxManager, { sessionId, filePath, content }) {
    return sandboxManager.writeFile(sessionId, filePath, content);
}

async function readSandboxFile(sandboxManager, { sessionId, filePath }) {
    return sandboxManager.readFile(sessionId, filePath);
}

async function listSandboxFiles(sandboxManager, { sessionId, directoryPath = '' }) {
    return sandboxManager.listFiles(sessionId, directoryPath);
}

// --- Metadata Definitions ---
// Metadata is static and doesn't depend on the instance.

const executeShellCommandMetadata = {
    name: "executeShellCommand",
    description: "Executes a shell command within a secure, isolated sandbox environment.",
    parameters: { /* ... */ }
};

const createSandboxFileMetadata = {
    name: "createSandboxFile",
    description: "Creates or overwrites a file with given content inside a sandbox session.",
    parameters: { /* ... */ }
};

const readSandboxFileMetadata = {
    name: "readSandboxFile",
    description: "Reads the content of a file from a sandbox session.",
    parameters: { /* ... */ }
};

const listSandboxFilesMetadata = {
    name: "listSandboxFiles",
    description: "Lists all files and directories within a specified path in a sandbox session.",
    parameters: { /* ... */ }
};


// --- Factory Function for Export ---

/**
 * Creates and returns the sandbox toolset, binding them to the provided SandboxManager instance.
 * @param {object} dependencies - The dependencies object from the server, containing the sandboxManager.
 * @returns {object} The fully configured and bound tool functions.
 */
function sandboxToolsFactory({ sandboxManager }) {
    if (!sandboxManager) {
        throw new Error("sandboxToolsFactory requires a sandboxManager instance.");
    }

    // Bind the sandboxManager instance to each tool function
    const boundExecuteShellCommand = executeShellCommand.bind(null, sandboxManager);
    const boundCreateSandboxFile = createSandboxFile.bind(null, sandboxManager);
    const boundReadSandboxFile = readSandboxFile.bind(null, sandboxManager);
    const boundListSandboxFiles = listSandboxFiles.bind(null, sandboxManager);

    // Attach metadata to the bound functions
    boundExecuteShellCommand.metadata = executeShellCommandMetadata;
    boundCreateSandboxFile.metadata = createSandboxFileMetadata;
    boundReadSandboxFile.metadata = readSandboxFileMetadata;
    boundListSandboxFiles.metadata = listSandboxFilesMetadata;

    return {
        executeShellCommand: boundExecuteShellCommand,
        createSandboxFile: boundCreateSandboxFile,
        readSandboxFile: boundReadSandboxFile,
        listSandboxFiles: boundListSandboxFiles,
    };
}

export default sandboxToolsFactory;

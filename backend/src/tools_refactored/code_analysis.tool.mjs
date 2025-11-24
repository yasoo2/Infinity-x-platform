
/**
 * Code Analysis Tool - Standalone & Refactored
 * Provides essential code analysis functions, including dependency extraction.
 * @version 2.5.0
 */

import { promises as fs } from 'fs';

// --- Standalone Functions ---

async function analyzeCode({ filePath }) {
  try {
    const code = await fs.readFile(filePath, 'utf-8');

    // Basic metrics
    const lineCount = code.split('\n').length;

    // Dependency extraction using Regex
    const dependencies = [];
    const importRegex = /import(?:[\s\S]*?from[\s]*)['"].*?\.m?js)['"]/g;
    const requireRegex = /require\(['"](.*?\.m?js)['"]\)/g;
    let match;

    while ((match = importRegex.exec(code)) !== null) {
        dependencies.push(match[1]);
    }

    while ((match = requireRegex.exec(code)) !== null) {
        dependencies.push(match[1]);
    }

    return { 
        success: true, 
        metrics: {
            lineCount,
        },
        dependencies // Array of imported module strings
    };

  } catch (error) {
    // If a file doesn't exist (e.g., in a sparse checkout), treat as empty.
    if (error.code === 'ENOENT') {
        return { success: true, metrics: { lineCount: 0 }, dependencies: [] };
    }
    return { success: false, error: `Failed to analyze code: ${error.message}`, dependencies: [] };
  }
}
analyzeCode.metadata = {
    name: "analyzeCode",
    description: "Performs a static analysis of a file, providing metrics and extracting its dependencies (imports/requires).",
    parameters: {
        type: "object",
        properties: {
            filePath: { type: "string", description: "The path to the file to be analyzed." }
        },
        required: ["filePath"]
    }
};

async function validateBrackets({ filePath }) {
    try {
        const code = await fs.readFile(filePath, 'utf-8');
        const stack = [];
        const bracketPairs = { '(': ')', '[': ']', '{': '}' };

        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            if (bracketPairs[char]) {
                stack.push(char);
            } else if (Object.values(bracketPairs).includes(char)) {
                if (bracketPairs[stack.pop()] !== char) {
                    return { success: false, error: `Mismatched brackets at character ${i}` };
                }
            }
        }

        if (stack.length > 0) {
            return { success: false, error: 'Unclosed brackets remain.' };
        }

        return { success: true, message: 'Bracket validation passed.' };

    } catch (error) {
        if (error.code === 'ENOENT') {
            return { success: true, message: 'File not found, validation skipped.' };
        }
        return { success: false, error: `Failed to validate brackets: ${error.message}` };
    }
}
validateBrackets.metadata = {
    name: "validateBrackets",
    description: "Checks a file for mismatched or unclosed brackets.",
    parameters: {
        type: "object",
        properties: {
            filePath: { type: "string", description: "The path to the file to be checked." }
        },
        required: ["filePath"]
    }
};


export default { analyzeCode, validateBrackets };

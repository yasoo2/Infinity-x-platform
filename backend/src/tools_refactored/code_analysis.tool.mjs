
/**
 * Code Analysis Tool Adapter - The Bridge
 * This tool acts as a bridge between the complex, plugin-based CodeTools engine
 * and the main AdvancedToolsManager, making its capabilities discoverable and usable.
 * @version 1.0.0
 */

import codeToolsEngine from './code.tool.mjs'; // Importing the complex engine
import { promises as fs } from 'fs';

// --- Adapter Functions ---

async function analyzeCode({ filePath }) {
  try {
    // 1. Read the file first
    const code = await fs.readFile(filePath, 'utf-8');

    // 2. Use the internal engine to perform the analysis
    const result = await codeToolsEngine.executeTask({
      action: 'analyze', 
      language: 'javascript', // This could be determined dynamically in a future version
      code: code
    });

    return result;

  } catch (error) {
    return { success: false, error: `Failed to analyze code: ${error.message}` };
  }
}
analyzeCode.metadata = {
    name: "analyzeCode",
    description: "Performs a deep static analysis of a JavaScript file, providing metrics like complexity, dependencies, and function count.",
    parameters: {
        type: "object",
        properties: {
            filePath: { type: "string", description: "The path to the JavaScript file to be analyzed." }
        },
        required: ["filePath"]
    }
};

async function validateBrackets({ filePath }) {
  try {
    // 1. Read the file
    const code = await fs.readFile(filePath, 'utf-8');

    // 2. Use the internal engine to validate brackets
    const result = await codeToolsEngine.executeTask({
      action: 'validate-brackets',
      language: 'javascript', // This specific validator works on any language, denoted by '*' in the engine
      code: code
    });
    
    return result;

  } catch (error) {
    return { success: false, error: `Failed to validate brackets: ${error.message}` };
  }
}
validateBrackets.metadata = {
    name: "validateBrackets",
    description: "Checks a file for mismatched or unclosed brackets, ignoring comments and strings.",
    parameters: {
        type: "object",
        properties: {
            filePath: { type: "string", description: "The path to the file to be checked." }
        },
        required: ["filePath"]
    }
};


export default { analyzeCode, validateBrackets };

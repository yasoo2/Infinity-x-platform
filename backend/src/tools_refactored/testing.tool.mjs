/**
 * Automated Testing Tool - Bridge to the Automated Testing System
 * @version 1.0.3
 */
import { testingSystem } from '../systems/testing.service.mjs';
import { readFile } from 'fs/promises';

/**
 * Generates and then runs tests for a specified source file.
 */
async function generateAndRunTests({ filePath }) {
  try {
    console.log(`🤖 Starting test generation and execution for ${filePath}...`);
    
    const fileContent = await readFile(filePath, 'utf8');
    if (!fileContent) {
        return { success: false, error: `File not found or empty: ${filePath}` };
    }

    const generationResult = await testingSystem.generateTests(filePath, fileContent);
    if (!generationResult || !generationResult.testFilePath) {
        return { success: false, error: 'Test generation failed to produce a file path.' };
    }

    const runResult = await testingSystem.runTests(generationResult.testFilePath);

    return { 
        success: true, 
        generation: generationResult, 
        results: runResult 
    };

  } catch (error) {
    console.error('❌ Test generation/execution failed:', error);
    return { success: false, error: `Failed to generate or run tests: ${error.message}` };
  }
}

generateAndRunTests.metadata = {
    name: "generateAndRunTests",
    description: "Generates a new test file for a given source code file using AI, saves it, and then executes the tests, returning the results. This is the primary tool for ensuring code quality.",
    parameters: {
        type: "object",
        properties: {
            filePath: { 
                type: "string", 
                description: "The path to the source code file for which to generate and run tests."
            }
        },
        required: ["filePath"]
    }
};

/**
 * Runs an existing test suite.
 */
async function runExistingTests({ testFilePath }) {
    try {
        console.log(`🧪 Running existing tests at ${testFilePath}...`);
        const results = await testingSystem.runTests(testFilePath);
        return { success: true, results };
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        return { success: false, error: `Failed to run tests: ${error.message}` };
    }
}

runExistingTests.metadata = {
    name: "runExistingTests",
    description: "Executes an existing test suite located at a specific file path or directory and returns the results.",
    parameters: {
        type: "object",
        properties: {
            testFilePath: { 
                type: "string", 
                description: "The path to the test file or directory containing the tests to run."
            }
        },
        required: ["testFilePath"]
    }
};

export default { generateAndRunTests, runExistingTests };

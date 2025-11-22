/**
 * Automated Testing Tool - Bridge to the Automated Testing System
 * @version 1.0.0
 */

import { testingSystem } from '../systems/testing.service.mjs';
import { read_file } from '../../tools_available/fs.cjs'; // Assuming access to basic fs tools

/**
 * Generates and then runs tests for a specified source file.
 * @param {object} params - The parameters for the operation.
 * @param {string} params.filePath - The path to the source code file to test.
 * @returns {Promise<object>} - An object containing the test generation and execution results.
 */
async function generateAndRunTests({ filePath }) {
  try {
    console.log(`🤖 Starting test generation and execution for ${filePath}...`);
    
    // 1. Read the file content first
    const fileContent = await read_file({ path: filePath });
    if (!fileContent) {
        return { success: false, error: `File not found or empty: ${filePath}` };
    }

    // 2. Generate tests
    const generationResult = await testingSystem.generateTests(filePath, fileContent);
    if (!generationResult || !generationResult.testFilePath) {
        return { success: false, error: 'Test generation failed to produce a file path.' };
    }

    // 3. Run the newly created tests
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
 * @param {object} params - The parameters for running tests.
 * @param {string} params.testFilePath - The path to the test file or directory to run.
 * @returns {Promise<object>} - An object containing the test execution results.
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

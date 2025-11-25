/**
 * 🧪 Automated Testing System
 * AI-powered test generation and execution.
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class AutomatedTestingSystem {

  async generateTests(filePath, fileContent) {
    const language = this.detectLanguage(filePath);
    const framework = await this.detectFramework(filePath);

    console.log(`🧪 Generating ${framework} tests for ${filePath}...`);

    const prompt = `
    You are an expert QA engineer specializing in automated testing. Your task is to generate a complete test file for the following source code.

    **Source Code (${language}):**
    \`\`\`${language}
${fileContent}
    \`\`\`

    **Requirements:**
1.  Use the **${framework}** testing framework.
2.  Cover all public functions and methods.
3.  Include unit tests, integration tests (if applicable), and edge case tests.
4.  Add clear descriptions for each test case.
5.  Generate a runnable test file with all necessary imports and setup. Do not include any explanatory text outside of the code itself.

    Respond with ONLY the raw code for the test file.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'system', content: 'You are a world-class QA engineer.' }, { role: 'user', content: prompt }],
      temperature: 0.2
    });

    let testCode = response.choices[0].message.content;
    const match = testCode.match(/```(?:[a-z]+)?\n([\s\S]*?)```/);
    if (match) testCode = match[1];

    const testFilePath = this.getTestFilePath(filePath, framework);
    await fs.writeFile(testFilePath, testCode);

    return { testFilePath, testCode, framework };
  }

  async runTests(testFilePath) {
    console.log(`🧪 Running tests in ${testFilePath}...`);
    const projectPath = path.dirname(testFilePath); // A bit naive, might need better project root finding
    try {
        // This assumes a standard test command exists in package.json
        const { stdout, stderr } = await execAsync('npm test', { cwd: projectPath });
        const results = await this.parseTestResults(stdout, stderr);
        console.log('🧪 Tests finished.');
        return results;
    } catch (error) {
        console.error('🧪 Test execution failed:', error.stderr);
        return this.parseTestResults(error.stdout, error.stderr);
    }
  }

  detectLanguage(filePath) {
    const extension = path.extname(filePath);
    const map = { '.js': 'javascript', '.mjs': 'javascript', '.ts': 'typescript', '.py': 'python' };
    return map[extension] || 'plaintext';
  }

  async detectFramework(filePath) {
      // Basic detection, can be improved
      if (filePath.includes('.test.js') || filePath.includes('.spec.js')) return 'jest';
      const packageJsonPath = path.join(process.cwd(), 'package.json'); // Assumes running from project root
      try {
          const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          if (deps.jest) return 'jest';
          if (deps.mocha) return 'mocha';
          if (deps.vitest) return 'vitest';
      } catch (e) {
          // ignore
      }
      return 'jest'; // Default
  }

  getTestFilePath(originalPath, framework) {
      const dir = path.dirname(originalPath);
      const name = path.basename(originalPath, path.extname(originalPath));
      return path.join(dir, `${name}.test.js`); // Simplistic
  }

  async parseTestResults(stdout, stderr) {
      const prompt = `
      Analyze the following test runner output and summarize the results in JSON format.

    **STDOUT:**
${stdout}

    **STDERR:**
${stderr}

    Provide a summary including total tests, passes, failures, and a list of failed tests with their reasons.

    JSON format: { "summary": { "total": ..., "passed": ..., "failed": ... }, "failures": [ { "testName": "...", "reason": "..." } ] }
      `;
      const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
      });
      return JSON.parse(response.choices[0].message.content);
  }
}

export const testingSystem = new AutomatedTestingSystem();
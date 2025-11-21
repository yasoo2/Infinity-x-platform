/**
 * Code Tool - The Ultimate Programming Tool for JOEngine AGI
 *
 * Capabilities:
 * - Write, edit, execute, analyze, and search code.
 * - Supports Python, JavaScript, Shell, and more.
 * - Advanced search with Glob and Grep.
 * - Securely executes code via stdin streaming.
 */

import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { BaseTool } from './ToolsSystem.mjs';
import { glob } from 'glob';

export class CodeTool extends BaseTool {
  constructor() {
    super(
      'code',
      'Write, edit, execute, analyze, and search code in multiple languages',
      {
        action: {
          type: 'string',
          required: true,
          enum: ['write', 'edit', 'execute', 'analyze', 'search', 'lint', 'fix'],
          description: 'Action to perform'
        },
        language: {
          type: 'string',
          required: false,
          enum: ['javascript', 'python', 'shell', 'html', 'css'],
          description: 'Programming language for execute, write, or analyze'
        },
        code: {
          type: 'string',
          required: false,
          description: 'Code to write or execute'
        },
        file: {
          type: 'string',
          required: false,
          description: 'File path to read/write/edit/execute'
        },
        scope: {
          type: 'string',
          required: false,
          description: 'Glob pattern for file search scope (e.g., **/*.js)'
        },
        query: {
            type: 'string',
            required: false,
            description: 'Search query for content (grep) or filenames (glob)'
        },
        searchType: {
          type: 'string',
          required: false,
          enum: ['glob', 'grep'],
          description: 'Type of search: glob (file names) or grep (file content)'
        }
      }
    );

    this.workDir = process.cwd();
  }

  async execute(params) {
    const { action } = params;

    switch (action) {
      case 'write':
        return await this.writeCode(params);
      case 'edit':
        return await this.editCode(params);
      case 'execute':
        return await this.executeCode(params);
      case 'analyze':
        return await this.analyzeCode(params);
      case 'search':
        return await this.searchCode(params);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async writeCode({ file, code }) {
    if (!file || code === undefined) {
      throw new Error('File path and code are required');
    }
    const filePath = path.join(this.workDir, file);
    console.log(`📝 Writing code to: ${filePath}`);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, code, 'utf8');
    return { success: true, file: filePath, size: code.length };
  }

  async editCode({ file, code }) {
     if (!file || code === undefined) {
      throw new Error('File and code are required for edit action');
    }
    const filePath = path.join(this.workDir, file);
    console.log(`✏️  Editing code in: ${filePath}`);
    const currentCode = await fs.readFile(filePath, 'utf8');
    await fs.writeFile(filePath, code, 'utf8');
    return { success: true, file: filePath, oldSize: currentCode.length, newSize: code.length };
  }

  async executeCode({ language, code, file }) {
    if (!language || (!code && !file)) {
        throw new Error('Language and either code or file is required');
    }

    const commandMap = {
        python: 'python3',
        javascript: 'node',
        shell: 'bash'
    };

    const command = commandMap[language];
    if (!command) {
        throw new Error(`Unsupported language: ${language}`);
    }

    console.log(`▶️  Executing ${language} code...`);

    return new Promise((resolve) => {
        const process = spawn(command, [], { cwd: this.workDir, shell: true });

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => stdout += data.toString());
        process.stderr.on('data', (data) => stderr += data.toString());

        process.on('close', (code) => {
            resolve({
                success: code === 0,
                exitCode: code,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            });
        });
        
        process.on('error', (err) => {
             resolve({ success: false, error: `Failed to start subprocess. ${err.message}` });
        });

        if (code) {
            process.stdin.write(code);
            process.stdin.end();
        } else if (file) {
            const filePath = path.join(this.workDir, file);
            fs.createReadStream(filePath).pipe(process.stdin);
        }
    });
  }

  async analyzeCode({ file, code }) {
    const content = code || await fs.readFile(path.join(this.workDir, file), 'utf8');
    console.log(`🔍 Analyzing code...`);
    const lines = content.split('\n');
    const analysis = {
      lines: lines.length,
      characters: content.length,
      nonEmptyLines: lines.filter(l => l.trim()).length,
    };
    return { success: true, analysis };
  }

  async searchCode({ searchType, scope, query }) {
    if (!searchType || !query) {
      throw new Error('searchType and query are required');
    }
    console.log(`🔎 Searching with ${searchType}...`);

    if (searchType === 'glob') {
      const files = await glob(query, { cwd: this.workDir, dot: true });
      return { success: true, results: files };
    }

    if (searchType === 'grep') {
        if (!scope) {
            throw new Error('Scope is required for grep search');
        }
        const files = await glob(scope, { cwd: this.workDir, dot: true, nodir: true });
        const results = [];

        for (const file of files) {
            const content = await fs.readFile(path.join(this.workDir, file), 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (line.includes(query)) {
                    results.push({ file, line: index + 1, content: line.trim() });
                }
            });
        }
        return { success: true, results };
    }
  }
}

export default CodeTool;

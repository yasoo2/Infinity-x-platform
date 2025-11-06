/**
 * SandboxManager.mjs
 * Manages isolated execution environments for safe code execution
 * Supports Shell, Python, Node.js, and other command execution
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

class SandboxManager {
  constructor(options = {}) {
    this.sandboxDir = options.sandboxDir || path.join(os.tmpdir(), 'infinity-sandbox');
    this.maxConcurrent = options.maxConcurrent || 5;
    this.timeout = options.timeout || 30000; // 30 seconds
    this.activeProcesses = new Map();
    this.processCount = 0;
    this.useDocker = false; // Docker not supported on Render
  }

  /**
   * Initialize the sandbox directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.sandboxDir, { recursive: true });
      console.log(`✅ Sandbox Manager initialized at ${this.sandboxDir}`);
      console.log('ℹ️ Using process-based sandboxing (Docker not available on Render)');
    } catch (err) {
      console.error('❌ Failed to initialize Sandbox Manager:', err);
      throw err;
    }
  }

  /**
   * Create a new isolated sandbox session
   */
  async createSession(sessionId = null) {
    const id = sessionId || uuidv4();
    const sessionPath = path.join(this.sandboxDir, id);
    
    try {
      await fs.mkdir(sessionPath, { recursive: true });
      
      const session = {
        id,
        path: sessionPath,
        createdAt: new Date(),
        processes: [],
        files: []
      };
      
      return session;
    } catch (err) {
      console.error(`❌ Failed to create sandbox session ${id}:`, err);
      throw err;
    }
  }

  /**
   * Execute a shell command in the sandbox
   */
  async executeShell(command, options = {}) {
    const sessionId = options.sessionId || uuidv4();
    const timeout = options.timeout || this.timeout;
    const cwd = options.cwd || path.join(this.sandboxDir, sessionId);

    // Check concurrent process limit
    if (this.activeProcesses.size >= this.maxConcurrent) {
      throw new Error(`Maximum concurrent processes (${this.maxConcurrent}) reached`);
    }

    return new Promise((resolve, reject) => {
      const processId = uuidv4();
      let output = '';
      let errorOutput = '';
      let timedOut = false;

      try {
        // Ensure working directory exists
        fs.mkdir(cwd, { recursive: true }).catch(console.error);

        const process = spawn('bash', ['-c', command], {
          cwd,
          timeout,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            NODE_ENV: 'sandbox',
            SANDBOX_SESSION_ID: sessionId
          }
        });

        const timeoutHandle = setTimeout(() => {
          timedOut = true;
          process.kill();
        }, timeout);

        process.stdout.on('data', (data) => {
          output += data.toString();
        });

        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        process.on('close', (code) => {
          clearTimeout(timeoutHandle);
          this.activeProcesses.delete(processId);

          if (timedOut) {
            reject(new Error(`Command execution timeout after ${timeout}ms`));
          } else {
            resolve({
              code,
              stdout: output,
              stderr: errorOutput,
              success: code === 0,
              sessionId,
              processId
            });
          }
        });

        process.on('error', (err) => {
          clearTimeout(timeoutHandle);
          this.activeProcesses.delete(processId);
          reject(err);
        });

        this.activeProcesses.set(processId, { process, startTime: Date.now() });
        this.processCount++;
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Execute Python code in the sandbox
   */
  async executePython(code, options = {}) {
    const sessionId = options.sessionId || uuidv4();
    const sessionPath = path.join(this.sandboxDir, sessionId);
    const scriptPath = path.join(sessionPath, `script_${uuidv4()}.py`);

    try {
      await fs.mkdir(sessionPath, { recursive: true });
      await fs.writeFile(scriptPath, code);

      const result = await this.executeShell(`python3 "${scriptPath}"`, {
        ...options,
        sessionId,
        cwd: sessionPath
      });

      // Clean up script
      await fs.unlink(scriptPath).catch(console.error);

      return result;
    } catch (err) {
      console.error('❌ Python execution failed:', err);
      throw err;
    }
  }

  /**
   * Execute Node.js code in the sandbox
   */
  async executeNode(code, options = {}) {
    const sessionId = options.sessionId || uuidv4();
    const sessionPath = path.join(this.sandboxDir, sessionId);
    const scriptPath = path.join(sessionPath, `script_${uuidv4()}.mjs`);

    try {
      await fs.mkdir(sessionPath, { recursive: true });
      await fs.writeFile(scriptPath, code);

      const result = await this.executeShell(`node "${scriptPath}"`, {
        ...options,
        sessionId,
        cwd: sessionPath
      });

      // Clean up script
      await fs.unlink(scriptPath).catch(console.error);

      return result;
    } catch (err) {
      console.error('❌ Node.js execution failed:', err);
      throw err;
    }
  }

  /**
   * Write a file to the sandbox
   */
  async writeFile(sessionId, filePath, content) {
    const sessionPath = path.join(this.sandboxDir, sessionId);
    const fullPath = path.join(sessionPath, filePath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(sessionPath)) {
      throw new Error('Invalid file path: directory traversal detected');
    }

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
      return { success: true, path: fullPath };
    } catch (err) {
      console.error('❌ Failed to write file:', err);
      throw err;
    }
  }

  /**
   * Read a file from the sandbox
   */
  async readFile(sessionId, filePath) {
    const sessionPath = path.join(this.sandboxDir, sessionId);
    const fullPath = path.join(sessionPath, filePath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(sessionPath)) {
      throw new Error('Invalid file path: directory traversal detected');
    }

    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return { success: true, content };
    } catch (err) {
      console.error('❌ Failed to read file:', err);
      throw err;
    }
  }

  /**
   * List files in a sandbox directory
   */
  async listFiles(sessionId, dirPath = '') {
    const sessionPath = path.join(this.sandboxDir, sessionId);
    const fullPath = dirPath ? path.join(sessionPath, dirPath) : sessionPath;

    // Security: prevent directory traversal
    if (!fullPath.startsWith(sessionPath)) {
      throw new Error('Invalid directory path: directory traversal detected');
    }

    try {
      const files = await fs.readdir(fullPath, { withFileTypes: true });
      return {
        success: true,
        files: files.map(file => ({
          name: file.name,
          isDirectory: file.isDirectory(),
          isFile: file.isFile()
        }))
      };
    } catch (err) {
      console.error('❌ Failed to list files:', err);
      throw err;
    }
  }

  /**
   * Clean up a sandbox session
   */
  async cleanupSession(sessionId) {
    const sessionPath = path.join(this.sandboxDir, sessionId);

    try {
      // Kill any active processes for this session
      for (const [processId, { process }] of this.activeProcesses) {
        if (process.env?.SANDBOX_SESSION_ID === sessionId) {
          process.kill();
          this.activeProcesses.delete(processId);
        }
      }

      // Remove session directory
      await fs.rm(sessionPath, { recursive: true, force: true });
      return { success: true };
    } catch (err) {
      console.error('❌ Failed to cleanup session:', err);
      throw err;
    }
  }

  /**
   * Get sandbox statistics
   */
  getStats() {
    return {
      activeProcesses: this.activeProcesses.size,
      totalProcesses: this.processCount,
      sandboxDir: this.sandboxDir,
      maxConcurrent: this.maxConcurrent,
      dockerEnabled: this.useDocker
    };
  }

  /**
   * Kill a specific process
   */
  killProcess(processId) {
    const processInfo = this.activeProcesses.get(processId);
    if (processInfo) {
      processInfo.process.kill();
      this.activeProcesses.delete(processId);
      return { success: true };
    }
    return { success: false, error: 'Process not found' };
  }

  /**
   * Get active processes
   */
  getActiveProcesses() {
    const processes = [];
    for (const [processId, { startTime }] of this.activeProcesses) {
      processes.push({
        processId,
        uptime: Date.now() - startTime
      });
    }
    return processes;
  }
}

export default SandboxManager;

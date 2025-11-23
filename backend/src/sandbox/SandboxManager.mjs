/**
 * ⚛️ Sandbox Manager - Now with Real-time Event Streaming
 * @version 2.0.0
 * Manages isolated execution environments and now streams process output in real-time
 * via the central event bus, enabling features like live terminal feeds.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import eventBus from './core/event-bus.mjs'; // Import the central nervous system

class SandboxManager {
  constructor(options = {}) {
    this.sandboxDir = options.sandboxDir || path.join(os.tmpdir(), 'infinity-sandbox');
    // ... other configurations ...
    this.activeProcesses = new Map();
  }

  async initialize() {
    await fs.mkdir(this.sandboxDir, { recursive: true });
    console.log(`⚛️ Sandbox Manager v2.0 initialized at ${this.sandboxDir}`);
  }

  /**
   * Executes a shell command and streams the output in real-time.
   */
  async executeShell(command, options = {}) {
    // A session ID is crucial for routing the output to the correct client.
    const sessionId = options.sessionId;
    if (!sessionId) {
      return Promise.reject(new Error('A session ID is required for real-time execution.'));
    }

    const timeout = options.timeout || this.timeout || 60000; // 60 seconds
    const cwd = options.cwd || path.join(this.sandboxDir, sessionId);

    return new Promise(async (resolve, reject) => {
      let finalOutput = '';
      let finalErrorOutput = '';

      try {
        await fs.mkdir(cwd, { recursive: true });

        const process = spawn('bash', ['-c', command], {
          cwd,
          timeout,
          env: { ...process.env, SANDBOX_SESSION_ID: sessionId }
        });

        const processId = process.pid;
        this.activeProcesses.set(processId, process);

        // --- Real-time Streaming --- 

        process.stdout.on('data', (data) => {
          const output = data.toString();
          finalOutput += output;
          // Emit the data chunk to the event bus for any service to consume.
          eventBus.emit('sandbox:data', { sessionId, data: output });
        });

        process.stderr.on('data', (data) => {
          const errorOutput = data.toString();
          finalErrorOutput += errorOutput;
          // Emit the error chunk to the event bus.
          eventBus.emit('sandbox:error', { sessionId, error: errorOutput });
        });

        process.on('close', (code) => {
          this.activeProcesses.delete(processId);
          // Announce that the process has finished.
          eventBus.emit('sandbox:exit', { sessionId, code });

          // The promise still resolves with the full output for services that need it.
          resolve({
            code,
            stdout: finalOutput,
            stderr: finalErrorOutput,
            success: code === 0,
          });
        });

        process.on('error', (err) => {
          this.activeProcesses.delete(processId);
          eventBus.emit('sandbox:error', { sessionId, error: err.message });
          reject(err);
        });

      } catch (err) {
        eventBus.emit('sandbox:error', { sessionId, error: err.message });
        reject(err);
      }
    });
  }

  // The other methods (writeFile, readFile, executePython, etc.) can remain largely the same,
  // as they build upon the newly enhanced executeShell method.

  async executePython(code, options = {}) {
    const sessionPath = path.join(this.sandboxDir, options.sessionId);
    const scriptPath = path.join(sessionPath, `script_${uuidv4()}.py`);
    await fs.mkdir(sessionPath, { recursive: true });
    await fs.writeFile(scriptPath, code);
    const result = await this.executeShell(`python3 "${scriptPath}"`, options);
    await fs.unlink(scriptPath).catch(()=>{});
    return result;
  }

  async executeNode(code, options = {}) {
    const sessionPath = path.join(this.sandboxDir, options.sessionId);
    const scriptPath = path.join(sessionPath, `script_${uuidv4()}.mjs`);
    await fs.mkdir(sessionPath, { recursive: true });
    await fs.writeFile(scriptPath, code);
    const result = await this.executeShell(`node "${scriptPath}"`, options);
    await fs.unlink(scriptPath).catch(()=>{});
    return result;
  }

  async writeFile(sessionId, filePath, content) {
    // ... (implementation remains the same) ...
  }

  async readFile(sessionId, filePath) {
    // ... (implementation remains the same) ...
  }

  // ... etc ...
}

export default SandboxManager;

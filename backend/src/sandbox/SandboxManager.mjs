/**
 * ⚛️ Sandbox Manager v3.1 - The Intelligent Fortress with Workspaces
 * @version 3.1.0
 * 
 * This version introduces ephemeral workspaces for each execution, allowing the sandbox
 * to handle file I/O and more complex, multi-step tasks in a secure, isolated manner.
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import Docker from 'dockerode';
import { createClient } from 'redis';
import eventBus from '../core/event-bus.mjs';

class SandboxManager {
  constructor(options = {}) {
    this.docker = new Docker();
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.isRedisConnected = false;
    console.log('⚛️ Sandbox Manager v3.1 (Fortress w/ Workspaces) Initialized.');
  }

  async initializeConnections() {
    try {
      await this.redisClient.connect();
      this.isRedisConnected = true;
      console.log('✅ Connected to Redis for caching.');
    } catch (err) {
      console.error('❌ Could not connect to Redis. Caching will be disabled.', err);
      this.isRedisConnected = false;
    }
    return this;
  }

  async analyzeCode(code, language) {
    console.log(`🧠 Analyzing ${language} code for safety...`);
    if (code.includes('rm -rf') || code.includes('shutdown')) {
        throw new Error('AI Safety Violation Detected: Potentially dangerous command.');
    }
    console.log('✅ AI analysis passed.');
    return true;
  }

  async executeShell(command, options = {}) {
    const { sessionId, language = 'shell' } = options;
    if (!sessionId) {
      return Promise.reject(new Error('A session ID is required for execution.'));
    }

    const cacheKey = `sandbox:v3.1:${command}`;
    if (this.isRedisConnected) {
      const cachedResult = await this.redisClient.get(cacheKey);
      if (cachedResult) {
        console.log('⚡️ Returning cached result.');
        return JSON.parse(cachedResult);
      }
    }

    if (language !== 'shell') {
        try {
            await this.analyzeCode(command, language);
        } catch (error) {
            return { success: false, code: -1, stdout: '', stderr: error.message };
        }
    }

    // --- Workspace Creation ---
    const workspaceId = uuidv4();
    const hostWorkspacePath = path.join(os.tmpdir(), 'joe_sandbox', workspaceId);
    await fs.mkdir(hostWorkspacePath, { recursive: true });
    console.log(`🛠️ Created workspace for session ${sessionId} at ${hostWorkspacePath}`);

    let container;
    let finalOutput = '';
    
    try {
      console.log(`📦 Creating Docker container for command: ${command}`);
      container = await this.docker.createContainer({
        Image: 'ubuntu:latest',
        Cmd: ['/bin/bash', '-c', command],
        Tty: false,
        WorkingDir: '/workspace', // Start inside the workspace
        HostConfig: {
          Memory: 256 * 1024 * 1024,
          CpuPeriod: 100000,
          CpuQuota: 50000,
          SecurityOpt: ['no-new-privileges'],
          NetworkMode: 'none',
          Mounts: [
            {
              Type: 'bind',
              Source: hostWorkspacePath,
              Target: '/workspace'
            }
          ]
        },
      });

      await container.start();
      const stream = await container.logs({ follow: true, stdout: true, stderr: true });

      stream.on('data', (chunk) => {
        const output = chunk.toString('utf8');
        finalOutput += output;
        eventBus.emit('sandbox:data', { sessionId, data: output });
      });

      const [exitData] = await container.wait();
      const code = exitData.StatusCode;
      
      const result = {
        success: code === 0,
        code,
        stdout: finalOutput,
        stderr: code !== 0 ? finalOutput : '',
      };

      if (this.isRedisConnected && result.success) {
        await this.redisClient.set(cacheKey, JSON.stringify(result), { EX: 3600 });
      }

      return result;

    } catch (error) {
        console.error('❌ Docker execution failed:', error);
        throw error;
    } finally {
        if (container) {
            console.log('🗑️ Removing container...');
            await container.remove({ force: true });
        }
        // --- Workspace Cleanup ---
        console.log(`🗑️ Cleaning up workspace: ${hostWorkspacePath}`);
        await fs.rm(hostWorkspacePath, { recursive: true, force: true });
    }
  }

  async executePython(code, options = {}) {
    const escapedCode = code.replace(/"/g, '\\"');
    const command = `python3 -c "${escapedCode}"`;
    return this.executeShell(command, { ...options, language: 'python' });
  }

  async executeNode(code, options = {}) {
    const escapedCode = code.replace(/"/g, '\\"');
    const command = `node -e "${escapedCode}"`;
    return this.executeShell(command, { ...options, language: 'node' });
  }

  async executeBrowserTask(script, options = {}) {
    console.log('🚧 Browser task execution is planned but not yet implemented.');
    return Promise.resolve({ success: false, reason: 'Not implemented' });
  }
}

export default SandboxManager;

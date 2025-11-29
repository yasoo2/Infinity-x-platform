/**
 * 🚀 Advanced Auto-Deployment System
 * Smart auto-deployment to various platforms.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
// Removed unused axios import

const execAsync = promisify(exec);

class VercelDeployer {
  async deploy(projectPath, deployment) {
    void deployment;
    const token = process.env.VERCEL_TOKEN;
    if (!token) throw new Error('VERCEL_TOKEN is not set');

    const command = `vercel --token ${token} --prod`;
    const { stdout } = await execAsync(command, { cwd: projectPath });
    
    return { url: stdout.trim(), id: null, platform: 'vercel' };
  }
}

class RailwayDeployer {
  async deploy(projectPath, deployment) {
    void deployment;
    const token = process.env.RAILWAY_TOKEN;
    if (!token) throw new Error('RAILWAY_TOKEN is not set');

    const command = `railway up`;
    const { stdout } = await execAsync(command, { 
        cwd: projectPath,
        env: { ...process.env, RAILWAY_TOKEN: token }
    });

    const urlMatch = stdout.match(/https:\/\/[^\s]+/);
    return { url: urlMatch ? urlMatch[0] : null, platform: 'railway' };
  }
}

class AdvancedAutoDeploymentSystem {
  constructor() {
    this.platforms = {
      vercel: new VercelDeployer(),
      railway: new RailwayDeployer(),
    };
    this.deployments = new Map();
  }

  async deploy(projectPath, options = {}) {
    const { platform = 'vercel', autoTest = true } = options;
    void autoTest;
    const deployer = this.platforms[platform];
    if (!deployer) throw new Error(`Unsupported platform: ${platform}`);

    console.log(`🚀 Starting deployment to ${platform}...`);

    const deploymentId = `dep_${crypto.randomUUID()}`;
    const deployment = {
      id: deploymentId,
      project: path.basename(projectPath),
      platform,
      status: 'preparing',
      startTime: Date.now(),
      logs: []
    };
    this.deployments.set(deploymentId, deployment);

    const log = (step, message) => {
      console.log(`[${step}] ${message}`);
      deployment.logs.push({ step, message, timestamp: Date.now() });
    };

    try {
      log('prepare', 'Analyzing project...');
      const analysis = await this.analyzeProject(projectPath);
      deployment.requirements = analysis;

      if (autoTest && analysis.hasTests) {
        log('test', 'Running tests...');
        await execAsync('npm test', { cwd: projectPath });
        log('test', '✅ Tests passed');
      }

      if (analysis.buildCommand) {
        log('build', `Building project with: ${analysis.buildCommand}`)
        await execAsync(analysis.buildCommand, { cwd: projectPath });
        log('build', '✅ Project built successfully');
      }

      log('deploy', `Deploying to ${platform}...`);
      const result = await deployer.deploy(projectPath, deployment);
      log('deploy', `✅ Deployment successful! URL: ${result.url}`);

      deployment.status = 'success';
      deployment.url = result.url;

      return { success: true, deploymentId, url: result.url };

    } catch (error) {
      log('error', `❌ Deployment failed: ${error.message}`);
      deployment.status = 'failed';
      deployment.error = error.message;
      console.error(error);
      return { success: false, error: error.message, logs: deployment.logs };
    }
  }

  async analyzeProject(projectPath) {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    return {
      name: packageJson.name,
      buildCommand: packageJson.scripts?.build,
      startCommand: packageJson.scripts?.start,
      hasTests: !!packageJson.scripts?.test,
      framework: this.detectFramework(packageJson),
    };
  }

  detectFramework(packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps.next) return 'next';
    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps.express) return 'express';
    return 'unknown';
  }

  getDeploymentStatus(deploymentId) {
    return this.deployments.get(deploymentId);
  }
}

export const deploymentSystem = new AdvancedAutoDeploymentSystem();

/**
 * Cloudflare Deployer - نظام النشر التلقائي على Cloudflare Pages
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

/**
 * نشر مشروع على Cloudflare Pages
 */
export async function deployToCloudflare(projectId, projectPath, projectName) {
  try {
    console.log(`[CloudflareDeployer] Deploying ${projectId} to Cloudflare Pages...`);
    
    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      console.warn('[CloudflareDeployer] Cloudflare credentials not configured');
      return {
        success: false,
        error: 'Cloudflare credentials not configured',
        url: null
      };
    }
    
    // إنشاء اسم فريد للمشروع
    const safeName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .substring(0, 50);
    
    const deploymentName = `${safeName}-${projectId.substring(0, 8)}`;
    
    // استخدام wrangler CLI للنشر
    const command = `npx wrangler pages deploy ${projectPath} --project-name=${deploymentName}`;
    
    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: CF_API_TOKEN
      },
      cwd: projectPath
    });
    
    console.log('[CloudflareDeployer] Deployment output:', stdout);
    
    if (stderr && !stderr.includes('warning')) {
      console.error('[CloudflareDeployer] Deployment error:', stderr);
    }
    
    // استخراج URL من المخرجات
    const urlMatch = stdout.match(/https:\/\/[^\s]+\.pages\.dev/);
    const deploymentUrl = urlMatch ? urlMatch[0] : `https://${deploymentName}.pages.dev`;
    
    console.log(`[CloudflareDeployer] Deployed successfully: ${deploymentUrl}`);
    
    return {
      success: true,
      url: deploymentUrl,
      deploymentName
    };
  } catch (error) {
    console.error(`[CloudflareDeployer] Deployment failed:`, error);
    
    return {
      success: false,
      error: error.message,
      url: null
    };
  }
}

/**
 * نشر باستخدام Cloudflare API مباشرة
 */
export async function deployViaAPI(projectId, projectPath, projectName) {
  try {
    console.log(`[CloudflareDeployer] Deploying via API: ${projectId}`);
    
    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      throw new Error('Cloudflare credentials not configured');
    }
    
    // قراءة جميع الملفات
    const files = await readDirectoryRecursive(projectPath);
    
    // إنشاء manifest
    const manifest = {};
    for (const file of files) {
      const relativePath = path.relative(projectPath, file);
      const content = await fs.readFile(file, 'utf-8');
      manifest[`/${relativePath}`] = content;
    }
    
    // إنشاء المشروع على Cloudflare
    const safeName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .substring(0, 50);
    
    const deploymentName = `${safeName}-${projectId.substring(0, 8)}`;
    
    const createProjectResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: deploymentName,
          production_branch: 'main'
        })
      }
    );
    
    if (!createProjectResponse.ok) {
      const errorText = await createProjectResponse.text();
      console.log('[CloudflareDeployer] Project might already exist:', errorText);
    }
    
    // رفع الملفات
    const formData = new FormData();
    
    for (const [filePath, content] of Object.entries(manifest)) {
      const blob = new Blob([content], { type: 'text/plain' });
      formData.append('files', blob, filePath.substring(1)); // إزالة / من البداية
    }
    
    const deployResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${deploymentName}/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`
        },
        body: formData
      }
    );
    
    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      throw new Error(`Deployment failed: ${errorText}`);
    }
    
    const deployData = await deployResponse.json();
    const deploymentUrl = deployData.result?.url || `https://${deploymentName}.pages.dev`;
    
    console.log(`[CloudflareDeployer] Deployed successfully: ${deploymentUrl}`);
    
    return {
      success: true,
      url: deploymentUrl,
      deploymentName
    };
  } catch (error) {
    console.error(`[CloudflareDeployer] API deployment failed:`, error);
    
    return {
      success: false,
      error: error.message,
      url: null
    };
  }
}

/**
 * قراءة جميع الملفات في مجلد بشكل متكرر
 */
async function readDirectoryRecursive(dir) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== '.git') {
        const subFiles = await readDirectoryRecursive(fullPath);
        files.push(...subFiles);
      }
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * حذف مشروع من Cloudflare
 */
export async function deleteFromCloudflare(deploymentName) {
  try {
    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      throw new Error('Cloudflare credentials not configured');
    }
    
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${deploymentName}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delete failed: ${errorText}`);
    }
    
    console.log(`[CloudflareDeployer] Deleted project: ${deploymentName}`);
    
    return { success: true };
  } catch (error) {
    console.error(`[CloudflareDeployer] Delete failed:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * ☁️ Cloudflare Deployer - نظام النشر التلقائي المتقدم على Cloudflare Pages
 * نظام متطور للنشر مع دعم Workers و KV و R2
 * متوافق مع Joe Advanced Engine و Gemini Engine
 * 
 * @module CloudflareDeployer
 * @version 2.0.0
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import archiver from 'archiver';
import FormData from 'form-data';

const execAsync = promisify(exec);

// 🔑 بيانات الاعتماد
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * 🎯 فئة Cloudflare Deployer المتقدمة
 */
export class CloudflareDeployer {
  constructor(options = {}) {
    this.accountId = options.accountId || CF_ACCOUNT_ID;
    this.apiToken = options.apiToken || CF_API_TOKEN;
    this.config = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 2000,
      timeout: options.timeout || 300000, // 5 دقائق
      maxFileSize: options.maxFileSize || 25 * 1024 * 1024, // 25MB
      ...options
    };

    // 📊 إحصائيات
    this.stats = {
      totalDeployments: 0,
      successfulDeployments: 0,
      failedDeployments: 0,
      totalFilesUploaded: 0,
      totalBytesUploaded: 0
    };

    // ✅ التحقق من بيانات الاعتماد
    if (!this.accountId || !this.apiToken) {
      console.warn('⚠️ Cloudflare credentials not configured');
    } else {
      console.log('✅ Cloudflare Deployer initialized');
    }
  }

  /**
   * 🚀 نشر مشروع على Cloudflare Pages
   * @param {string} projectId - معرف المشروع
   * @param {string} projectPath - مسار المشروع
   * @param {string} projectName - اسم المشروع
   * @param {object} options - خيارات النشر
   * @returns {Promise<object>} - نتيجة النشر
   */
  async deployToCloudflare(projectId, projectPath, projectName, options = {}) {
    const startTime = Date.now();

    try {
      console.log(`☁️ [CloudflareDeployer] بدء النشر: ${projectId}`);
      console.log(`📁 المسار: ${projectPath}`);
      console.log(`📝 الاسم: ${projectName}`);

      // ✅ التحقق من بيانات الاعتماد
      if (!this.accountId || !this.apiToken) {
        throw new Error('Cloudflare credentials not configured. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
      }

      // ✅ التحقق من وجود المشروع
      const exists = await this.checkPathExists(projectPath);
      if (!exists) {
        throw new Error(`Project path does not exist: ${projectPath}`);
      }

      // 🎨 إنشاء اسم آمن للنشر
      const deploymentName = this.createSafeName(projectName, projectId);
      console.log(`🏷️ اسم النشر: ${deploymentName}`);

      // 🔍 تحليل المشروع
      const projectInfo = await this.analyzeProject(projectPath);
      console.log(`📊 معلومات المشروع:`, projectInfo);

      // 🎯 اختيار طريقة النشر
      let result;
      
      if (options.useAPI || projectInfo.totalSize > 100 * 1024 * 1024) {
        // استخدام API للمشاريع الكبيرة
        console.log('🔧 استخدام Cloudflare API للنشر...');
        result = await this.deployViaAPI(projectId, projectPath, deploymentName, options);
      } else {
        // استخدام Wrangler CLI
        console.log('⚡ استخدام Wrangler CLI للنشر...');
        result = await this.deployViaWrangler(projectPath, deploymentName, options);
      }

      // 📊 حساب الوقت المستغرق
      const duration = Date.now() - startTime;

      // 📈 تحديث الإحصائيات
      this.stats.totalDeployments++;
      if (result.success) {
        this.stats.successfulDeployments++;
      } else {
        this.stats.failedDeployments++;
      }

      console.log(`✅ النشر اكتمل في ${(duration / 1000).toFixed(2)}s`);

      return {
        ...result,
        projectId,
        deploymentName,
        duration,
        projectInfo,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.stats.totalDeployments++;
      this.stats.failedDeployments++;
      
      console.error('❌ [CloudflareDeployer] فشل النشر:', error);

      return {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        projectId,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * ⚡ النشر باستخدام Wrangler CLI
   */
  async deployViaWrangler(projectPath, deploymentName, options = {}) {
    try {
      // 🔍 التحقق من تثبيت Wrangler
      try {
        await execAsync('npx wrangler --version');
      } catch (error) {
        console.log('📦 تثبيت Wrangler...');
        await execAsync('npm install -g wrangler');
      }

      // 🔧 بناء الأمر
      const command = this.buildWranglerCommand(projectPath, deploymentName, options);
      console.log(`🔧 الأمر: ${command}`);

      // 🚀 تنفيذ النشر
      const { stdout, stderr } = await execAsync(command, {
        env: {
          ...process.env,
          CLOUDFLARE_ACCOUNT_ID: this.accountId,
          CLOUDFLARE_API_TOKEN: this.apiToken
        },
        cwd: projectPath,
        timeout: this.config.timeout,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      console.log('📋 مخرجات النشر:', stdout);

      if (stderr && !stderr.toLowerCase().includes('warning')) {
        console.warn('⚠️ تحذيرات النشر:', stderr);
      }

      // 🔍 استخراج URL
      const deploymentUrl = this.extractDeploymentUrl(stdout, deploymentName);

      // ✅ التحقق من النشر
      const isLive = await this.verifyDeployment(deploymentUrl);

      return {
        success: true,
        url: deploymentUrl,
        deploymentName,
        method: 'wrangler',
        verified: isLive,
        output: stdout
      };

    } catch (error) {
      console.error('❌ Wrangler deployment failed:', error);
      
      // 🔄 محاولة النشر عبر API كـ fallback
      if (options.fallbackToAPI !== false) {
        console.log('🔄 محاولة النشر عبر API...');
        return await this.deployViaAPI(null, projectPath, deploymentName, options);
      }

      throw error;
    }
  }

  /**
   * 🌐 النشر باستخدام Cloudflare API مباشرة
   */
  async deployViaAPI(projectId, projectPath, deploymentName, options = {}) {
    try {
      console.log('🌐 [CloudflareDeployer] النشر عبر API...');

      // 📦 إنشاء أو تحديث المشروع
      const project = await this.ensureProject(deploymentName, options);
      console.log('✅ المشروع جاهز:', project.name);

      // 📁 قراءة وتحضير الملفات
      const files = await this.prepareFiles(projectPath, options);
      console.log(`📁 عدد الملفات: ${files.length}`);

      // 🗜️ ضغط الملفات
      const zipBuffer = await this.createZipArchive(files, projectPath);
      console.log(`🗜️ حجم الأرشيف: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);

      // 📤 رفع النشر
      const deployment = await this.uploadDeployment(deploymentName, zipBuffer, options);
      console.log('✅ تم رفع النشر:', deployment.id);

      // ⏳ انتظار اكتمال النشر
      const finalDeployment = await this.waitForDeployment(
        deploymentName,
        deployment.id,
        options.timeout || 300000
      );

      // 📊 تحديث الإحصائيات
      this.stats.totalFilesUploaded += files.length;
      this.stats.totalBytesUploaded += zipBuffer.length;

      const deploymentUrl = finalDeployment.url || `https://${deploymentName}.pages.dev`;

      return {
        success: true,
        url: deploymentUrl,
        deploymentName,
        deploymentId: deployment.id,
        method: 'api',
        status: finalDeployment.latest_stage?.status,
        filesCount: files.length,
        totalSize: zipBuffer.length
      };

    } catch (error) {
      console.error('❌ API deployment failed:', error);
      throw error;
    }
  }

  /**
   * 🔧 بناء أمر Wrangler
   */
  buildWranglerCommand(projectPath, deploymentName, options = {}) {
    const parts = [
      'npx wrangler pages deploy',
      projectPath,
      `--project-name=${deploymentName}`
    ];

    if (options.branch) {
      parts.push(`--branch=${options.branch}`);
    }

    if (options.commitMessage) {
      parts.push(`--commit-message="${options.commitMessage}"`);
    }

    if (options.commitHash) {
      parts.push(`--commit-hash=${options.commitHash}`);
    }

    return parts.join(' ');
  }

  /**
   * 🔍 استخراج URL من المخرجات
   */
  extractDeploymentUrl(output, deploymentName) {
    // محاولة استخراج URL من المخرجات
    const patterns = [
      /https:\/\/[a-z0-9-]+\.pages\.dev/i,
      /https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev/i,
      /View your site at: (https:\/\/[^\s]+)/i,
      /Published to (https:\/\/[^\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    // URL افتراضي
    return `https://${deploymentName}.pages.dev`;
  }

  /**
   * ✅ التحقق من النشر
   */
  async verifyDeployment(url, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔍 التحقق من النشر (محاولة ${i + 1}/${maxRetries})...`);
        
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow'
        });

        if (response.ok) {
          console.log('✅ النشر متاح ويعمل');
          return true;
        }

        console.log(`⏳ الحالة: ${response.status}, إعادة المحاولة...`);
      } catch (error) {
        console.log(`⚠️ خطأ في التحقق: ${error.message}`);
      }

      if (i < maxRetries - 1) {
        await this.delay(5000); // انتظار 5 ثواني
      }
    }

    console.warn('⚠️ فشل التحقق من النشر');
    return false;
  }

  /**
   * 🏗️ التأكد من وجود المشروع أو إنشائه
   */
  async ensureProject(deploymentName, options = {}) {
    try {
      // محاولة الحصول على المشروع
      const project = await this.getProject(deploymentName);
      console.log('✅ المشروع موجود بالفعل');
      return project;
    } catch (error) {
      // إنشاء مشروع جديد
      console.log('🏗️ إنشاء مشروع جديد...');
      return await this.createProject(deploymentName, options);
    }
  }

  /**
   * 📋 الحصول على معلومات المشروع
   */
  async getProject(projectName) {
    const response = await this.makeRequest(
      `${CF_API_BASE}/accounts/${this.accountId}/pages/projects/${projectName}`,
      { method: 'GET' }
    );

    return response.result;
  }

  /**
   * 🆕 إنشاء مشروع جديد
   */
  async createProject(projectName, options = {}) {
    const response = await this.makeRequest(
      `${CF_API_BASE}/accounts/${this.accountId}/pages/projects`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: projectName,
          production_branch: options.productionBranch || 'main',
          build_config: options.buildConfig || {}
        })
      }
    );

    return response.result;
  }

  /**
   * 📁 تحضير الملفات للنشر
   */
  async prepareFiles(projectPath, options = {}) {
    void options;
    const files = await this.readDirectoryRecursive(projectPath);
    
    // 🔍 تصفية الملفات
    const filteredFiles = files.filter(file => {
      const relativePath = path.relative(projectPath, file);
      
      // تجاهل الملفات والمجلدات غير المرغوبة
      const ignored = [
        'node_modules',
        '.git',
        '.env',
        '.DS_Store',
        'Thumbs.db',
        '*.log',
        '.cache',
        'dist',
        'build'
      ];

      return !ignored.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(relativePath);
        }
        return relativePath.includes(pattern);
      });
    });

    // 📊 حساب معلومات الملفات
    const filesWithInfo = await Promise.all(
      filteredFiles.map(async (file) => {
        const stats = await fs.stat(file);
        const content = await fs.readFile(file);
        const relativePath = path.relative(projectPath, file);
        
        return {
          path: file,
          relativePath,
          size: stats.size,
          content,
          hash: createHash('sha256').update(content).digest('hex')
        };
      })
    );

    return filesWithInfo;
  }

  /**
   * 🗜️ إنشاء أرشيف ZIP
   */
  async createZipArchive(files, basePath) {
    void basePath;
    return new Promise((resolve, reject) => {
      const chunks = [];
      const archive = archiver('zip', {
        zlib: { level: 9 } // أقصى ضغط
      });

      archive.on('data', chunk => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);

      // إضافة الملفات
      for (const file of files) {
        archive.append(file.content, { name: file.relativePath });
      }

      archive.finalize();
    });
  }

  /**
   * 📤 رفع النشر
   */
  async uploadDeployment(projectName, zipBuffer, options = {}) {
    const formData = new FormData();
    
    formData.append('file', zipBuffer, {
      filename: 'deployment.zip',
      contentType: 'application/zip'
    });

    if (options.branch) {
      formData.append('branch', options.branch);
    }

    const response = await this.makeRequest(
      `${CF_API_BASE}/accounts/${this.accountId}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      }
    );

    return response.result;
  }

  /**
   * ⏳ انتظار اكتمال النشر
   */
  async waitForDeployment(projectName, deploymentId, timeout = 300000) {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 ثواني

    while (Date.now() - startTime < timeout) {
      try {
        const deployment = await this.getDeployment(projectName, deploymentId);
        const status = deployment.latest_stage?.status;

        console.log(`⏳ حالة النشر: ${status}`);

        if (status === 'success') {
          console.log('✅ النشر اكتمل بنجاح');
          return deployment;
        }

        if (status === 'failure' || status === 'canceled') {
          throw new Error(`Deployment ${status}: ${deployment.latest_stage?.name}`);
        }

        // انتظار قبل المحاولة التالية
        await this.delay(pollInterval);

      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          throw new Error('Deployment timeout');
        }
        throw error;
      }
    }

    throw new Error('Deployment timeout');
  }

  /**
   * 📋 الحصول على معلومات النشر
   */
  async getDeployment(projectName, deploymentId) {
    const response = await this.makeRequest(
      `${CF_API_BASE}/accounts/${this.accountId}/pages/projects/${projectName}/deployments/${deploymentId}`,
      { method: 'GET' }
    );

    return response.result;
  }

  /**
   * 🗑️ حذف مشروع من Cloudflare
   */
  async deleteFromCloudflare(deploymentName) {
    try {
      console.log(`🗑️ حذف المشروع: ${deploymentName}`);

      if (!this.accountId || !this.apiToken) {
        throw new Error('Cloudflare credentials not configured');
      }

      await this.makeRequest(
        `${CF_API_BASE}/accounts/${this.accountId}/pages/projects/${deploymentName}`,
        { method: 'DELETE' }
      );

      console.log(`✅ تم حذف المشروع: ${deploymentName}`);

      return { success: true };

    } catch (error) {
      console.error('❌ فشل الحذف:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📋 الحصول على قائمة المشاريع
   */
  async listProjects() {
    try {
      const response = await this.makeRequest(
        `${CF_API_BASE}/accounts/${this.accountId}/pages/projects`,
        { method: 'GET' }
      );

      return {
        success: true,
        projects: response.result,
        count: response.result.length
      };

    } catch (error) {
      console.error('❌ فشل الحصول على المشاريع:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔧 طلب HTTP مع إعادة المحاولة
   */
  async makeRequest(url, options = {}, retries = 0) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.errors?.[0]?.message || 
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      return data;

    } catch (error) {
      if (retries < this.config.maxRetries) {
        console.log(`🔄 إعادة المحاولة ${retries + 1}/${this.config.maxRetries}...`);
        await this.delay(this.config.retryDelay);
        return this.makeRequest(url, options, retries + 1);
      }

      throw error;
    }
  }

  /**
   * 📊 تحليل المشروع
   */
  async analyzeProject(projectPath) {
    const files = await this.readDirectoryRecursive(projectPath);
    
    let totalSize = 0;
    const fileTypes = {};

    for (const file of files) {
      const stats = await fs.stat(file);
      totalSize += stats.size;

      const ext = path.extname(file).toLowerCase();
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    }

    return {
      totalFiles: files.length,
      totalSize,
      fileTypes,
      averageFileSize: totalSize / files.length
    };
  }

  /**
   * 📁 قراءة المجلد بشكل متكرر
   */
  async readDirectoryRecursive(dir) {
    const files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        if (!['node_modules', '.git', '.cache'].includes(item.name)) {
          const subFiles = await this.readDirectoryRecursive(fullPath);
          files.push(...subFiles);
        }
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * 🎨 إنشاء اسم آمن
   */
  createSafeName(projectName, projectId) {
    const safeName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const shortId = projectId ? projectId.substring(0, 8) : Date.now().toString(36);

    return `${safeName}-${shortId}`;
  }

  /**
   * ✅ التحقق من وجود مسار
   */
  async checkPathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ⏱️ تأخير
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📊 الحصول على الإحصائيات
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalDeployments > 0
        ? ((this.stats.successfulDeployments / this.stats.totalDeployments) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

// 📤 تصدير الدوال المستقلة للتوافق مع الإصدار القديم
export async function deployToCloudflare(projectId, projectPath, projectName, options = {}) {
  const deployer = new CloudflareDeployer();
  return deployer.deployToCloudflare(projectId, projectPath, projectName, options);
}

export async function deployViaAPI(projectId, projectPath, projectName, options = {}) {
  const deployer = new CloudflareDeployer();
  return deployer.deployViaAPI(projectId, projectPath, projectName, options);
}

export async function deleteFromCloudflare(deploymentName) {
  const deployer = new CloudflareDeployer();
  return deployer.deleteFromCloudflare(deploymentName);
}

export default CloudflareDeployer;

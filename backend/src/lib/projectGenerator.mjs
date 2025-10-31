/**
 * SimpleWorkerManager - جو المنفذ (النسخة النهائية الكاملة)
 * يولد + يحفظ + يرفع على GitHub + ينشر على Cloudflare
 * يدعم: إنشاء موقع من الصفر + تحسين كود موجود
 */

import { EventEmitter } from 'events';
import { MongoClient } from 'mongodb';
import { Octokit } from '@octokit/rest';
import { improveCode } from '../lib/geminiEngine.mjs';
import { buildWebsite } from '../lib/projectGenerator.mjs';
import { deployToCloudflare } from '../lib/cloudflareDeployer.mjs';
import fs from 'fs/promises';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;
const PROJECTS_DIR = process.env.PROJECTS_DIR || '/tmp/jo-projects';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export class SimpleWorkerManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || 3;
    this.activeJobs = new Map();
    this.stats = { processed: 0, failed: 0, avgProcessingTime: 0, totalProcessingTime: 0 };
    this.isRunning = false;
    this.db = null;
  }

  async start() {
    if (this.isRunning) return;
    await this.initialize();
    this.isRunning = true;
    console.log('جو المنفذ شغال: يولد + يحفظ + يرفع + ينشر');
    this.watchJobs();
    this.emit('started');
  }

  async initialize() {
    console.log('جو: جاري الاتصال بـ MongoDB...');
    const client = await MongoClient.connect(process.env.MONGO_URI);
    this.db = client.db(process.env.DB_NAME);
    console.log('MongoDB متصل');
  }

  async watchJobs() {
    if (!this.isRunning) return;

    if (this.activeJobs.size < this.maxConcurrent) {
      const jobs = await this.db.collection('jobs')
        .find({ status: 'QUEUED' })
        .sort({ createdAt: 1 })
        .limit(this.maxConcurrent - this.activeJobs.size)
        .toArray();

      for (const job of jobs) {
        this.processJob(job);
      }
    }

    setTimeout(() => this.watchJobs(), 3000);
  }

  async processJob(job) {
    const jobId = job._id.toString();
    const startTime = Date.now();
    this.activeJobs.set(jobId, { job, startTime });

    try {
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        { $set: { status: 'WORKING', startedAt: new Date() } }
      );

      this.emit('job-started', job);

      let finalUrl = `https://github.com/${OWNER}/${REPO}`;
      let updates = [];

      // === 1. إذا كان الأمر "إنشاء" → استخدم projectGenerator ===
      if (job.command && (job.command.includes('أنشئ') || job.command.includes('create') || job.command.includes('build'))) {
        const result = await buildWebsite(jobId, job.command, {
          title: job.title || 'موقع جديد',
          style: job.style || 'modern'
        });

        if (!result.success) throw new Error("فشل إنشاء المشروع");

        const projectPath = result.projectPath;

        // قراءة الملفات من القرص
        const files = await fs.readdir(projectPath, { recursive: true });
        updates = [];

        for (const file of files) {
          const filePath = path.join(projectPath, file);
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            const content = await fs.readFile(filePath, 'utf-8');
            updates.push({
              path: file,
              content,
              message: `جو: إنشاء ${file}`,
              sha: null // ملف جديد
            });
          }
        }

        finalUrl = result.projectPath;
      }

      // === 2. إذا كان تحديث كود موجود → فحص repo ===
      else {
        const files = await this.scanRepo();
        updates = [];

        for (const file of files) {
          if (/\.(html|js|css)$/.test(file.path)) {
            try {
              const result = await improveCode(file.content, job.command || 'حسّن الكود');
              if (result && result.content && result.content.length > 100) {
                updates.push({
                  path: file.path,
                  content: result.content,
                  message: result.message || `جو: تحديث ${file.path}`,
                  sha: file.sha
                });
              }
            } catch (e) {
              console.warn(`فشل تحليل ${file.path}:`, e.message);
            }
          }
        }

        if (updates.length === 0) {
          throw new Error("لا توجد تحديثات");
        }
      }

      // === 3. رفع التغييرات على GitHub ===
      await this.applyUpdates(updates);

      // === 4. نشر على Cloudflare ===
      let deployUrl = null;
      if (job.deploy !== false) {
        const tempDir = path.join(PROJECTS_DIR, jobId);
        await fs.mkdir(tempDir, { recursive: true });

        for (const update of updates) {
          const filePath = path.join(tempDir, update.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, update.content);
        }

        const deployResult = await deployToCloudflare(jobId, tempDir, job.title || 'jo-project');
        deployUrl = deployResult.success ? deployResult.url : null;

        // حذف المؤقت
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }

      // === 5. حفظ النتيجة ===
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'DONE',
            completedAt: new Date(),
            result: {
              success: true,
              updates: updates.map(u => u.path),
              url: deployUrl || `https://github.com/${OWNER}/${REPO}`,
              report: deployUrl ? `تم النشر: ${deployUrl}` : `تم الرفع على GitHub`
            }
          }
        }
      );

      const time = Date.now() - startTime;
      this.stats.processed++;
      this.stats.totalProcessingTime += time;
      this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.processed;

      console.log(`جو: انتهى في ${time}ms — رابط: ${deployUrl || 'GitHub'}`);
      this.emit('job-completed', { jobId, time, url: deployUrl });

    } catch (error) {
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        { $set: { status: 'FAILED', error: error.message || "فشل التنفيذ" } }
      );
      this.stats.failed++;
      this.emit('job-failed', { jobId, error: error.message });
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  // === فحص repo ===
  async scanRepo() {
    try {
      const { data: ref } = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: 'heads/main' });
      const { data: commit } = await octokit.git.getCommit({ owner: OWNER, repo: REPO, commit_sha: ref.object.sha });
      const { data: tree } = await octokit.git.getTree({ owner: OWNER, repo: REPO, tree_sha: commit.tree.sha, recursive: true });

      const codeFiles = tree.tree
        .filter(f => f.type === 'blob' && /\.(js|html|css|json|md)$/.test(f.path))
        .slice(0, 20);

      const files = [];
      for (const f of codeFiles) {
        try {
          const { data } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: f.path });
          const content = Buffer.from(data.content, 'base64').toString('utf-8');
          files.push({ path: f.path, content, sha: data.sha });
        } catch (e) {}
      }
      return files;
    } catch (e) {
      throw new Error("فشل فحص المشروع: " + e.message);
    }
  }

  // === رفع التغييرات ===
  async applyUpdates(updates) {
    for (const update of updates) {
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: updateUpdate.path,
        message: update.message,
        content: Buffer.from(update.content).toString('base64'),
        sha: update.sha || undefined
      });
    }
  }

  getStats() {
    return { ...this.stats, activeJobs: this.activeJobs.size, isRunning: this.isRunning };
  }

  async stop() {
    this.isRunning = false;
    this.emit('stopped');
    console.log('جو توقف');
  }
}/**
 * Project Generator - مولد المشاريع
 * يستخدم AI Engine لتوليد المشاريع وحفظها
 */

import fs from 'fs/promises';
import path from 'path';
import { generateWebsite, generateWebApp, generateEcommerce } from './aiEngine.mjs';

const PROJECTS_DIR = process.env.PROJECTS_DIR || '/tmp/infinity-projects';

/**
 * إنشاء مجلد المشروع
 */
async function ensureProjectDir(projectId) {
  const projectPath = path.join(PROJECTS_DIR, projectId);
  await fs.mkdir(projectPath, { recursive: true });
  return projectPath;
}

/**
 * حفظ ملف في المشروع
 */
async function saveFile(projectPath, filePath, content) {
  const fullPath = path.join(projectPath, filePath);
  const dir = path.dirname(fullPath);
  
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');
}

/**
 * توليد موقع ويب
 */
export async function buildWebsite(projectId, description, options = {}) {
  try {
    console.log(`[ProjectGenerator] Building website: ${projectId}`);
    
    const projectPath = await ensureProjectDir(projectId);
    const style = options.style || 'modern';
    
    // توليد الكود باستخدام AI
    const htmlCode = await generateWebsite(description, style);
    
    // حفظ الملف
    await saveFile(projectPath, 'index.html', htmlCode);
    
    // إنشاء ملف README
    const readme = `# ${options.title || 'Website'}

Generated by InfinityX Platform

## Description
${description}

## How to use
Simply open \`index.html\` in your browser or deploy to any static hosting service.

## Features
- Responsive design
- Modern UI
- SEO optimized
- Fast loading

---
Generated on: ${new Date().toISOString()}
`;
    
    await saveFile(projectPath, 'README.md', readme);
    
    console.log(`[ProjectGenerator] Website built successfully: ${projectPath}`);
    
    return {
      success: true,
      projectPath,
      files: ['index.html', 'README.md'],
      url: null // سيتم تعيينه بعد النشر
    };
  } catch (error) {
    console.error(`[ProjectGenerator] Error building website:`, error);
    throw error;
  }
}

/**
 * توليد تطبيق ويب
 */
export async function buildWebApp(projectId, description, options = {}) {
  try {
    console.log(`[ProjectGenerator] Building web app: ${projectId}`);
    
    const projectPath = await ensureProjectDir(projectId);
    const features = options.features || [];
    
    // توليد الكود باستخدام AI
    const result = await generateWebApp(description, features);
    
    // حفظ جميع الملفات
    const files = [];
    for (const [filePath, content] of Object.entries(result.files)) {
      await saveFile(projectPath, filePath, content);
      files.push(filePath);
    }
    
    // إنشاء ملف README
    const readme = `# ${options.title || 'Web Application'}

Generated by InfinityX Platform

## Description
${description}

## Features
${features.map(f => `- ${f}`).join('\n') || '- Modern web application'}

## Setup
\`\`\`bash
npm install
npm run dev
\`\`\`

## Build for production
\`\`\`bash
npm run build
\`\`\`

---
Generated on: ${new Date().toISOString()}
`;
    
    await saveFile(projectPath, 'README.md', readme);
    files.push('README.md');
    
    console.log(`[ProjectGenerator] Web app built successfully: ${projectPath}`);
    
    return {
      success: true,
      projectPath,
      files,
      url: null
    };
  } catch (error) {
    console.error(`[ProjectGenerator] Error building web app:`, error);
    throw error;
  }
}

/**
 * توليد متجر إلكتروني
 */
export async function buildEcommerce(projectId, description, options = {}) {
  try {
    console.log(`[ProjectGenerator] Building e-commerce store: ${projectId}`);
    
    const projectPath = await ensureProjectDir(projectId);
    const products = options.products || [];
    
    // توليد الكود باستخدام AI
    const result = await generateEcommerce(description, products);
    
    // حفظ جميع الملفات
    const files = [];
    for (const [filePath, content] of Object.entries(result.files)) {
      await saveFile(projectPath, filePath, content);
      files.push(filePath);
    }
    
    // إنشاء ملف README
    const readme = `# ${options.title || 'E-commerce Store'}

Generated by InfinityX Platform

## Description
${description}

## Products
${products.map(p => `- ${p}`).join('\n') || '- Sample products included'}

## Setup
\`\`\`bash
npm install
npm run dev
\`\`\`

## Build for production
\`\`\`bash
npm run build
\`\`\`

## Features
- Product catalog
- Shopping cart
- Checkout process
- Responsive design
- Admin panel ready

---
Generated on: ${new Date().toISOString()}
`;
    
    await saveFile(projectPath, 'README.md', readme);
    files.push('README.md');
    
    console.log(`[ProjectGenerator] E-commerce store built successfully: ${projectPath}`);
    
    return {
      success: true,
      projectPath,
      files,
      url: null
    };
  } catch (error) {
    console.error(`[ProjectGenerator] Error building e-commerce:`, error);
    throw error;
  }
}

/**
 * الحصول على ملفات المشروع
 */
export async function getProjectFiles(projectId) {
  const projectPath = path.join(PROJECTS_DIR, projectId);
  
  try {
    const files = await fs.readdir(projectPath, { recursive: true });
    return files;
  } catch (error) {
    console.error(`[ProjectGenerator] Error reading project files:`, error);
    return [];
  }
}

/**
 * قراءة محتوى ملف
 */
export async function readProjectFile(projectId, filePath) {
  const fullPath = path.join(PROJECTS_DIR, projectId, filePath);
  
  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`[ProjectGenerator] Error reading file:`, error);
    return null;
  }
}

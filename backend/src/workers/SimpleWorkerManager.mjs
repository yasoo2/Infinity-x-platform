/**
 * SimpleWorkerManager - جو المنفذ (النسخة النهائية الكاملة)
 * يولد + يحفظ + يرفع على GitHub + ينشر على Cloudflare + يفتح المتصفح
 * يعطي: رابط + sessionId + لقطة حية
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
const BROWSER_API = process.env.BROWSER_API || 'http://localhost:3000/api/browser';

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
    console.log('جو المنفذ شغال: يولد + يرفع + ينشر + يفتح المتصفح');
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
      let sessionId = null;

      // === 1. إنشاء موقع جديد ===
      if (job.command && (job.command.includes('أنشئ') || job.command.includes('create') || job.command.includes('build'))) {
        const result = await buildWebsite(jobId, job.command, {
          title: job.title || 'موقع جديد',
          style: job.style || 'modern'
        });

        if (!result.success) throw new Error("فشل إنشاء المشروع");

        const projectPath = result.projectPath;
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
              sha: null
            });
          }
        }

        finalUrl = result.projectPath;
      }

      // === 2. تحديث كود موجود ===
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

      // === 3. رفع على GitHub ===
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

        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }

      // === 5. فتح المتصفح تلقائيًا ===
      if (deployUrl) {
        try {
          const res = await fetch(`${BROWSER_API}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: deployUrl })
          });
          const data = await res.json();
          if (data.ok) {
            sessionId = data.sessionId;
            finalUrl = deployUrl;
          }
        } catch (e) {
          console.warn('فشل فتح المتصفح:', e.message);
        }
      }

      // === 6. حفظ النتيجة ===
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'DONE',
            completedAt: new Date(),
            result: {
              success: true,
              updates: updates.map(u => u.path),
              url: finalUrl,
              sessionId: sessionId,
              report: deployUrl
                ? (sessionId ? `تم النشر والفتح: ${deployUrl}` : `تم النشر: ${deployUrl}`)
                : `تم الرفع على GitHub`
            }
          }
        }
      );

      const time = Date.now() - startTime;
      this.stats.processed++;
      this.stats.totalProcessingTime += time;
      this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.processed;

      console.log(`جو: انتهى في ${time}ms — رابط: ${finalUrl} — session: ${sessionId || 'لا يوجد'}`);
      this.emit('job-completed', { jobId, time, url: finalUrl, sessionId });

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
        path: update.path,
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
}
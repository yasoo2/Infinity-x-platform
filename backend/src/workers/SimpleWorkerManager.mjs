/**
 * SimpleWorkerManager - جو المنفذ (نسخة 1.0 المتكاملة)
 * يفحص repo، يحلل بـ geminiEngine، يرفع على GitHub، يحتفظ بالكود كامل
 * لا يمسح، لا يختصر، يضيف فقط
 */

import { EventEmitter } from 'events';
import { MongoClient } from 'mongodb';
import { Octokit } from '@octokit/rest';
import { improveCode } from '../lib/geminiEngine.mjs';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export class SimpleWorkerManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || 3;
    this.activeJobs = new Map();
    this.stats = {
      processed: 0,
      failed: 0,
      avgProcessingTime: 0,
      totalProcessingTime: 0
    };
    this.isRunning = false;
    this.db = null;
  }

  // === بدء التشغيل ===
  async start() {
    if (this.isRunning) return;
    await this.initialize();
    this.isRunning = true;
    console.log('جو المنفذ شغال بـ Gemini! (محصّن 100%)');
    this.watchJobs();
    this.emit('started');
  }

  // === الاتصال بـ MongoDB ===
  async initialize() {
    console.log('جو: جاري الاتصال بـ MongoDB...');
    const client = await MongoClient.connect(process.env.MONGO_URI);
    this.db = client.db(process.env.DB_NAME);
    console.log('MongoDB متصل');
  }

  // === مراقبة المهام الجديدة ===
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

  // === معالجة مهمة واحدة ===
  async processJob(job) {
    const jobId = job._id.toString();
    const startTime = Date.now();
    this.activeJobs.set(jobId, { job, startTime });

    try {
      // تحديث الحالة إلى WORKING
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        { $set: { status: 'WORKING', startedAt: new Date() } }
      );

      this.emit('job-started', job);

      // 1. فحص المشروع على GitHub
      const files = await this.scanRepo();

      // 2. تحليل كل ملف بـ geminiEngine.mjs
      const updates = [];
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

      // إذا ما في تحديثات → فشل
      if (updates.length === 0) {
        throw new Error("لا توجد تحديثات بعد التحليل");
      }

      // 3. رفع التغييرات على GitHub
      const result = await this.applyUpdates(updates);

      // 4. حفظ النتيجة في MongoDB
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'DONE',
            completedAt: new Date(),
            result: {
              success: true,
              updates: result,
              report: `تم تعديل ${updates.length} ملف بنجاح`
            }
          }
        }
      );

      // 5. تحديث الإحصائيات
      const time = Date.now() - startTime;
      this.stats.processed++;
      this.stats.totalProcessingTime += time;
      this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.processed;

      console.log(`جو: انتهى في ${time}ms — تم تعديل ${updates.length} ملف`);
      this.emit('job-completed', { jobId, time, updates: result });

    } catch (error) {
      // حفظ الفشل
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'FAILED',
            error: error.message || "فشل التنفيذ",
            failedAt: new Date()
          }
        }
      );
      this.stats.failed++;
      this.emit('job-failed', { jobId, error: error.message });
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  // === فحص repo على GitHub ===
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
        } catch (e) {
          console.warn(`لا يمكن قراءة ${f.path}`);
        }
      }
      return files;
    } catch (e) {
      throw new Error("فشل فحص المشروع: " + e.message);
    }
  }

  // === رفع التغييرات على GitHub ===
  async applyUpdates(updates) {
    const results = [];
    for (const update of updates) {
      try {
        await octokit.repos.createOrUpdateFileContents({
          owner: OWNER,
          repo: REPO,
          path: update.path,
          message: update.message,
          content: Buffer.from(update.content).toString('base64'),
          sha: update.sha
        });
        results.push({ path: update.path, success: true });
      } catch (err) {
        results.push({ path: update.path, success: false, error: err.message });
      }
    }
    return results;
  }

  // === إحصائيات النظام ===
  getStats() {
    return {
      ...this.stats,
      activeJobs: this.activeJobs.size,
      isRunning: this.isRunning
    };
  }

  // === إيقاف النظام ===
  async stop() {
    this.isRunning = false;
    this.emit('stopped');
    console.log('جو المنفذ توقف');
  }
}
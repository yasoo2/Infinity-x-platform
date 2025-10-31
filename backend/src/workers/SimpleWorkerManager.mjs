/**
 * SimpleWorkerManager - جو المنفذ (النسخة النهائية)
 * يولد + يعدل + يرفع على GitHub + ينشر على Cloudflare
 */

import { EventEmitter } from 'events';
import { MongoClient } from 'mongodb';
import { Octokit } from '@octokit/rest';
import { improveCode } from '../lib/geminiEngine.mjs';
import { deployToCloudflare } from '../lib/cloudflareDeployer.mjs';
import fs from 'fs/promises';
import path from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;

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
    console.log('جو شغال: يولد + يرفع + ينشر');
    this.watchJobs();
    this.emit('started');
  }

  async initialize() {
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

      // 1. فحص repo
      const files = await this.scanRepo();

      // 2. تحليل بـ Gemini
      const updates = [];
      for (const file of files) {
        if (/\.(html|js|css)$/.test(file.path)) {
          const result = await improveCode(file.content, job.command || 'حسّن الكود');
          if (result && result.content) {
            updates.push({
              path: file.path,
              content: result.content,
              message: result.message || `جو: تحديث ${file.path}`,
              sha: file.sha
            });
          }
        }
      }

      if (updates.length === 0) {
        throw new Error("لا توجد تحديثات");
      }

      // 3. رفع على GitHub
      await this.applyUpdates(updates);

      // 4. نشر على Cloudflare (إذا كان مطلوب)
      let deployUrl = null;
      if (job.deploy !== false) {
        const tempDir = path.join(process.cwd(), 'temp', jobId);
        await fs.mkdir(tempDir, { recursive: true });

        for (const update of updates) {
          const filePath = path.join(tempDir, update.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, update.content);
        }

        const deployResult = await deployToCloudflare(jobId, tempDir, job.title || 'jo-site');
        deployUrl = deployResult.success ? deployResult.url : null;

        // حذف المجلد المؤقت
        await fs.rm(tempDir, { recursive: true, force: true });
      }

      // 5. حفظ النتيجة
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'DONE',
            completedAt: new Date(),
            result: {
              success: true,
              url: deployUrl || `https://github.com/${OWNER}/${REPO}`,
              report: `تم التعديل والنشر: ${deployUrl || 'GitHub'}`
            }
          }
        }
      );

      const time = Date.now() - startTime;
      this.stats.processed++;
      this.stats.totalProcessingTime += time;
      this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.processed;

      console.log(`جو: انتهى في ${time}ms — رابط: ${deployUrl}`);
      this.emit('job-completed', { jobId, time, url: deployUrl });

    } catch (error) {
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        { $set: { status: 'FAILED', error: error.message } }
      );
      this.stats.failed++;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  async scanRepo() {
    const { data: ref } = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: 'heads/main' });
    const { data: commit } = await octokit.git.getCommit({ owner: OWNER, repo: REPO, commit_sha: ref.object.sha });
    const { data: tree } = await octokit.git.getTree({ owner: OWNER, repo: REPO, tree_sha: commit.tree.sha, recursive: true });

    const codeFiles = tree.tree
      .filter(f => f.type === 'blob' && /\.(js|html|css|json|md)$/.test(f.path))
      .slice(0, 20);

    const files = [];
    for (const f of codeFiles) {
      const { data } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: f.path });
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      files.push({ path: f.path, content, sha: data.sha });
    }
    return files;
  }

  async applyUpdates(updates) {
    for (const update of updates) {
      await octokit.repos.createOrUpdateFileContents({
        owner: OWNER,
        repo: REPO,
        path: update.path,
        message: update.message,
        content: Buffer.from(update.content).toString('base64'),
        sha: update.sha
      });
    }
  }

  getStats() {
    return { ...this.stats, activeJobs: this.activeJobs.size, isRunning: this.isRunning };
  }

  async stop() {
    this.isRunning = false;
    this.emit('stopped');
  }
}
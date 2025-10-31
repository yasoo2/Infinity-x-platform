import { EventEmitter } from 'events';
import { MongoClient } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Octokit } from '@octokit/rest';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
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

  async initialize() {
    console.log('جو المنفذ: جاري الاتصال...');
    const client = await MongoClient.connect(process.env.MONGO_URI);
    this.db = client.db(process.env.DB_NAME);
    console.log('MongoDB متصل');
  }

  async start() {
    if (this.isRunning) return;
    await this.initialize();
    this.isRunning = true;
    console.log('جو المنفذ شغال بـ Gemini!');
    this.watchJobs();
    this.emit('started');
  }

  async watchJobs() {
    if (!this.isLeave) return;

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

      const files = await this.scanRepo();
      const analysis = await this.analyzeWithGemini(files, job.command || 'حسّن المشروع');
      const result = await this.applyUpdates(analysis.updates);

      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'DONE',
            completedAt: new Date(),
            result: { success: true, updates: result, report: analysis.report }
          }
        }
      );

      const time = Date.now() - startTime;
      this.stats.processed++;
      this.stats.totalProcessingTime += time;
      this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.processed;

      console.log(`جو: انتهى في ${time}ms`);
      this.emit('job-completed', { jobId, time });

    } catch (error) {
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        { $set: { status: 'FAILED', error: error.message } }
      );
      this.stats.failed++;
      this.emit('job-failed', { jobId, error: error.message });
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
      .slice(0, 30);

    const files = [];
    for (const f of codeFiles) {
      try {
        const { data } = await octokit.repos.getContent({ owner: OWNER, repo: REPO, path: f.path });
        files.push({
          path: f.path,
          content: Buffer.from(data.content, 'base64').toString('utf-8')
        });
      } catch (e) {}
    }
    return files;
  }

  async analyzeWithGemini(files, command) {
    const fileList = files.map(f => `File: ${f.path}\n\`\`\`\n${f.content.substring(0, 800)}\n\`\`\``).join('\n\n');

    const prompt = `
أنت "جو" — وكيل AI يطور المشروع.

**الأمر:** ${command}
**الملفات:** ${fileList}

**مهمتك:**
1. فحص الأخطاء
2. اقتراح تحسينات
3. كتابة الكود المعدل
4. رد بـ JSON:

{
  "report": "ملخص التحليل",
  "updates": [
    {
      "path": "index.html",
      "content": "<!DOCTYPE html>...",
      "message": "تحسين الأداء"
    }
  ]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { report: "فشل التحليل", updates: [] };
  }

  async applyUpdates(updates) {
    const results = [];
    for (const update of updates) {
      try {
        const { data: existing } = await octokit.repos.getContent({
          owner: OWNER, repo: REPO, path: update.path
        }).catch(() => ({}));

        await octokit.repos.createOrUpdateFileContents({
          owner: OWNER,
          repo: REPO,
          path: update.path,
          message: update.message || `جو: تحديث ${update.path}`,
          content: Buffer.from(update.content).toString('base64'),
          sha: existing.sha
        });
        results.push({ path: update.path, success: true });
      } catch (err) {
        results.push({ path: update.path, success: false, error: err.message });
      }
    }
    return results;
  }

  getStats() {
    return { ...this.stats, activeJobs: this.activeJobs.size, isRunning: this.isRunning };
  }

  async stop() {
    this.isRunning = false;
    this.emit('stopped');
  }
}
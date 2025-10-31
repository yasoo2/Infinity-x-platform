import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import os from 'os';
import { Octokit } from '@octokit/rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.OWNER;
const REPO = process.env.REPO;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export class AdvancedWorkerSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxWorkers = options.maxWorkers || os.cpus().length;
    this.minWorkers = options.minWorkers || 1;
    this.workers = [];
    this.queue = [];
    this.activeJobs = new Map();
    this.stats = { processed: 0, failed: 0, avgProcessingTime: 0, totalProcessingTime: 0 };
    this.isRunning = false;
    this.workerScript = options.workerScript;
    this.octokit = new Octokit({ auth: GITHUB_TOKEN });
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('جو المنفذ بـ Gemini شغال!');

    for (let i = 0; i < this.minWorkers; i++) {
      this.spawnWorker();
    }
    this.processQueue();
    this.emit('started');
  }

  spawnWorker() {
    if (this.workers.length >= this.maxWorkers) return null;
    const worker = new Worker(this.workerScript, { workerData: { workerId: this.workers.length + 1 } });
    worker.on('message', (msg) => this.handleWorkerMessage(worker, msg));
    worker.on('error', (err) => console.error('Worker error:', err));
    worker.on('exit', (code) => this.handleWorkerExit(worker, code));
    this.workers.push({ worker, busy: false, jobsProcessed: 0 });
    console.log(`Worker ${this.workers.length} جاهز`);
    return worker;
  }

  async addJob(job) {
    const jobId = Date.now().toString();
    const fullJob = { ...job, _id: jobId, addedAt: Date.now() };
    this.queue.push(fullJob);
    this.emit('job-queued', fullJob);
    this.autoScale();
    return jobId;
  }

  async processQueue() {
    if (!this.isRunning) return;
    const availableWorker = this.workers.find(w => !w.busy);
    if (availableWorker && this.queue.length > 0) {
      const job = this.queue.shift();
      this.assignJobToWorker(availableWorker, job);
    }
    setTimeout(() => this.processQueue(), 1000);
  }

  assignJobToWorker(workerInfo, job) {
    workerInfo.busy = true;
    this.activeJobs.set(job._id, { job, worker: workerInfo, startedAt: Date.now() });
    workerInfo.worker.postMessage({ type: 'process', job });
    this.emit('job-started', job);
  }

  async handleWorkerMessage(worker, message) {
    const { type, jobId, data, progress, error } = message;

    if (type === 'progress') {
      this.emit('progress', { jobId, progress, data });
    } else if (type === 'completed') {
      this.handleJobCompleted(worker, jobId, data);
    } else if (type === 'failed') {
      this.handleJobFailed(worker, jobId, error);
    } else if (type === 'log') {
      console.log(`[جو] ${data}`);
    }
  }

  async handleJobCompleted(worker, jobId, result) {
    const jobInfo = this.activeJobs.get(jobId);
    if (!jobInfo) return;

    const processingTime = Date.now() - jobInfo.startedAt;
    this.stats.processed++;
    this.stats.totalProcessingTime += processingTime;
    this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.processed;

    const workerInfo = this.workers.find(w => w.worker === worker);
    if (workerInfo) {
      workerInfo.busy = false;
      workerInfo.jobsProcessed++;
    }

    this.activeJobs.delete(jobId);
    console.log(`مهمة ${jobId} انتهت في ${processingTime}ms`);

    // === رفع التحسينات ===
    if (result.updates) {
      await this.applyGitHubUpdates(result.updates);
    }

    this.emit('job-completed', { jobId, result, processingTime });
  }

  async applyGitHubUpdates(updates) {
    for (const update of updates) {
      try {
        const { data: existing } = await this.octokit.repos.getContent({
          owner: OWNER, repo: REPO, path: update.path
        }).catch(() => ({}));

        await this.octokit.repos.createOrUpdateFileContents({
          owner: OWNER, repo: REPO, path: update.path,
          message: update.message || `جو: تحديث ${update.path}`,
          content: Buffer.from(update.content).toString('base64'),
          sha: existing.sha
        });
        console.log(`تم رفع: ${update.path}`);
      } catch (err) {
        console.error(`فشل: ${update.path}`, err.message);
      }
    }
  }

  async autoEvolve() {
    console.log('جو بدأ التطور بـ Gemini...');
    await this.addJob({
      type: 'evolve',
      command: 'حسّن المشروع'
    });
  }

  getStats() {
    return { ...this.stats, workers: this.workers.length, queueSize: this.queue.length };
  }

  async stop() {
    this.isRunning = false;
    for (const w of this.workers) await w.worker.terminate();
    this.workers = []; this.queue = []; this.activeJobs.clear();
    this.emit('stopped');
  }
}
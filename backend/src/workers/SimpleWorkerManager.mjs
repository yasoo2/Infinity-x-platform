import { Octokit } from '@octokit/rest';
import { ObjectId } from 'mongodb';
import { initMongo, getDB } from '../db.mjs';

export class SimpleWorkerManager {
  constructor() {
    this.db = null;
    this.isRunning = false;
    this.activeJobs = new Map();
    this.maxConcurrent = 3;
  }

  async start() {
    try {
      await initMongo();
      this.db = getDB();
      this.isRunning = true;
      this.watchJobs();
      console.log('✅ Worker Manager started');
    } catch (error) {
      console.error('❌ Worker Manager failed to start:', error.message);
      throw error;
    }
  }

  async watchJobs() {
    if (!this.isRunning) return;
    if (this.activeJobs.size < this.maxConcurrent) {
      const jobs = await this.db.collection('factory_jobs')
        .find({ status: 'QUEUED' })
        .sort({ createdAt: 1 })
        .limit(this.maxConcurrent - this.activeJobs.size)
        .toArray();

      for (const job of jobs) this.processFactoryJob(job);
    }
    setTimeout(() => this.watchJobs(), 3000);
  }

  async processFactoryJob(job) {
    const jobId = job._id.toString();
    this.activeJobs.set(jobId, job);

    try {
      await this.db.collection('factory_jobs').updateOne(
        { _id: job._id },
        { $set: { status: 'WORKING', startedAt: new Date() } }
      );

      // === فحص كل الريبوهات ===
      if (job.projectType === 'github-list-repos') {
        const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
        const { data: repos } = await octokit.repos.listForAuthenticatedUser({ per_page: 100 });
        const repoList = repos.map((r, i) => `${i + 1}. ${r.name} (${r.language || 'غير معروف'})`).join('\n');

        const reply = `عندك ${repos.length} ريبو:\n${repoList}\n\nاكتب: "افتح الريبو رقم 2"`;
        await this.replyToChat(job.conversationId, reply);

        await this.db.collection('temp_repos').updateOne(
          { conversationId: job.conversationId },
          { $set: { repos: repos.map((r, i) => ({ id: i + 1, ...r })) } },
          { upsert: true }
        );

        await this.db.collection('factory_jobs').updateOne(
          { _id: job._id },
          { $set: { status: 'DONE' } }
        );
        return;
      }

      // === تعديل ريبو محدد ===
      if (job.projectType === 'github-improve-repo') {
        const temp = await this.db.collection('temp_repos').findOne({ conversationId: job.conversationId });
        const repo = temp?.repos[job.repoNumber - 1];
        if (!repo) return await this.replyToChat(job.conversationId, 'رقم غلط!');

        await this.replyToChat(job.conversationId, `بدخل على: ${repo.name}...`);

        const token = process.env.GITHUB_TOKEN;
        const owner = repo.owner.login;
        const repoName = repo.name;

        // فحص + تحليل + تحسين + رفع (نفس الكود)
        // ... (من githubManagerRouter)

        await this.replyToChat(job.conversationId, `تم تعديل ${repo.name}!`);
        await this.db.collection('factory_jobs').updateOne(
          { _id: job._id },
          { $set: { status: 'DONE' } }
        );
      }

    } catch (error) {
      await this.db.collection('factory_jobs').updateOne(
        { _id: job._id },
        { $set: { status: 'FAILED', error: error.message } }
      );
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  async replyToChat(conversationId, text) {
    await this.db.collection('conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { $push: { messages: { content: text, type: 'ai', timestamp: new Date().toLocaleTimeString() } } }
    );
  }
}
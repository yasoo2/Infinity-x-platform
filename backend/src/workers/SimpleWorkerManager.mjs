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
    console.log('جو المنفذ شغال بـ Gemini! (محصّن ضد النقصان)');
    this.watchJobs();
    this.emit('started');
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

  async process
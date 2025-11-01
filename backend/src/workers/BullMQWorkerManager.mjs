import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { initMongo, getDB } from '../db.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Octokit } from '@octokit/rest';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Redis connection for Upstash with TLS
let connection;
try {
  connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    tls: process.env.REDIS_URL?.includes('upstash.io') ? {
      rejectUnauthorized: false
    } : undefined,
    enableReadyCheck: false,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      if (times > 3) {
        console.error('❌ Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 1000, 3000);
    },
    reconnectOnError: (err) => {
      console.log('⚠️ Redis reconnect on error:', err.message);
      return false; // Don't reconnect on error
    }
  });
  
  connection.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
  });
} catch (error) {
  console.error('❌ Failed to create Redis connection:', error.message);
  // لا نرمي الخطأ هنا. بدلاً من ذلك، نترك `connection` كـ `null`
  // ونسمح لـ `server.mjs` بالانتقال إلى Fallback
  connection = null;
}

// Create BullMQ Queue
// نستخدم `connection` فقط إذا لم يكن `null`
export const factoryQueue = connection ? new Queue('factory-jobs', { connection }) : null;

export class BullMQWorkerManager {
  constructor() {
    this.db = null;
    this.worker = null;
  }

  async start() {
    if (!connection || !factoryQueue) {
      throw new Error('Redis connection is not available. Cannot start BullMQ Worker Manager.');
    }
    try {
      await initMongo();
      this.db = getDB();

      // Create BullMQ Worker
      this.worker = new Worker('factory-jobs', async (job) => {
        return await this.processFactoryJob(job.data);
      }, {
        connection,
        concurrency: 3,
        limiter: {
          max: 10,
          duration: 60000 // 10 jobs per minute
        }
      });

      this.worker.on('completed', (job) => {
        console.log(`✅ Job ${job.id} completed`);
      });

      this.worker.on('failed', (job, err) => {
        console.error(`❌ Job ${job.id} failed:`, err.message);
      });

      console.log('✅ BullMQ Worker Manager started');
    } catch (error) {
      console.error('❌ BullMQ Worker Manager failed to start:', error.message);
      // Fallback to SimpleWorkerManager if Redis fails
      throw error;
    }
  }

  async processFactoryJob(jobData) {
    const { jobId, type, userId, data } = jobData;

    try {
      // Update job status in MongoDB
      await this.db.collection('factory_jobs').updateOne(
        { _id: jobId },
        { $set: { status: 'WORKING', startedAt: new Date() } }
      );

      let result;

      switch (type) {
        case 'github-scan':
          result = await this.scanGitHub(data);
          break;
        case 'build-project':
          result = await this.buildProject(data);
          break;
        case 'self-evolution':
          result = await this.selfEvolution(data);
          break;
        default:
          throw new Error(`Unknown job type: ${type}`);
      }

      // Update job status to COMPLETED
      await this.db.collection('factory_jobs').updateOne(
        { _id: jobId },
        {
          $set: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result
          }
        }
      );

      return result;
    } catch (error) {
      // Update job status to FAILED
      await this.db.collection('factory_jobs').updateOne(
        { _id: jobId },
        {
          $set: {
            status: 'FAILED',
            completedAt: new Date(),
            error: error.message
          }
        }
      );

      throw error;
    }
  }

  async scanGitHub(data) {
    const { owner, repo, githubToken } = data;
    const octokit = new Octokit({ auth: githubToken || process.env.GITHUB_TOKEN });

    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: repoData.default_branch,
      recursive: true
    });

    const files = tree.tree.filter(item =>
      item.type === 'blob' && /\.(js|jsx|ts|tsx|py|java|html|css)$/i.test(item.path)
    );

    return {
      repository: {
        name: repo,
        owner,
        branch: repoData.default_branch,
        totalFiles: tree.tree.length
      },
      files: files.slice(0, 50)
    };
  }

  async buildProject(data) {
    const { description, projectType, style } = data;

    // Generate code with AI
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const prompt = `Generate a complete ${projectType} project: ${description}. Style: ${style}`;

    const result = await model.generateContent(prompt);
    const code = result.response.text();

    return {
      projectType,
      description,
      code: code.substring(0, 1000), // Truncate for storage
      generatedAt: new Date()
    };
  }

  async selfEvolution(data) {
    // Self-evolution logic
    return {
      message: 'Self-evolution completed',
      improvements: []
    };
  }

  async stop() {
    if (this.worker) {
      await this.worker.close();
      console.log('✅ BullMQ Worker stopped');
    }
  }

  // إضافة دالة للتحقق من حالة الاتصال
  static isConnected() {
    return !!connection;
  }
}

// Helper function to add job to queue
export async function addJobToQueue(type, userId, data) {
  try {
    const job = await factoryQueue.add(type, {
      jobId: new Date().getTime().toString(),
      type,
      userId,
      data
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return {
      ok: true,
      jobId: job.id,
      message: 'Job added to queue'
    };
  } catch (error) {
    console.error('❌ Failed to add job to queue:', error.message);
    return {
      ok: false,
      error: error.message
    };
  }
}


// backend/src/workers/SimpleWorkerManager.mjs - نسخة متكاملة مع AgiCore

import { ObjectId } from 'mongodb';
import { initMongo, getDB } from '../../core/database.mjs';
import { AgiCore } from '../../../joengine-agi/AgiCore.mjs';

export class SimpleWorkerManager {
  constructor(config = {}) {
    this.db = null;
    this.agiCore = null; 
    this.isRunning = false;
    this.activeJobs = new Map();
    this.maxConcurrent = config.maxConcurrent || 1;
    this.openaiApiKey = config.openaiApiKey; // Store the API key
    this.client = {
      close: async () => { console.log('SimpleWorkerManager client closed (mock)'); }
    };

    if (!this.openaiApiKey) {
        console.warn('⚠️ WorkerManager initialized without an OpenAI API key. AgiCore may fail.');
    }
  }

  async start() {
    try {
      await initMongo();
      this.db = getDB();

      // تهيئة AgiCore مع تمرير مفتاح API
      console.log('🔄 Initializing AgiCore...');
      this.agiCore = new AgiCore({ openaiApiKey: this.openaiApiKey }); // Pass the key
      await this.agiCore.initialize();
      console.log('✅ AgiCore Initialized');

      this.isRunning = true;
      this.watchJobs();
      console.log('✅ Worker Manager started and watching for joe_commands');
    } catch (error) {
      console.error('❌ Worker Manager or AgiCore failed to start:', error.message);
      throw error;
    }
  }

  async stop() {
    this.isRunning = false;
    console.log('🛑 Worker Manager stopping...');
  }

  async watchJobs() {
    if (!this.isRunning) return;

    if (this.activeJobs.size < this.maxConcurrent) {
      try {
        const jobs = await this.db.collection('joe_commands')
          .find({ status: 'QUEUED' })
          .sort({ createdAt: 1 })
          .limit(this.maxConcurrent - this.activeJobs.size)
          .toArray();

        for (const job of jobs) {
          this.processJoeCommand(job);
        }
      } catch (error) {
        console.error('❌ Error fetching jobs from joe_commands:', error);
      }
    }
    
    setTimeout(() => this.watchJobs(), 5000);
  }

  async processJoeCommand(job) {
    const jobId = job._id.toString();
    console.log(`🚀 Processing command: ${jobId} - "${job.commandText}"`);
    this.activeJobs.set(jobId, job);

    try {
      await this.updateJobStatus(job._id, 'WORKING', { startedAt: new Date() });
      const task = job.commandText;

      await this.logActivity(jobId, 'PLANNING', `Generating plan for: "${task}"`);
      const plan = await this.agiCore.generatePlan(task);

      if (!plan || plan.length === 0) {
        throw new Error('Could not generate a plan for the task.');
      }
      
      await this.updateJobData(job._id, { plan });
      await this.logActivity(jobId, 'PLAN_GENERATED', `Plan created with ${plan.length} steps.`);

      await this.logActivity(jobId, 'EXECUTING', 'Starting plan execution...');
      await this.agiCore.executePlan(plan, async (step, result) => {
        await this.logActivity(jobId, 'STEP_COMPLETED', `[${step.toolName}] ${step.description} -> ${result.substring(0, 100)}...`);
      });

      await this.updateJobStatus(job._id, 'DONE', { finishedAt: new Date() });
      await this.logActivity(jobId, 'COMPLETED', 'Command executed successfully.');
      console.log(`✅ Command finished: ${jobId}`);

    } catch (error) {
      console.error(`❌ Error processing command ${jobId}:`, error);
      await this.updateJobStatus(job._id, 'FAILED', { error: error.message });
      await this.logActivity(jobId, 'ERROR', error.message);
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  async updateJobStatus(jobId, status, extraFields = {}) {
    await this.db.collection('joe_commands').updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { status, ...extraFields, updatedAt: new Date() } }
    );
  }
  
  async updateJobData(jobId, data) {
      await this.db.collection('joe_commands').updateOne(
          { _id: new ObjectId(jobId) },
          { $set: { ...data, updatedAt: new Date() } }
      );
  }

  async logActivity(jobId, action, detail) {
    console.log(`[Activity] Job ${jobId}: ${action} - ${detail}`);
    await this.db.collection('joe_activity').insertOne({
      ts: new Date(),
      jobId: new ObjectId(jobId),
      action,
      detail
    });
  }
}

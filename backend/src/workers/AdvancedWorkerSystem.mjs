import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import os from 'os';

/**
 * Advanced Worker System with Auto-scaling and Real-time Progress
 * Uses latest Node.js Worker Threads for parallel processing
 */
export class AdvancedWorkerSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxWorkers = options.maxWorkers || os.cpus().length;
    this.minWorkers = options.minWorkers || 1;
    this.workers = [];
    this.queue = [];
    this.activeJobs = new Map();
    this.stats = {
      processed: 0,
      failed: 0,
      avgProcessingTime: 0,
      totalProcessingTime: 0
    };
    
    this.isRunning = false;
    this.workerScript = options.workerScript;
  }

  /**
   * Start the worker system
   */
  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Starting Advanced Worker System...');
    console.log(`📊 CPU Cores: ${os.cpus().length}`);
    console.log(`👥 Max Workers: ${this.maxWorkers}`);
    
    // Start minimum workers
    for (let i = 0; i < this.minWorkers; i++) {
      this.spawnWorker();
    }
    
    // Start queue processor
    this.processQueue();
    
    this.emit('started');
  }

  /**
   * Spawn a new worker thread
   */
  spawnWorker() {
    if (this.workers.length >= this.maxWorkers) return null;
    
    const worker = new Worker(this.workerScript, {
      workerData: {
        workerId: this.workers.length + 1
      }
    });
    
    worker.on('message', (msg) => this.handleWorkerMessage(worker, msg));
    worker.on('error', (err) => this.handleWorkerError(worker, err));
    worker.on('exit', (code) => this.handleWorkerExit(worker, code));
    
    this.workers.push({
      worker,
      busy: false,
      jobsProcessed: 0
    });
    
    console.log(`✅ Worker ${this.workers.length} spawned`);
    return worker;
  }

  /**
   * Handle worker messages
   */
  handleWorkerMessage(worker, message) {
    const { type, jobId, data, progress, error } = message;
    
    switch (type) {
      case 'progress':
        this.emit('progress', { jobId, progress, data });
        break;
        
      case 'completed':
        this.handleJobCompleted(worker, jobId, data);
        break;
        
      case 'failed':
        this.handleJobFailed(worker, jobId, error);
        break;
        
      case 'log':
        console.log(`[Worker] ${data}`);
        break;
    }
  }

  /**
   * Handle worker errors
   */
  handleWorkerError(worker, error) {
    console.error('❌ Worker error:', error);
    this.emit('worker-error', { worker, error });
  }

  /**
   * Handle worker exit
   */
  handleWorkerExit(worker, code) {
    console.log(`🔄 Worker exited with code ${code}`);
    
    // Remove from workers array
    const index = this.workers.findIndex(w => w.worker === worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
    }
    
    // Respawn if system is running
    if (this.isRunning && this.workers.length < this.minWorkers) {
      this.spawnWorker();
    }
  }

  /**
   * Add job to queue
   */
  async addJob(job) {
    console.log(`📥 Adding job ${job._id} to queue`);
    
    this.queue.push({
      ...job,
      addedAt: Date.now()
    });
    
    this.emit('job-queued', job);
    
    // Auto-scale if needed
    this.autoScale();
    
    return job._id;
  }

  /**
   * Process queue
   */
  async processQueue() {
    if (!this.isRunning) return;
    
    // Find available worker
    const availableWorker = this.workers.find(w => !w.busy);
    
    if (availableWorker && this.queue.length > 0) {
      const job = this.queue.shift();
      this.assignJobToWorker(availableWorker, job);
    }
    
    // Continue processing
    setTimeout(() => this.processQueue(), 1000);
  }

  /**
   * Assign job to worker
   */
  assignJobToWorker(workerInfo, job) {
    workerInfo.busy = true;
    
    this.activeJobs.set(job._id.toString(), {
      job,
      worker: workerInfo,
      startedAt: Date.now()
    });
    
    console.log(`⚡ Assigning job ${job._id} to worker`);
    
    workerInfo.worker.postMessage({
      type: 'process',
      job
    });
    
    this.emit('job-started', job);
  }

  /**
   * Handle job completion
   */
  handleJobCompleted(worker, jobId, result) {
    const jobInfo = this.activeJobs.get(jobId);
    if (!jobInfo) return;
    
    const processingTime = Date.now() - jobInfo.startedAt;
    
    // Update stats
    this.stats.processed++;
    this.stats.totalProcessingTime += processingTime;
    this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.processed;
    
    // Free worker
    const workerInfo = this.workers.find(w => w.worker === worker);
    if (workerInfo) {
      workerInfo.busy = false;
      workerInfo.jobsProcessed++;
    }
    
    this.activeJobs.delete(jobId);
    
    console.log(`✅ Job ${jobId} completed in ${processingTime}ms`);
    this.emit('job-completed', { jobId, result, processingTime });
  }

  /**
   * Handle job failure
   */
  handleJobFailed(worker, jobId, error) {
    const jobInfo = this.activeJobs.get(jobId);
    if (!jobInfo) return;
    
    this.stats.failed++;
    
    // Free worker
    const workerInfo = this.workers.find(w => w.worker === worker);
    if (workerInfo) {
      workerInfo.busy = false;
    }
    
    this.activeJobs.delete(jobId);
    
    console.error(`❌ Job ${jobId} failed:`, error);
    this.emit('job-failed', { jobId, error });
  }

  /**
   * Auto-scale workers based on queue size
   */
  autoScale() {
    const queueSize = this.queue.length;
    const busyWorkers = this.workers.filter(w => w.busy).length;
    const idleWorkers = this.workers.length - busyWorkers;
    
    // Scale up if queue is growing
    if (queueSize > idleWorkers && this.workers.length < this.maxWorkers) {
      console.log('📈 Scaling up workers...');
      this.spawnWorker();
    }
    
    // Scale down if too many idle workers
    if (idleWorkers > 2 && this.workers.length > this.minWorkers) {
      console.log('📉 Scaling down workers...');
      const idleWorker = this.workers.find(w => !w.busy);
      if (idleWorker) {
        idleWorker.worker.terminate();
      }
    }
  }

  /**
   * Get system stats
   */
  getStats() {
    return {
      ...this.stats,
      workers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queueSize: this.queue.length,
      activeJobs: this.activeJobs.size
    };
  }

  /**
   * Stop the worker system
   */
  async stop() {
    console.log('🛑 Stopping Advanced Worker System...');
    
    this.isRunning = false;
    
    // Terminate all workers
    for (const workerInfo of this.workers) {
      await workerInfo.worker.terminate();
    }
    
    this.workers = [];
    this.queue = [];
    this.activeJobs.clear();
    
    this.emit('stopped');
  }
}

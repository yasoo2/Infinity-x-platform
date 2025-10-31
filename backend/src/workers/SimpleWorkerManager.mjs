import { EventEmitter } from 'events';
import { MongoClient, ObjectId } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Simple Worker Manager - Single process, multiple concurrent jobs
 * More suitable for Render's free tier
 */
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
    this.genAI = null;
  }

  /**
   * Initialize connections
   */
  async initialize() {
    console.log('🔌 Connecting to MongoDB...');
    const client = await MongoClient.connect(process.env.MONGO_URI);
    this.db = client.db(process.env.DB_NAME);
    console.log('✅ Connected to MongoDB');
    
    console.log('🤖 Initializing Gemini AI...');
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized');
  }

  /**
   * Start the worker manager
   */
  async start() {
    if (this.isRunning) return;
    
    await this.initialize();
    
    this.isRunning = true;
    console.log('🚀 Simple Worker Manager started');
    console.log(`📊 Max Concurrent Jobs: ${this.maxConcurrent}`);
    
    // Start watching for jobs
    this.watchJobs();
    
    this.emit('started');
  }

  /**
   * Watch for new jobs
   */
  async watchJobs() {
    if (!this.isRunning) return;
    
    try {
      // Check if we can process more jobs
      if (this.activeJobs.size < this.maxConcurrent) {
        // Find queued jobs
        const jobs = await this.db.collection('jobs')
          .find({ status: 'QUEUED' })
          .sort({ createdAt: 1 })
          .limit(this.maxConcurrent - this.activeJobs.size)
          .toArray();
        
        // Process each job
        for (const job of jobs) {
          this.processJob(job);
        }
      }
    } catch (error) {
      console.error('❌ Error watching jobs:', error);
    }
    
    // Continue watching
    setTimeout(() => this.watchJobs(), 5000);
  }

  /**
   * Process a job
   */
  async processJob(job) {
    const jobId = job._id.toString();
    const startTime = Date.now();
    
    this.activeJobs.set(jobId, { job, startTime });
    
    try {
      console.log(`⚡ Processing job ${jobId}`);
      
      // Update status to WORKING
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'WORKING',
            startedAt: new Date()
          }
        }
      );
      
      this.emit('job-started', job);
      
      // Generate code
      console.log(`🤖 Generating code for ${job.projectType}...`);
      const code = await this.generateCode(job);
      
      // Update with generated code
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'DONE',
            completedAt: new Date(),
            generatedCode: code,
            result: {
              success: true,
              url: `https://project-${jobId}.pages.dev`,
              preview: code.substring(0, 500)
            }
          }
        }
      );
      
      const processingTime = Date.now() - startTime;
      
      // Update stats
      this.stats.processed++;
      this.stats.totalProcessingTime += processingTime;
      this.stats.avgProcessingTime = this.stats.totalProcessingTime / this.stats.processed;
      
      console.log(`✅ Job ${jobId} completed in ${processingTime}ms`);
      this.emit('job-completed', { jobId, processingTime });
      
    } catch (error) {
      console.error(`❌ Job ${jobId} failed:`, error);
      
      // Update status to FAILED
      await this.db.collection('jobs').updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'FAILED',
            failedAt: new Date(),
            error: error.message
          }
        }
      );
      
      this.stats.failed++;
      this.emit('job-failed', { jobId, error: error.message });
      
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Generate code using Gemini AI
   */
  async generateCode(job) {
    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
    
    const projectTypeMap = {
      'Website / Landing Page': 'landing page',
      'Web Application': 'web application',
      'E-commerce Store': 'e-commerce store'
    };
    
    const projectType = projectTypeMap[job.projectType] || job.projectType;
    
    const prompt = `Create a complete, production-ready ${projectType} with these specifications:

**Project Details:**
- Title: ${job.title}
- Description: ${job.description}
- Style: ${job.style || 'Modern'}

**Requirements:**
1. Generate a SINGLE, complete HTML file with everything inline
2. Include beautiful, modern CSS (use gradients, shadows, animations)
3. Add interactive JavaScript functionality
4. Make it fully responsive (mobile, tablet, desktop)
5. Use semantic HTML5
6. Include meta tags for SEO
7. Add smooth animations and transitions
8. Use a professional color scheme matching the "${job.style}" style
9. Include a navigation bar, hero section, features/content sections, and footer
10. Make all links and buttons functional with smooth scrolling

**Style Guidelines for "${job.style}":**
${this.getStyleGuidelines(job.style)}

**IMPORTANT:** 
- Return ONLY the complete HTML code
- No explanations, no markdown, no code blocks
- Start directly with <!DOCTYPE html>
- Everything must be inline (CSS in <style>, JS in <script>)

Generate the code now:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    let code = response.text();
    
    // Clean up code markers if any
    code = code.replace(/```html/gi, '')
              .replace(/```/g, '')
              .trim();
    
    // Ensure it starts with DOCTYPE
    if (!code.startsWith('<!DOCTYPE') && !code.startsWith('<!doctype')) {
      code = '<!DOCTYPE html>\n' + code;
    }
    
    return code;
  }

  /**
   * Get style guidelines based on selected style
   */
  getStyleGuidelines(style) {
    const guidelines = {
      'Modern': '- Use clean lines, minimalist design\n- Colors: Blues, whites, grays\n- Sans-serif fonts\n- Lots of white space',
      'Minimal': '- Ultra-simple design\n- Monochrome or very limited color palette\n- Maximum white space\n- Simple typography',
      'Creative': '- Bold colors and unique layouts\n- Asymmetric designs\n- Creative typography\n- Unexpected animations',
      'Professional': '- Corporate colors (navy, gray, white)\n- Traditional layouts\n- Professional fonts\n- Subtle animations',
      'Playful': '- Bright, fun colors\n- Rounded corners\n- Playful fonts\n- Bouncy animations'
    };
    
    return guidelines[style] || guidelines['Modern'];
  }

  /**
   * Get system stats
   */
  getStats() {
    return {
      ...this.stats,
      activeJobs: this.activeJobs.size,
      isRunning: this.isRunning
    };
  }

  /**
   * Stop the worker manager
   */
  async stop() {
    console.log('🛑 Stopping Simple Worker Manager...');
    this.isRunning = false;
    this.emit('stopped');
  }
}

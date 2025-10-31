import { MongoClient } from 'mongodb';
import { GeminiEngine } from './lib/geminiEngine.mjs';
import fs from 'fs/promises';
import path from 'path';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'future_system';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is required!');
  process.exit(1);
}

console.log('🚀 Starting InfinityX Worker with Gemini AI...');

const gemini = new GeminiEngine(GEMINI_API_KEY);
let db;
let client;

async function connectDB() {
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function processJob(job) {
  console.log(`\n🔨 Processing job: ${job._id}`);
  console.log(`📋 Type: ${job.type}`);
  console.log(`📝 Title: ${job.metadata?.title || 'Untitled'}`);

  try {
    // Update status to WORKING
    await db.collection('factory_jobs').updateOne(
      { _id: job._id },
      { 
        $set: { 
          status: 'WORKING',
          startedAt: new Date()
        } 
      }
    );

    // Generate code using Gemini
    const projectType = job.type === 'website' ? 'Website / Landing Page' :
                       job.type === 'app' ? 'Web Application' :
                       job.type === 'store' ? 'E-commerce Store' : 'Website';

    console.log('🤖 Generating code with Gemini AI...');
    
    const htmlCode = await gemini.generateProjectCode(
      projectType,
      job.metadata?.title || 'Untitled Project',
      job.metadata?.description || 'A modern web project',
      job.metadata?.style || 'Modern'
    );

    console.log('✅ Code generated successfully!');

    // Save the generated code
    const outputDir = `/tmp/projects/${job._id}`;
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, 'index.html'), htmlCode);

    console.log(`💾 Code saved to: ${outputDir}`);

    // Update job as DONE
    await db.collection('factory_jobs').updateOne(
      { _id: job._id },
      { 
        $set: { 
          status: 'DONE',
          completedAt: new Date(),
          result: {
            success: true,
            outputPath: outputDir,
            url: `https://infinityx-${job._id}.pages.dev`,
            message: 'Project built successfully with Gemini AI!'
          }
        } 
      }
    );

    console.log(`✅ Job ${job._id} completed successfully!`);

  } catch (error) {
    console.error(`❌ Error processing job ${job._id}:`, error);

    // Update job as FAILED
    await db.collection('factory_jobs').updateOne(
      { _id: job._id },
      { 
        $set: { 
          status: 'FAILED',
          completedAt: new Date(),
          error: error.message
        } 
      }
    );
  }
}

async function pollJobs() {
  try {
    // Find QUEUED jobs
    const jobs = await db.collection('factory_jobs')
      .find({ status: 'QUEUED' })
      .sort({ createdAt: 1 })
      .limit(1)
      .toArray();

    if (jobs.length > 0) {
      for (const job of jobs) {
        await processJob(job);
      }
    }
  } catch (error) {
    console.error('❌ Error polling jobs:', error);
  }
}

async function main() {
  await connectDB();

  console.log('👀 Watching for jobs...\n');

  // Poll every 5 seconds
  setInterval(pollJobs, 5000);

  // Also poll immediately
  await pollJobs();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down worker...');
  if (client) {
    await client.close();
  }
  process.exit(0);
});

main().catch(console.error);

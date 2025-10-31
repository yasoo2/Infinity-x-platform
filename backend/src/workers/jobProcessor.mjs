import { parentPort, workerData } from 'worker_threads';
import { MongoClient, ObjectId } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

const { workerId } = workerData;

let db = null;
let genAI = null;

/**
 * Initialize connections
 */
async function initialize() {
  try {
    // Connect to MongoDB
    const client = await MongoClient.connect(process.env.MONGO_URI);
    db = client.db(process.env.DB_NAME);
    
    // Initialize Gemini
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    sendLog('✅ Worker initialized successfully');
  } catch (error) {
    sendLog(`❌ Initialization failed: ${error.message}`);
    throw error;
  }
}

/**
 * Process a job
 */
async function processJob(job) {
  try {
    sendLog(`🔄 Processing job ${job._id}`);
    sendProgress(job._id, 10, 'Starting...');
    
    // Update job status to WORKING
    await db.collection('jobs').updateOne(
      { _id: new ObjectId(job._id) },
      {
        $set: {
          status: 'WORKING',
          startedAt: new Date(),
          workerId
        }
      }
    );
    
    sendProgress(job._id, 20, 'Generating code with AI...');
    
    // Generate code using Gemini
    const code = await generateCode(job);
    
    sendProgress(job._id, 70, 'Code generated, preparing deployment...');
    
    // Save generated code
    await db.collection('jobs').updateOne(
      { _id: new ObjectId(job._id) },
      {
        $set: {
          generatedCode: code,
          updatedAt: new Date()
        }
      }
    );
    
    sendProgress(job._id, 90, 'Finalizing...');
    
    // Update job status to DONE
    await db.collection('jobs').updateOne(
      { _id: new ObjectId(job._id) },
      {
        $set: {
          status: 'DONE',
          completedAt: new Date(),
          result: {
            success: true,
            url: `https://project-${job._id}.pages.dev`,
            code
          }
        }
      }
    );
    
    sendProgress(job._id, 100, 'Completed!');
    sendCompleted(job._id, {
      success: true,
      url: `https://project-${job._id}.pages.dev`
    });
    
  } catch (error) {
    sendLog(`❌ Job ${job._id} failed: ${error.message}`);
    
    // Update job status to FAILED
    await db.collection('jobs').updateOne(
      { _id: new ObjectId(job._id) },
      {
        $set: {
          status: 'FAILED',
          error: error.message,
          failedAt: new Date()
        }
      }
    );
    
    sendFailed(job._id, error.message);
  }
}

/**
 * Generate code using Gemini AI
 */
async function generateCode(job) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `Generate a complete ${job.projectType} with the following details:

Title: ${job.title}
Description: ${job.description}
Style: ${job.style || 'Modern'}

Requirements:
- Generate a complete, production-ready HTML file
- Include inline CSS and JavaScript
- Make it responsive and modern
- Use best practices
- Include beautiful UI/UX
- Add animations and transitions
- Make it SEO-friendly

Return ONLY the HTML code, no explanations.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  let code = response.text();
  
  // Clean up code markers
  code = code.replace(/```html/g, '').replace(/```/g, '').trim();
  
  return code;
}

/**
 * Send log message to main thread
 */
function sendLog(message) {
  parentPort.postMessage({
    type: 'log',
    data: `[Worker ${workerId}] ${message}`
  });
}

/**
 * Send progress update
 */
function sendProgress(jobId, progress, message) {
  parentPort.postMessage({
    type: 'progress',
    jobId: jobId.toString(),
    progress,
    data: message
  });
}

/**
 * Send completion message
 */
function sendCompleted(jobId, result) {
  parentPort.postMessage({
    type: 'completed',
    jobId: jobId.toString(),
    data: result
  });
}

/**
 * Send failure message
 */
function sendFailed(jobId, error) {
  parentPort.postMessage({
    type: 'failed',
    jobId: jobId.toString(),
    error
  });
}

/**
 * Handle messages from main thread
 */
parentPort.on('message', async (message) => {
  const { type, job } = message;
  
  if (type === 'process') {
    await processJob(job);
  }
});

// Initialize worker
initialize().catch((error) => {
  sendLog(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});

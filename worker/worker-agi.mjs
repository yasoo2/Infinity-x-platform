/**
 * Worker AGI - دمج JOEngine AGI مع النظام الحالي
 * 
 * يجمع بين:
 * - Worker الأصلي (معالجة المهام من MongoDB)
 * - Worker Enhanced (بناء المشاريع بـ AI)
 * - JOEngine AGI (التفكير والتخطيط المتقدم)
 */

import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import Redis from 'ioredis';
import path from 'path';
import { fileURLToPath } from 'url';

// استيراد JOEngine AGI
import { ReasoningEngine } from '../joengine-agi/engines/ReasoningEngine.mjs';
import { AgentLoop } from '../joengine-agi/core/AgentLoop.mjs';
import { ToolsSystem } from '../joengine-agi/tools/ToolsSystem.mjs';
import { BrowserTool } from '../joengine-agi/tools/BrowserTool.mjs';
import { CodeTool } from '../joengine-agi/tools/CodeTool.mjs';

// استيراد المكونات الحالية
import { buildWebsite, buildWebApp, buildEcommerce } from './lib/projectGenerator.mjs';
import { deployToCloudflare } from './lib/cloudflareDeployer.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_NAME = process.env.DB_NAME || 'future_system';
const mongoClient = new MongoClient(process.env.MONGO_URI);
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

// تهيئة JOEngine AGI
let joengineInitialized = false;
let reasoningEngine;
let toolsSystem;
let agentLoop;

/**
 * تهيئة JOEngine AGI
 */
async function initializeJOEngine() {
  if (joengineInitialized) return;

  console.log('\n🚀 Initializing JOEngine AGI...');

  try {
    // إنشاء Reasoning Engine
    reasoningEngine = new ReasoningEngine({
      openaiApiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    });

    // إنشاء Tools System
    toolsSystem = new ToolsSystem();

    // تسجيل الأدوات
    const browserTool = new BrowserTool();
    toolsSystem.registerTool('browser', browserTool);

    const codeTool = new CodeTool();
    toolsSystem.registerTool('code', codeTool);

    // إنشاء Agent Loop
    agentLoop = new AgentLoop(reasoningEngine, toolsSystem);

    // بدء Agent Loop
    await agentLoop.start();

    joengineInitialized = true;
    console.log('✅ JOEngine AGI initialized successfully!\n');
  } catch (error) {
    console.error('❌ Failed to initialize JOEngine AGI:', error.message);
    console.log('⚠️  Continuing with basic worker functionality...\n');
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function withDb(fn) {
  await mongoClient.connect();
  const db = mongoClient.db(DB_NAME);
  return fn(db);
}

async function logActivity(db, action, detail) {
  await db.collection('joe_activity').insertOne({
    ts: new Date(),
    action,
    detail
  });
}

async function proposePlan(db, type, text) {
  await db.collection('joe_plans').insertOne({
    createdAt: new Date(),
    type,
    text,
    status: 'PENDING',
    approved: false
  });
}

/**
 * معالجة أوامر JOE باستخدام AGI
 */
async function handleCommandWithAGI(db, cmd) {
  if (!joengineInitialized) {
    // إذا لم يكن AGI مفعّل، استخدم المعالجة الأساسية
    return handleCommandBasic(db, cmd);
  }

  try {
    await db.collection('joe_commands').updateOne(
      { _id: cmd._id },
      { $set: { status: 'WORKING', startedAt: new Date() } }
    );

    await logActivity(db, 'COMMAND_AGI_PROCESSING', cmd.commandText);

    // استخدام JOEngine AGI لمعالجة الأمر
    const taskId = await agentLoop.addTask(cmd.commandText, {
      source: 'joe_command',
      commandId: cmd._id.toString()
    });

    // الانتظار حتى تكتمل المهمة (مع timeout)
    const maxWait = 60000; // 60 ثانية
    const startTime = Date.now();
    let taskCompleted = false;

    while (!taskCompleted && (Date.now() - startTime) < maxWait) {
      const status = agentLoop.getStatus();
      const completed = status.completedTasks.find(t => t.id === taskId);
      const failed = status.failedTasks.find(t => t.id === taskId);

      if (completed) {
        taskCompleted = true;
        await db.collection('joe_commands').updateOne(
          { _id: cmd._id },
          { 
            $set: { 
              status: 'DONE', 
              finishedAt: new Date(),
              result: completed.results
            } 
          }
        );
        await logActivity(db, 'COMMAND_AGI_DONE', cmd.commandText);
        break;
      }

      if (failed) {
        throw new Error(failed.error);
      }

      await sleep(1000);
    }

    if (!taskCompleted) {
      throw new Error('Task timeout');
    }

  } catch (error) {
    console.error('❌ AGI command processing failed:', error.message);
    await db.collection('joe_commands').updateOne(
      { _id: cmd._id },
      { 
        $set: { 
          status: 'FAILED', 
          finishedAt: new Date(),
          error: error.message
        } 
      }
    );
    await logActivity(db, 'COMMAND_AGI_FAILED', `${cmd.commandText}: ${error.message}`);
  }
}

/**
 * معالجة أوامر JOE بشكل أساسي (بدون AGI)
 */
async function handleCommandBasic(db, cmd) {
  await db.collection('joe_commands').updateOne(
    { _id: cmd._id },
    { $set: { status: 'WORKING', startedAt: new Date() } }
  );

  await logActivity(db, 'COMMAND_WORKING', cmd.commandText);

  // معالجة بسيطة
  await sleep(2000);

  await db.collection('joe_commands').updateOne(
    { _id: cmd._id },
    { $set: { status: 'DONE', finishedAt: new Date() } }
  );

  await logActivity(db, 'COMMAND_DONE', cmd.commandText);
}

/**
 * معالجة مهام SEO
 */
async function handleSeoTask(db, task) {
  await db.collection('seo_tasks').updateOne(
    { _id: task._id },
    { $set: { status: 'WORKING', startedAt: new Date() } }
  );
  await logActivity(db, 'SEO_WORKING', `page=${task.page}`);

  if (joengineInitialized) {
    // استخدام AGI لتحسين SEO
    await agentLoop.addTask(
      `Improve SEO for page ${task.page} with keywords: ${task.keywords?.join(', ') || 'none'}`,
      {
        source: 'seo_task',
        taskId: task._id.toString(),
        page: task.page,
        keywords: task.keywords
      }
    );
  } else {
    // اقتراح خطة أساسية
    await proposePlan(
      db,
      'SEO_BOOST',
      `Improve SEO for page ${task.page} with keywords ${task.keywords?.join(',') || ''}`
    );
  }

  await db.collection('seo_tasks').updateOne(
    { _id: task._id },
    { $set: { status: 'DONE', finishedAt: new Date() } }
  );
  await logActivity(db, 'SEO_DONE', `page=${task.page}`);
}

/**
 * معالجة مهام بناء المشاريع
 */
async function handleFactoryJob(db, job) {
  try {
    console.log(`\n[Worker AGI] Processing factory job: ${job._id}`);
    
    await db.collection('factory_jobs').updateOne(
      { _id: job._id },
      { 
        $set: { 
          status: 'WORKING', 
          startedAt: new Date(),
          progress: 10
        } 
      }
    );
    
    await logActivity(db, 'FACTORY_JOB_STARTED', `Building ${job.projectType}: ${job.shortDescription}`);
    
    const projectId = job._id.toString();
    let result;
    
    // بناء المشروع حسب النوع
    switch (job.projectType.toLowerCase()) {
      case 'website':
      case 'landing-page':
      case 'portfolio':
        await db.collection('factory_jobs').updateOne(
          { _id: job._id },
          { $set: { progress: 30, currentStep: 'Generating website code...' } }
        );
        
        result = await buildWebsite(projectId, job.shortDescription, {
          title: job.title || 'My Website',
          style: job.style || 'modern'
        });
        break;
        
      case 'webapp':
      case 'app':
      case 'application':
        await db.collection('factory_jobs').updateOne(
          { _id: job._id },
          { $set: { progress: 30, currentStep: 'Generating web app code...' } }
        );
        
        result = await buildWebApp(projectId, job.shortDescription, {
          title: job.title || 'My Web App',
          features: job.features || []
        });
        break;
        
      case 'ecommerce':
      case 'store':
      case 'shop':
        await db.collection('factory_jobs').updateOne(
          { _id: job._id },
          { $set: { progress: 30, currentStep: 'Generating e-commerce store...' } }
        );
        
        result = await buildEcommerce(projectId, job.shortDescription, {
          title: job.title || 'My Store',
          products: job.products || []
        });
        break;
        
      default:
        throw new Error(`Unknown project type: ${job.projectType}`);
    }
    
    // النشر على Cloudflare
    if (result && result.success) {
      await db.collection('factory_jobs').updateOne(
        { _id: job._id },
        { $set: { progress: 70, currentStep: 'Deploying to Cloudflare...' } }
      );
      
      const deployResult = await deployToCloudflare(projectId, result.outputPath);
      
      if (deployResult.success) {
        await db.collection('factory_jobs').updateOne(
          { _id: job._id },
          { 
            $set: { 
              status: 'DONE', 
              finishedAt: new Date(),
              progress: 100,
              deployedUrl: deployResult.url,
              result: deployResult
            } 
          }
        );
        
        await logActivity(db, 'FACTORY_JOB_DEPLOYED', `${job.projectType} deployed to ${deployResult.url}`);
        console.log(`✅ Project deployed: ${deployResult.url}`);
      } else {
        throw new Error(deployResult.error || 'Deployment failed');
      }
    } else {
      throw new Error(result?.error || 'Project generation failed');
    }
    
  } catch (error) {
    console.error('❌ Factory job failed:', error.message);
    
    await db.collection('factory_jobs').updateOne(
      { _id: job._id },
      { 
        $set: { 
          status: 'FAILED', 
          finishedAt: new Date(),
          error: error.message
        } 
      }
    );
    
    await logActivity(db, 'FACTORY_JOB_FAILED', `${job.projectType}: ${error.message}`);
  }
}

/**
 * معالجة الروابط الخارجية
 */
async function handleExternalLink(db, link) {
  await db.collection('factory_links').updateOne(
    { _id: link._id },
    { $set: { status: 'ANALYZING', startedAt: new Date() } }
  );

  await logActivity(db, 'EXTERNAL_ANALYSIS', link.externalUrl);

  if (joengineInitialized) {
    // استخدام AGI لتحليل الرابط
    await agentLoop.addTask(
      `Analyze website ${link.externalUrl} and extract its structure, design, and features`,
      {
        source: 'external_link',
        linkId: link._id.toString(),
        url: link.externalUrl
      }
    );
  } else {
    // اقتراح خطة أساسية
    await proposePlan(
      db,
      'EXTERNAL_INTEGRATION',
      `Analyze and prepare editable mirror for ${link.externalUrl}`
    );
  }

  await db.collection('factory_links').updateOne(
    { _id: link._id },
    { $set: { status: 'READY_FOR_MOD', finishedAt: new Date() } }
  );

  await logActivity(db, 'EXTERNAL_READY_FOR_MOD', link.externalUrl);
}

/**
 * اقتراح تحسينات ذاتية
 */
async function maybeProposeSelfImprovements(db) {
  const oneMinAgo = new Date(Date.now() - 60*1000);
  const recent = await db.collection('joe_plans').find({
    createdAt: { $gte: oneMinAgo },
    type: { $in: ['SELF_UPGRADE','SECURITY_IMPROVEMENT','PERFORMANCE_IMPROVEMENT'] }
  }).toArray();

  if (recent.length === 0) {
    if (joengineInitialized) {
      // استخدام AGI لاقتراح تحسينات
      await agentLoop.addTask(
        'Analyze current system performance and propose self-improvements',
        {
          source: 'self_improvement',
          focus: ['performance', 'security', 'features']
        }
      );
    } else {
      // اقتراح أساسي
      await proposePlan(
        db,
        'SELF_UPGRADE',
        'Upgrade Joe self-knowledge using latest engineering patterns without breaking existing functions.'
      );
    }
    
    await logActivity(db, 'SELF_UPGRADE_PROPOSED', 'Joe proposed self-upgrade');
  }
}

/**
 * الحلقة الرئيسية
 */
async function mainLoop() {
  // تهيئة JOEngine AGI
  await initializeJOEngine();

  while (true) {
    try {
      await withDb(async db => {
        // معالجة أوامر JOE
        const pendingCmds = await db.collection('joe_commands')
          .find({ status: 'QUEUED' })
          .limit(5)
          .toArray();
        for (const cmd of pendingCmds) {
          await handleCommandWithAGI(db, cmd);
        }

        // معالجة مهام SEO
        const seoTasks = await db.collection('seo_tasks')
          .find({ status: 'QUEUED' })
          .limit(3)
          .toArray();
        for (const task of seoTasks) {
          await handleSeoTask(db, task);
        }

        // معالجة مهام بناء المشاريع
        const jobs = await db.collection('factory_jobs')
          .find({ status: 'QUEUED' })
          .limit(2)
          .toArray();
        for (const job of jobs) {
          await handleFactoryJob(db, job);
        }

        // معالجة الروابط الخارجية
        const links = await db.collection('factory_links')
          .find({ status: 'LINKED_PENDING_ANALYSIS' })
          .limit(2)
          .toArray();
        for (const link of links) {
          await handleExternalLink(db, link);
        }

        // اقتراح تحسينات ذاتية
        await maybeProposeSelfImprovements(db);
      });
    } catch (err) {
      console.error('[worker loop error]', err);
    }

    await sleep(5000);
  }
}

// بدء Worker
console.log('\n🚀 Starting Worker AGI...\n');
mainLoop().catch(err => {
  console.error('worker fatal err', err);
  process.exit(1);
});

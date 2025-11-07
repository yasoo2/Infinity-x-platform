/**
 * Enhanced Worker - معالج المهام المحسّن
 * يستخدم AI Engine لتوليد المشاريع الفعلية
 */

import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import Redis from 'ioredis';
import { buildWebsite, buildWebApp, buildEcommerce } from './lib/projectGenerator.mjs';
import { deployToCloudflare } from './lib/cloudflareDeployer.mjs';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'future_system';
const mongoClient = new MongoClient(process.env.MONGO_URI);
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

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

/**
 * معالجة مهمة بناء مشروع جديد
 */
async function handleFactoryJob(db, job) {
  try {
    console.log(`[Worker] Processing factory job: ${job._id}`);
    
    // تحديث الحالة إلى WORKING
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
    
    // حفظ معلومات المشروع
    await db.collection('factory_jobs').updateOne(
      { _id: job._id },
      { 
        $set: { 
          progress: 60,
          currentStep: 'Project generated successfully',
          projectPath: result.projectPath,
          files: result.files
        } 
      }
    );
    
    await logActivity(db, 'PROJECT_GENERATED', `Files: ${result.files.join(', ')}`);
    
    // النشر على Cloudflare
    if (process.env.CLOUDFLARE_API_TOKEN) {
      await db.collection('factory_jobs').updateOne(
        { _id: job._id },
        { $set: { progress: 70, currentStep: 'Deploying to Cloudflare...' } }
      );
      
      const deployResult = await deployToCloudflare(
        projectId,
        result.projectPath,
        job.title || job.projectType
      );
      
      if (deployResult.success) {
        await db.collection('factory_jobs').updateOne(
          { _id: job._id },
          { 
            $set: { 
              deploymentUrl: deployResult.url,
              deploymentName: deployResult.deploymentName,
              progress: 90
            } 
          }
        );
        
        await logActivity(db, 'PROJECT_DEPLOYED', `URL: ${deployResult.url}`);
      } else {
        console.warn('[Worker] Deployment failed:', deployResult.error);
        await logActivity(db, 'DEPLOYMENT_FAILED', deployResult.error);
      }
    }
    
    // تحديث الحالة إلى DONE
    await db.collection('factory_jobs').updateOne(
      { _id: job._id },
      { 
        $set: { 
          status: 'DONE',
          progress: 100,
          currentStep: 'Completed',
          finishedAt: new Date()
        } 
      }
    );
    
    await logActivity(db, 'FACTORY_JOB_COMPLETED', `Project ${projectId} completed successfully`);
    
    console.log(`[Worker] Factory job completed: ${job._id}`);
    
  } catch (error) {
    console.error(`[Worker] Factory job failed:`, error);
    
    await db.collection('factory_jobs').updateOne(
      { _id: job._id },
      { 
        $set: { 
          status: 'FAILED',
          error: error.message,
          finishedAt: new Date()
        } 
      }
    );
    
    await logActivity(db, 'FACTORY_JOB_FAILED', `Error: ${error.message}`);
  }
}

/**
 * معالجة أمر من المستخدم
 */
async function handleCommand(db, cmd) {
  try {
    await db.collection('joe_commands').updateOne(
      { _id: cmd._id },
      { $set: { status: 'WORKING', startedAt: new Date() } }
    );

    await logActivity(db, 'COMMAND_PROCESSING', cmd.commandText);

    // هنا يمكن إضافة معالجة ذكية للأوامر
    // مثل: "create a landing page for my coffee shop"
    // يتم تحويله تلقائياً إلى factory job
    
    const lowerCmd = cmd.commandText.toLowerCase();
    
    if (lowerCmd.includes('create') || lowerCmd.includes('build') || lowerCmd.includes('make')) {
      // إنشاء factory job تلقائياً
      let projectType = 'website';
      
      if (lowerCmd.includes('app') || lowerCmd.includes('application')) {
        projectType = 'webapp';
      } else if (lowerCmd.includes('store') || lowerCmd.includes('shop') || lowerCmd.includes('ecommerce')) {
        projectType = 'ecommerce';
      }
      
      await db.collection('factory_jobs').insertOne({
        createdAt: new Date(),
        sessionToken: cmd.sessionToken,
        projectType,
        shortDescription: cmd.commandText,
        status: 'QUEUED',
        source: 'command'
      });
      
      await logActivity(db, 'AUTO_CREATED_JOB', `From command: ${cmd.commandText}`);
    }

    await db.collection('joe_commands').updateOne(
      { _id: cmd._id },
      { $set: { status: 'DONE', finishedAt: new Date() } }
    );

    await logActivity(db, 'COMMAND_COMPLETED', cmd.commandText);
    
  } catch (error) {
    console.error('[Worker] Command failed:', error);
    
    await db.collection('joe_commands').updateOne(
      { _id: cmd._id },
      { $set: { status: 'FAILED', error: error.message, finishedAt: new Date() } }
    );
  }
}

/**
 * الحلقة الرئيسية
 */
async function mainLoop() {
  console.log('[Worker] Enhanced worker started');
  
  while (true) {
    try {
      await withDb(async db => {
        // معالجة factory jobs
        const jobs = await db.collection('factory_jobs')
          .find({ status: 'QUEUED' })
          .limit(1) // معالجة واحدة في كل مرة لتجنب استهلاك الموارد
          .toArray();
          
        for (const job of jobs) {
          await handleFactoryJob(db, job);
        }

        // معالجة الأوامر
        const commands = await db.collection('joe_commands')
          .find({ status: 'QUEUED' })
          .limit(3)
          .toArray();
          
        for (const cmd of commands) {
          await handleCommand(db, cmd);
        }
      });
    } catch (err) {
      console.error('[Worker] Loop error:', err);
    }

    await sleep(5000); // انتظار 5 ثوان بين كل دورة
  }
}

// بدء Worker
mainLoop().catch(err => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});

import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import Redis from 'ioredis';
import JOEngine from '../joengine-agi/index.mjs'; // استيراد JOEngine

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'future_system';
const mongoClient = new MongoClient(process.env.MONGO_URI);
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : 
null;

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

async function handleCommand(db, cmd, joengine) {
  await db.collection('joe_commands').updateOne(
    { _id: cmd._id },
    { $set: { status: 'WORKING', startedAt: new Date() } }
  );

  await logActivity(db, 'COMMAND_WORKING', cmd.commandText);

  try {
    // استخدام JOEngine لتحليل وتنفيذ الأمر
    const taskId = await joengine.addTask(cmd.commandText, {
      source: 'worker_command',
      commandId: cmd._id.toString()
    });

    // يمكننا هنا الانتظار حتى تكتمل المهمة أو تركها تعمل في الخلفية
    // لغرض هذا التطوير، سنفترض أن JOEngine سيعالجها بشكل مستقل.
    
    await db.collection('joe_commands').updateOne(
      { _id: cmd._id },
      { $set: { status: 'DONE', finishedAt: new Date(), taskId } }
    );

    await logActivity(db, 'COMMAND_DONE', `Task ${taskId} created for: ${cmd.commandText}`);

  } catch (error) {
    await db.collection('joe_commands').updateOne(
      { _id: cmd._id },
      { $set: { status: 'FAILED', finishedAt: new Date(), error: error.message } }
    );
    await logActivity(db, 'COMMAND_FAILED', `Error: ${error.message}`);
  }
}

async function handleSeoTask(db, task) {
  await db.collection('seo_tasks').updateOne(
    { _id: task._id },
    { $set: { status: 'WORKING', startedAt: new Date() } }
  );
  await logActivity(db, 'SEO_WORKING', `page=${task.page}`);

  await proposePlan(
    db,
    'SEO_BOOST',
    `Improve SEO for page ${task.page} with keywords 
${task.keywords?.join(',') || ''}`
  );

  await db.collection('seo_tasks').updateOne(
    { _id: task._id },
    { $set: { status: 'DONE', finishedAt: new Date() } }
  );
  await logActivity(db, 'SEO_DONE', `page=${task.page}`);
}

async function handleFactoryJob(db, job) {
  await db.collection('factory_jobs').updateOne(
    { _id: job._id },
    { $set: { status: 'WORKING', startedAt: new Date() } }
  );
  await logActivity(db, 'FACTORY_JOB_WORKING', `type=${job.projectType}`);

  await proposePlan(
    db,
    'NEW_PROJECT_SCAFFOLD',
    `Scaffold ${job.projectType} with description 
"${job.shortDescription||''}"`
  );

  await db.collection('factory_jobs').updateOne(
    { _id: job._id },
    { $set: { status: 'DONE', finishedAt: new Date() } }
  );
  await logActivity(db, 'FACTORY_JOB_DONE', `type=${job.projectType}`);
}

async function handleExternalLink(db, link) {
  await db.collection('factory_links').updateOne(
    { _id: link._id },
    { $set: { status: 'ANALYZING', startedAt: new Date() } }
  );

  await logActivity(db, 'EXTERNAL_ANALYSIS', link.externalUrl);

  await proposePlan(
    db,
    'EXTERNAL_INTEGRATION',
    `Analyze and prepare editable mirror for ${link.externalUrl}`
  );

  await db.collection('factory_links').updateOne(
    { _id: link._id },
    { $set: { status: 'READY_FOR_MOD', finishedAt: new Date() } }
  );

  await logActivity(db, 'EXTERNAL_READY_FOR_MOD', link.externalUrl);
}

async function maybeProposeSelfImprovements(db, joengine) {
  const oneMinAgo = new Date(Date.now() - 60*1000);
  const recent = await db.collection('joe_plans').find({
    createdAt: { $gte: oneMinAgo },
    type: { $in: 
['SELF_UPGRADE','SECURITY_IMPROVEMENT','PERFORMANCE_IMPROVEMENT'] }
  }).toArray();

  if (recent.length === 0) {
    // المهمة الجديدة: تحليل الكود باستخدام CodeTool واقتراح تحسينات
    const goal = `Analyze the entire 'joengine-agi' directory using the 'code' and 'file' tools. Identify areas for performance, security, and structural improvements. Propose a plan to implement the top 3 most critical improvements.`;

    const taskId = await joengine.addTask(goal, {
      source: 'self_evolution_worker',
      evolutionType: 'SELF_UPGRADE'
    });

    await proposePlan(
      db,
      'SELF_UPGRADE',
      `Self-Evolution task started (Task ID: ${taskId}). Goal: ${goal}`
    );
    await logActivity(db, 'SELF_UPGRADE_PROPOSED', `Joe proposed self-upgrade with Task ID: ${taskId}`);
  }
}

async function mainLoop() {
  // تهيئة JOEngine
  const joengine = new JOEngine();
  await joengine.start();

  while (true) {
    try {
      await withDb(async db => {
        const pendingCmds = await db.collection('joe_commands')
          .find({ status: 'QUEUED' })
          .limit(5)
          .toArray();
        for (const cmd of pendingCmds) {
          await handleCommand(db, cmd, joengine);
        }

        const seoTasks = await db.collection('seo_tasks')
          .find({ status: 'QUEUED' })
          .limit(3)
          .toArray();
        for (const task of seoTasks) {
          await handleSeoTask(db, task);
        }

        const jobs = await db.collection('factory_jobs')
          .find({ status: 'QUEUED' })
          .limit(2)
          .toArray();
        for (const job of jobs) {
          await handleFactoryJob(db, job);
        }

        const links = await db.collection('factory_links')
          .find({ status: 'LINKED_PENDING_ANALYSIS' })
          .limit(2)
          .toArray();
        for (const link of links) {
          await handleExternalLink(db, link);
        }

        await maybeProposeSelfImprovements(db, joengine);
      });
    } catch (err) {
      console.error('[worker loop error]', err);
    }

    await sleep(5000);
  }
}

mainLoop().catch(async err => {
  console.error('worker fatal err', err);
  // يجب إضافة منطق لإيقاف JOEngine هنا إذا كان قد بدأ
});

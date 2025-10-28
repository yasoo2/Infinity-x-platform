import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import Redis from 'ioredis';

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

async function handleCommand(db, cmd) {
  await db.collection('joe_commands').updateOne(
    { _id: cmd._id },
    { $set: { status: 'WORKING', startedAt: new Date() } }
  );

  await logActivity(db, 'COMMAND_WORKING', cmd.commandText);

  await db.collection('joe_commands').updateOne(
    { _id: cmd._id },
    { $set: { status: 'DONE', finishedAt: new Date() } }
  );

  await logActivity(db, 'COMMAND_DONE', cmd.commandText);
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

async function maybeProposeSelfImprovements(db) {
  const oneMinAgo = new Date(Date.now() - 60*1000);
  const recent = await db.collection('joe_plans').find({
    createdAt: { $gte: oneMinAgo },
    type: { $in: 
['SELF_UPGRADE','SECURITY_IMPROVEMENT','PERFORMANCE_IMPROVEMENT'] }
  }).toArray();

  if (recent.length === 0) {
    await proposePlan(
      db,
      'SELF_UPGRADE',
      'Upgrade Joe self-knowledge using latest engineering patterns 
without breaking existing functions.'
    );
    await logActivity(db, 'SELF_UPGRADE_PROPOSED', 'Joe proposed 
self-upgrade');
  }
}

async function mainLoop() {
  while (true) {
    try {
      await withDb(async db => {
        const pendingCmds = await db.collection('joe_commands')
          .find({ status: 'QUEUED' })
          .limit(5)
          .toArray();
        for (const cmd of pendingCmds) {
          await handleCommand(db, cmd);
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

        await maybeProposeSelfImprovements(db);
      });
    } catch (err) {
      console.error('[worker loop error]', err);
    }

    await sleep(5000);
  }
}

mainLoop().catch(err => {
  console.error('worker fatal err', err);
});

// backend/scripts/seedSuperAdmin.mjs

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

dotenv.config();

// مهم: لازم يكون عندك هدول بالبيئة قبل التشغيل
// process.env.MONGO_URI
// process.env.DB_NAME  (اختياري, default = "future_system")
// process.env.SEED_ADMIN_EMAIL
// process.env.SEED_ADMIN_PHONE
// process.env.SEED_ADMIN_PASSWORD

async function run() {
  const {
    MONGO_URI,
    DB_NAME = 'future_system',
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PHONE,
    SEED_ADMIN_PASSWORD,
  } = process.env;

  if (!MONGO_URI) {
    console.error('[seedSuperAdmin] MONGO_URI is missing');
    process.exit(1);
  }
  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    console.error('[seedSuperAdmin] Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log('[seedSuperAdmin] Connected to Mongo');

  // شوف إذا في واحد role=super_admin أصلاً
  const existing = await db.collection('users').findOne({ role: 'super_admin' });

  if (existing) {
    console.log('[seedSuperAdmin] Super admin already exists:', existing.email);
    await client.close();
    process.exit(0);
  }

  // ما في سوبر أدمن → نخلقه
  const hash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  const now = new Date();

  const newUser = {
    email: SEED_ADMIN_EMAIL,
    phone: SEED_ADMIN_PHONE || null,
    passwordHash: hash,
    role: 'super_admin',
    createdAt: now,
    lastLoginAt: now,
    activeSessionSince: now,
  };

  const ins = await db.collection('users').insertOne(newUser);

  console.log('[seedSuperAdmin] CREATED with _id:', ins.insertedId.toString());

  await client.close();
  process.exit(0);
}

run().catch(err => {
  console.error('[seedSuperAdmin] FATAL', err);
  process.exit(1);
});
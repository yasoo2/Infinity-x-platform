
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error(chalk.red.bold('❌ MONGO_URI is not defined in the .env file.'));
  process.exit(1);
}

let db;
let client;

export async function initMongo() {
  if (db) {
    return db;
  }
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db();
    console.log(chalk.green('✅ Successfully connected to MongoDB.'));
    return db;
  } catch (error) {
    console.error(chalk.red.bold('❌ Could not connect to MongoDB:'), error);
    process.exit(1);
  }
}

export async function closeMongoConnection() {
  if (client) {
    await client.close();
    console.log(chalk.yellow('🔒 MongoDB connection closed.'));
  }
}

export function getDb() {
    if (!db) {
        throw new Error("Database not initialized. Call initMongo() first.");
    }
    return db;
}

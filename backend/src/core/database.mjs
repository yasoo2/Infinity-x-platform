// backend/src/db.mjs
import { MongoClient } from 'mongodb';

const DB_NAME = process.env.DB_NAME || 'future_system';
let mongoClient = null;
let mongoDb = null;

export async function initMongo() {
  if (mongoDb) return mongoDb;
  
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017'; // Support both MONGODB_URI and MONGO_URI
  if (!uri) throw new Error('MONGO_URI missing');
  
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  mongoDb = mongoClient.db(DB_NAME);
  console.log('[Mongo] Connected');
  return mongoDb;
}

export function getDB() {
  if (!mongoDb) throw new Error('Database not initialized');
  return mongoDb;
}

// Alias for compatibility
export const getDb = getDB;

export function getMongoClient() {
  return mongoClient;
}

export async function closeMongoConnection() {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDb = null;
    console.log('[Mongo] Disconnected');
  }
}
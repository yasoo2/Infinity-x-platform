import { MongoClient } from 'mongodb';

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'joengine';

let db;
let client;

export async function getDB() {
  if (db) {
    return db;
  }

  if (!client) {
    try {
      client = new MongoClient(url);
      await client.connect();
      db = client.db(dbName);
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB', error);
      process.exit(1);
    }
  }
  
  return db;
}

export async function closeDB() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('MongoDB connection closed');
    }
}

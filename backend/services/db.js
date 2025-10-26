import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

let client;
let db;

export async function connectDB() {
  if (db) return db;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("[Mongo] MONGO_URI missing");
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.DB_NAME || "infinityx");
  console.log("[Mongo] Connected");
  return db;
}

export function getDB() {
  if (!db) throw new Error("DB not connected yet");
  return db;
}

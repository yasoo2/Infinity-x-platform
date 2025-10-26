// تخزين سجل التعديلات + rollback
import { getDB } from "./db.js";
import { v4 as uuid } from "uuid";

export async function recordChange({ actor, action, details }) {
  const db = getDB();
  const entry = {
    _id: uuid(),
    actor,
    action,
    details,
    createdAt: new Date()
  };
  await db.collection("change_log").insertOne(entry);
  return entry;
}

// rollback مبدأي (نقدر نتوسع لاحقاً: استرجاع snapshot من مشروع)
export async function listChanges(limit = 50) {
  const db = getDB();
  return db.collection("change_log")
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

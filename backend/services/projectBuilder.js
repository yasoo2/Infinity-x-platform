// مسؤول عن إنشاء مشاريع العملاء (ويب / موبايل) من قوالب
import { v4 as uuid } from "uuid";
import { getDB } from "./db.js";
import { recordChange } from "./rollback.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// helper لقراءة قالب من الملفات الجاهزة
function readTemplateFiles(templateDir) {
  const absDir = path.join(__dirname, "..", "factory", "templates", templateDir);
  // ملاحظة: هون ممكن نقرأ بشكل أعمق، بس كبداية بنقرأ الملفات الأساسية
  const files = {};

  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.isFile()) {
      const content = fs.readFileSync(path.join(absDir, ent.name), "utf8");
      files[ent.name] = content;
    }
    // لو بدنا subfolders منوسع هون لاحقاً
  }

  return files;
}

// ينشئ "مشروع عميل جديد" بأي نوع
export async function createClientProject({ clientName, projectType, language }) {
  // projectType: "web-store" | "landing-page" | "mobile-app"
  // language: "ar" or "en"
  const db = getDB();

  let templateDir;
  if (projectType === "web-store") templateDir = "web/store-basic";
  else if (projectType === "landing-page") templateDir = "web/landing-basic";
  else if (projectType === "mobile-app") templateDir = "mobile/app-basic";
  else templateDir = "web/landing-basic";

  const files = readTemplateFiles(templateDir);

  const projectId = uuid();
  const now = new Date();

  const projectDoc = {
    _id: projectId,
    clientName,
    projectType,
    language,
    files,
    createdAt: now,
    lastUpdatedAt: now,
    status: "draft", // or "preview" or "live"
    vip: false
  };

  await db.collection("client_projects").insertOne(projectDoc);

  // سجّل هذا التغيير عشان يظهر في Change Log
  await recordChange({
    actor: "system",
    action: "create_project",
    details: { clientName, projectId, projectType },
  });

  return projectDoc;
}

export async function listClientProjects() {
  const db = getDB();
  const arr = await db
    .collection("client_projects")
    .find({})
    .project({ files: 0 }) // ما نرجع كل الكود هون
    .sort({ lastUpdatedAt: -1 })
    .toArray();
  return arr;
}

export async function markVIP(projectId, vipValue) {
  const db = getDB();
  await db.collection("client_projects").updateOne(
    { _id: projectId },
    { $set: { vip: !!vipValue, lastUpdatedAt: new Date() } }
  );

  await recordChange({
    actor: "system",
    action: "vip_toggle",
    details: { projectId, vip: vipValue }
  });

  return { ok: true };
}

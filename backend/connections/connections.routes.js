import { Router } from "express";
import { authRequired } from "../middleware/authRequired.js";
import { roleRequired } from "../middleware/roleRequired.js";
import { ROLES } from "../config/roles.js";
import { getDB } from "../services/db.js";
import { recordChange } from "../services/rollback.js";

// هون بنخزن مفاتيح الربط (Render, Cloudflare, Mongo لعميل معين, Repo, ...)
// مهم: ما منرجع الأسرار كاملة بالـ GET. بنعرض بس انها موجودة أو لا.

const r = Router();

// إضافة / تحديث اتصال خارجي
r.post("/link", authRequired, roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN]), async (req,res)=>{
  const { clientName, provider, data } = req.body;
  // data = { apiKey: "...", projectId:"...", etc }
  const db = getDB();
  await db.collection("connections").updateOne(
    { clientName, provider },
    { $set: { data, updatedAt:new Date() } },
    { upsert:true }
  );
  await recordChange({
    actor:req.user.email,
    action:"connection_link",
    details:{ clientName, provider }
  });
  res.json({ ok:true });
});

// قائمة الاتصالات بدون الأسرار الخام
r.get("/list", authRequired, roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN]), async (req,res)=>{
  const db = getDB();
  const list = await db.collection("connections").find({})
    .project({ "data.apiKey":0, "data.secret":0 })
    .toArray();
  res.json({ ok:true, connections:list });
});

export default r;

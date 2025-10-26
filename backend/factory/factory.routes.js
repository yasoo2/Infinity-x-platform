import { Router } from "express";
import { authRequired } from "../middleware/authRequired.js";
import { roleRequired } from "../middleware/roleRequired.js";
import { ROLES } from "../config/roles.js";
import { createClientProject, listClientProjects, markVIP } from "../services/projectBuilder.js";
import { listChanges } from "../services/rollback.js";

const r = Router();

// إنشاء مشروع سريع (Quick Project)
r.post("/quick", authRequired, roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN]), async (req, res) => {
  const { clientName, projectType, language } = req.body;
  const proj = await createClientProject({ clientName, projectType, language });
  res.json({ ok: true, project: proj });
});

// عرض كل مشاريع العملاء (من غير ملفات الكود الكاملة)
r.get("/projects", authRequired, roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN]), async (req,res)=>{
  const list = await listClientProjects();
  res.json({ ok:true, projects:list });
});

// VIP toggle
r.post("/projects/:id/vip", authRequired, roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN]), async (req,res)=>{
  const {vip} = req.body;
  const out = await markVIP(req.params.id, vip);
  res.json(out);
});

// Change Log + Rollback واجهة للعرض
r.get("/changes", authRequired, roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN]), async (req,res)=>{
  const ch = await listChanges(100);
  res.json({ ok:true, changes:ch });
});

// TODO: /rollback/:changeId لإرجاع نسخة قبل تعديل معيّن (Phase2)

export default r;

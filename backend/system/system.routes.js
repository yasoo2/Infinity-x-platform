import { Router } from "express";
import { authRequired } from "../middleware/authRequired.js";
import { roleRequired } from "../middleware/roleRequired.js";
import { ROLES } from "../config/roles.js";
import { getSystemStatus } from "../services/monitoring.js";

const r = Router();

r.get("/status", authRequired, roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN]), async (req,res)=>{
  const st = await getSystemStatus();
  res.json(st);
});

// تغيير وضع النظام (normal/maintenance/locked) للسوبر أدمِن فقط
r.post("/mode", authRequired, roleRequired([ROLES.SUPER_ADMIN]), async (req,res)=>{
  const { mode } = req.body; // normal | maintenance | locked
  process.env.SYSTEM_MODE = mode;
  res.json({ ok:true, systemMode: mode });
});

// تغيير وضع المصنع safe/live
r.post("/factory-mode", authRequired, roleRequired([ROLES.SUPER_ADMIN]), async (req,res)=>{
  const { mode } = req.body; // safe | live
  process.env.FACTORY_MODE = mode;
  res.json({ ok:true, factoryMode: mode });
});

export default r;

import { Router } from "express";
import { authRequired } from "../middleware/authRequired.js";
import { roleRequired } from "../middleware/roleRequired.js";
import { ROLES } from "../config/roles.js";
import { askJoeLLM } from "../services/aiLLM.js";
import { recordChange } from "../services/rollback.js";

// هون واجهة محادثة جو
// - جو بيرجع: الخطة، الاقتراحات، درجة الخطورة
// - لو طلب تنفيذ، بنسوي تنفيذ فقط بعد موافقة صريحة
const r = Router();

r.post("/chat", authRequired, roleRequired([ROLES.SUPER_ADMIN, ROLES.ADMIN]), async (req,res)=>{
  const { message } = req.body;
  const llmRes = await askJoeLLM(message);

  // هون منقدر نحط منطق: جو يقترح الخطوة الجاية
  // safe/live mode: من env FACTORY_MODE
  const mode = process.env.FACTORY_MODE || "safe";

  res.json({
    ok:true,
    factoryMode: mode,
    plan: llmRes.plan,
    suggestions: llmRes.suggestions,
    risk: llmRes.risk,
    note: llmRes.error ? llmRes.error : null
  });
});

// تنفيذ أمر فعلي (مع موافقة)
r.post("/execute", authRequired, roleRequired([ROLES.SUPER_ADMIN]), async (req,res)=>{
  const { approvedActionDescription } = req.body;
  // هون بالمستقبل بننفذ تعديل حقيقي (تعديل ملفات مشروع، ربط systems..)
  // حالياً رح نسجل انه فيه مهمة approved
  await recordChange({
    actor: req.user.email,
    action: "joe_execute",
    details: {desc: approvedActionDescription}
  });
  res.json({ ok:true, message:"Action recorded. (Live execution wiring is next step.)" });
});

export default r;

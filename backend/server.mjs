import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

import { registerSystemRoutes } from "./routes/system.mjs";

dotenv.config();

// نعمل السيرفر
const app = express();

// نخلي السيرفر يفهم JSON
app.use(express.json());

// نحدد مين مسموحله يتصل (CORS)
app.use(
  cors({
    origin:
      process.env.CORS_ORIGINS?.split(",") || [
        "http://localhost:3000",
        "http://localhost:5173",
      ],
  })
);

// هاي الحالة الحية تبعة النظام
// جو (الـ worker) رح يبعت نبضات heartbeat
// وإحنا بنخزن آخر حالة هون
const liveState = {
  status: "running",
  lastHeartbeat: new Date().toISOString(),
  activeTasks: [],
  notes: [],
};

// نربط كل روتات /system/* من ملف routes/system.mjs
registerSystemRoutes(app, liveState);

// في المستقبل:
// هون فينا نضيف routes تانية مثل auth, admin, landing-factory, الخ
// مثال سكافولد (مش شغّال لسا بس محجوز مكانه):
app.get("/auth/placeholder-login", (req, res) => {
  return res.json({
    ok: true,
    note: "login endpoint placeholder (super_admin / admin / user / joe)",
  });
});

// بوابة تشغيل السيرفر
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(
    `✅ backend API running on port ${PORT} at ${new Date().toISOString()}`
  );
});

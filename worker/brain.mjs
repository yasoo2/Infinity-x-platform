import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

async function heartbeat(note, task) {
  try {
    const res = await fetch((process.env.BACKEND_URL || 
"http://localhost:4000") + "/system/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "running",
        task,
        note,
      }),
    });
    const data = await res.json();
    console.log("pulse ->", data.ok ? "OK" : "ERR", new 
Date().toISOString());
  } catch (err) {
    console.error("pulse failed:", err.message);
  }
}

// جو شغال بالخلفية (لو انت سكّرت المتصفح/نامت اللابتوب، هو رح يكمل 
بالسيرفر)
async function mainLoop() {
  await heartbeat(
    "agent is thinking & watching the system",
    "scan system / plan next improvement"
  );

  // TODO:
  // - فحص أمان
  // - فحص أداء
  // - فحص SEO
  // - تجهيز تعديلات للكود (diffs) ورفعها GitHub
  // - طلب صلاحيات كاملة منك أول مرة فقط، بعدين يكمل لحاله

  setTimeout(mainLoop, 15000); // كل 15 ثانية
}

console.log("joe brain worker started.");
mainLoop();

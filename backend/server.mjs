import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(",") || 
["http://localhost:3000","http://localhost:5173"],
}));

let liveState = {
  status: "running",
  lastHeartbeat: new Date().toISOString(),
  activeTasks: [],
  notes: []
};

app.get("/system/health", (req, res) => {
  return res.json({
    ok: true,
    status: liveState.status,
    lastHeartbeat: liveState.lastHeartbeat,
    time: new Date().toISOString(),
  });
});

app.get("/system/live-feed", (req, res) => {
  return res.json({
    ok: true,
    liveState,
  });
});

app.post("/system/pulse", (req, res) => {
  const { status, task, note } = req.body || {};

  liveState.lastHeartbeat = new Date().toISOString();
  if (status) liveState.status = status;
  if (task) liveState.activeTasks.push({ task, at: new 
Date().toISOString() });
  if (note) liveState.notes.push({ note, at: new Date().toISOString() });

  return res.json({ ok: true, liveState });
});

// TODO (بيكمّلها جو):
// - auth أدوار
// - MongoDB و Redis من env
// - ربط GitHub
// - إدارة التحكم الكامل لجو
// - APIs للمصنع ولوحة X و SEO

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`FutureSystems backend running on port ${PORT}`);
});

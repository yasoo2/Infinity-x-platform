// system.mjs
// هنا راح نكمّل الـ system endpoints:
// - GET /system/health
// - GET /system/live-feed
// - GET /system/status
// - POST /system/pulse  (الـ worker "جو" بيبعت نبضه هون)

export function registerSystemRoutes(app, liveState) {
  // مثال مبدئي (copy من server.mjs بطريقة منظمة):
  app.get("/system/health", (req, res) => {
    return res.json({
      ok: true,
      status: liveState.status,
      lastHeartbeat: liveState.lastHeartbeat,
    });
  });

  app.get("/system/status", (req, res) => {
    return res.json(liveState);
  });

  app.post("/system/pulse", async (req, res) => {
    const { status, task, note } = req.body || {};

    liveState.status = status || "running";
    liveState.lastHeartbeat = new Date().toISOString();
    if (task) liveState.activeTasks.push(task);
    if (note) liveState.notes.push(note);

    return res.json({ ok: true, updated: liveState });
  });

  // live-feed placeholder:
  app.get("/system/live-feed", (req, res) => {
    // لاحقاً بنضيف هنا activity stream / logs / events...
    return res.json({
      ok: true,
      feed: liveState.notes,
    });
  });
}

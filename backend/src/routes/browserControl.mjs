import express from 'express';
import { chromium } from 'playwright';

const router = express.Router();
const sessions = new Map();

// تنظيف الجلسات القديمة كل 30 دقيقة
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000;
  for (const [id, s] of sessions.entries()) {
    if (now - s.createdAt > maxAge) {
      s.browser.close().catch(() => {});
      sessions.delete(id);
      console.log(`[Browser] جلسة منتهية: ${id}`);
    }
  }
}, 30 * 60 * 1000);

// بدء جلسة
router.post('/start', async (req, res) => {
  try {
    const { sessionId = Date.now().toString(), url = 'https://google.com' } = req.body;

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    sessions.set(sessionId, {
      browser, page,
      mouse: { x: 0, y: 0 },
      isUserControlled: false,
      createdAt: Date.now()
    });

    res.json({ ok: true, sessionId, message: 'تم فتح المتصفح' });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// لقطة شاشة
router.post('/screenshot', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const s = sessions.get(sessionId);
    if (!s) return res.json({ ok: false, error: 'جلسة غير موجودة' });

    const img = await s.page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 80 });
    res.json({
      ok: true,
      screenshot: `data:image/jpeg;base64,${img}`,
      url: s.page.url(),
      mouse: s.mouse
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// باقي الوظائف (click, type, move, navigate, close, status)
// ... (نفس الكود اللي عندك، ما يحتاج تعديل)

export default router;
import express from 'express';
import puppeteer from 'puppeteer';

const router = express.Router();

// Store active browser sessions
const sessions = new Map();

// Start a new browser session
router.post('/start', async (req, res) => {
  try {
    const { sessionId = Date.now().toString(), url = 'https://www.google.com' } = req.body;

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Store session
    sessions.set(sessionId, {
      browser,
      page,
      mousePosition: { x: 0, y: 0 },
      isUserControlled: false,
      createdAt: Date.now()
    });

    // Navigate to URL
    if (url) {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    }

    res.json({
      ok: true,
      sessionId,
      message: 'Browser session started'
    });

  } catch (error) {
    console.error('Browser start error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Get screenshot
router.post('/screenshot', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.json({ ok: false, error: 'Invalid session' });
    }

    const session = sessions.get(sessionId);
    const screenshot = await session.page.screenshot({
      encoding: 'base64',
      type: 'jpeg',
      quality: 80
    });

    // Get current URL
    const url = session.page.url();

    res.json({
      ok: true,
      screenshot: `data:image/jpeg;base64,${screenshot}`,
      url,
      mousePosition: session.mousePosition
    });

  } catch (error) {
    console.error('Screenshot error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Navigate to URL
router.post('/navigate', async (req, res) => {
  try {
    const { sessionId, url } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.json({ ok: false, error: 'Invalid session' });
    }

    const session = sessions.get(sessionId);
    await session.page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    res.json({ ok: true, message: 'Navigated successfully' });

  } catch (error) {
    console.error('Navigate error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Click element
router.post('/click', async (req, res) => {
  try {
    const { sessionId, x, y, selector } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.json({ ok: false, error: 'Invalid session' });
    }

    const session = sessions.get(sessionId);

    if (selector) {
      await session.page.click(selector);
    } else if (x !== undefined && y !== undefined) {
      await session.page.mouse.click(x, y);
    }

    // Update mouse position
    if (x !== undefined && y !== undefined) {
      session.mousePosition = { x, y };
    }

    res.json({ ok: true, message: 'Clicked successfully' });

  } catch (error) {
    console.error('Click error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Type text
router.post('/type', async (req, res) => {
  try {
    const { sessionId, text, selector } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.json({ ok: false, error: 'Invalid session' });
    }

    const session = sessions.get(sessionId);

    if (selector) {
      await session.page.type(selector, text);
    } else {
      await session.page.keyboard.type(text);
    }

    res.json({ ok: true, message: 'Typed successfully' });

  } catch (error) {
    console.error('Type error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Move mouse
router.post('/move-mouse', async (req, res) => {
  try {
    const { sessionId, x, y } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.json({ ok: false, error: 'Invalid session' });
    }

    const session = sessions.get(sessionId);
    await session.page.mouse.move(x, y);
    session.mousePosition = { x, y };

    res.json({ ok: true, mousePosition: { x, y } });

  } catch (error) {
    console.error('Move mouse error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Toggle user control
router.post('/toggle-control', async (req, res) => {
  try {
    const { sessionId, userControlled } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.json({ ok: false, error: 'Invalid session' });
    }

    const session = sessions.get(sessionId);
    session.isUserControlled = userControlled;

    res.json({
      ok: true,
      isUserControlled: session.isUserControlled,
      message: userControlled ? 'User took control' : 'JOE resumed control'
    });

  } catch (error) {
    console.error('Toggle control error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Close session
router.post('/close', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.json({ ok: false, error: 'Invalid session' });
    }

    const session = sessions.get(sessionId);
    await session.browser.close();
    sessions.delete(sessionId);

    res.json({ ok: true, message: 'Session closed' });

  } catch (error) {
    console.error('Close session error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Get session status
router.post('/status', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || !sessions.has(sessionId)) {
      return res.json({ ok: false, error: 'Invalid session' });
    }

    const session = sessions.get(sessionId);
    const url = session.page.url();
    const title = await session.page.title();

    res.json({
      ok: true,
      url,
      title,
      mousePosition: session.mousePosition,
      isUserControlled: session.isUserControlled,
      uptime: Date.now() - session.createdAt
    });

  } catch (error) {
    console.error('Status error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Cleanup old sessions (run every 30 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > maxAge) {
      session.browser.close().catch(console.error);
      sessions.delete(sessionId);
      console.log(`Cleaned up session: ${sessionId}`);
    }
  }
}, 30 * 60 * 1000);

export default router;

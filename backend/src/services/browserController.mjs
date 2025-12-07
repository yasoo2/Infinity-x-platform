import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class BrowserController {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      const launchBase = {
        headless: (process.env.PUPPETEER_HEADLESS_MODE || 'true') === 'true' ? 'new' : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
      };
      const execCandidates = [];
      const execEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
      if (execEnv) execCandidates.push(execEnv);
      const chromeEnv1 = process.env.GOOGLE_CHROME_BIN;
      if (chromeEnv1) execCandidates.push(chromeEnv1);
      const chromeEnv2 = process.env.CHROME_PATH;
      if (chromeEnv2) execCandidates.push(chromeEnv2);
      try {
        const built = typeof puppeteer.executablePath === 'function' ? puppeteer.executablePath() : null;
        if (built && fs.existsSync(built)) execCandidates.push(built);
      } catch { /* noop */ }
      // Common locations across Linux/macOS
      execCandidates.push(
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      );
      // Try Puppeteer cache directories if available
      const cacheDirs = [
        process.env.PUPPETEER_CACHE_DIR,
        path.join(process.cwd(), '.cache', 'puppeteer'),
        '/opt/render/project/.cache/puppeteer',
        path.join(process.env.HOME || '', '.cache', 'puppeteer')
      ].filter(Boolean);
      for (const base of cacheDirs) {
        try {
          const chromeDir = path.join(base, 'chrome');
          const entries = await fs.promises.readdir(chromeDir).catch(() => []);
          for (const entry of entries) {
            const candidate = path.join(chromeDir, entry, process.platform === 'darwin' ? 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' : 'chrome');
            if (fs.existsSync(candidate)) execCandidates.push(candidate);
          }
        } catch { /* noop */ }
        try {
          const chromiumDir = path.join(base, 'chromium');
          const kEntries = await fs.promises.readdir(chromiumDir).catch(() => []);
          for (const entry of kEntries) {
            const candidate = path.join(
              chromiumDir,
              entry,
              process.platform === 'darwin'
                ? 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'
                : 'chrome'
            );
            if (fs.existsSync(candidate)) execCandidates.push(candidate);
          }
        } catch { /* noop */ }
      }
      const foundPath = execCandidates.find(p => {
        try { return fs.existsSync(p); } catch { return false; }
      });
      if (foundPath) launchBase.executablePath = foundPath;

      try {
        this.browser = await puppeteer.launch(launchBase);
      } catch (e1) {
        try {
          this.browser = await puppeteer.launch({ ...launchBase, headless: 'new', args: launchBase.args.filter(a => a !== '--disable-gpu') });
        } catch (e2) {
          const err = e2 || e1;
          const hint = 'Chrome/Chromium not found. Set PUPPETEER_EXECUTABLE_PATH to your Chrome binary or run: npx puppeteer browsers install chrome';
          console.error('Puppeteer launch failed:', err?.message || String(err), '\nHint:', hint);
          throw new Error(hint);
        }
      }

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 720 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      try {
        const initialUrl = process.env.BROWSER_INITIAL_URL || 'https://www.google.com';
        await this.page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch { /* noop */ }
      
      this.isInitialized = true;
      console.log('✅ Browser initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  async navigate(url) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      return { success: true, url: this.page.url() };
    } catch (error) {
      console.error('Navigation error:', error);
      return { success: false, error: error.message };
    }
  }

  async getScreenshot() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const screenshot = await this.page.screenshot({ type: 'jpeg', quality: 60, fullPage: false, omitBackground: true });
      
      return screenshot.toString('base64');
    } catch (error) {
      console.error('Screenshot error:', error);
      throw error;
    }
  }

  async click(x, y) {
    if (!this.isInitialized) {
      throw new Error('Browser not initialized');
    }

    try {
      await this.page.mouse.click(x, y);
      // Wait a bit for the page to respond
      await this.page.waitForTimeout(500);
      return { success: true };
    } catch (error) {
      console.error('Click error:', error);
      return { success: false, error: error.message };
    }
  }

  async type(text) {
    if (!this.isInitialized) {
      throw new Error('Browser not initialized');
    }

    try {
      await this.page.keyboard.type(text, { delay: 50 });
      return { success: true };
    } catch (error) {
      console.error('Type error:', error);
      return { success: false, error: error.message };
    }
  }

  async scroll(deltaY) {
    if (!this.isInitialized) {
      throw new Error('Browser not initialized');
    }

    try {
      await this.page.evaluate((dy) => { window.scrollBy(0, dy); }, deltaY);
      
      // Wait for scroll to complete
      await this.page.waitForTimeout(300);
      return { success: true };
    } catch (error) {
      console.error('Scroll error:', error);
      return { success: false, error: error.message };
    }
  }

  async pressKey(key) {
    if (!this.isInitialized) {
      throw new Error('Browser not initialized');
    }

    try {
      await this.page.keyboard.press(key);
      await this.page.waitForTimeout(200);
      return { success: true };
    } catch (error) {
      console.error('Press key error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPageInfo() {
    if (!this.isInitialized) {
      throw new Error('Browser not initialized');
    }

    try {
      const title = await this.page.title();
      const url = this.page.url();
      return { title, url };
    } catch (error) {
      console.error('Get page info error:', error);
      throw error;
    }
  }

  async getPageText() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      const text = await this.page.evaluate(() => document.body ? document.body.innerText || '' : '');
      const trimmed = String(text || '').trim();
      return { success: true, text: trimmed.slice(0, 50000) };
    } catch (error) {
      console.error('Get page text error:', error);
      return { success: false, error: error.message };
    }
  }

  async extractSerp(query) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      if (query && String(query).trim().length > 0) {
        const q = encodeURIComponent(String(query).trim());
        await this.navigate(`https://www.google.com/search?q=${q}`);
      }
      const results = await this.page.evaluate(() => {
        const items = [];
        const containers = document.querySelectorAll('#search .g, #search .MjjYud');
        containers.forEach((c) => {
          const a = c.querySelector('a');
          const h = c.querySelector('h3');
          const s = c.querySelector('.VwiC3b, .MUxGbd, .lyLwlc');
          const url = a && a.href ? a.href : '';
          const title = h && h.textContent ? h.textContent : '';
          const snippet = s && s.textContent ? s.textContent : '';
          if (url && title) {
            items.push({ title, url, snippet });
          }
        });
        if (items.length === 0) {
          // Fallback: generic links with headings
          document.querySelectorAll('#search a').forEach(a => {
            const url = a.href || '';
            const title = a.textContent || '';
            if (url && title) items.push({ title, url, snippet: '' });
          });
        }
        return items.slice(0, 20);
      });
      return { success: true, results };
    } catch (error) {
      console.error('Extract SERP error:', error);
      return { success: false, error: error.message };
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.isInitialized = false;
      console.log('Browser closed');
    }
  }
}

export default BrowserController;

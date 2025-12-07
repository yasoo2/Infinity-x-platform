import puppeteer from 'puppeteer';
import fs from 'fs';

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
      execCandidates.push(
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      );
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
          try {
            this.browser = await puppeteer.launch({ ...launchBase, channel: 'chrome' });
          } catch (e3) {
            const err = e3 || e2 || e1;
            console.error('Puppeteer launch failed. Consider installing Chrome via "npx puppeteer browsers install chrome" or setting PUPPETEER_EXECUTABLE_PATH.', err?.message || String(err));
            throw err;
          }
        }
      }

      this.context = await this.browser.createIncognitoBrowserContext();
      this.page = await this.context.newPage();
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

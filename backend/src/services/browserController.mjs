import { chromium } from 'playwright';
 

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
      const headless = (process.env.PLAYWRIGHT_HEADLESS_MODE || 'true') === 'true';
      const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--lang=en-US,en'
      ];
      const launchOpts = { headless, args };
      try {
        const proxyServer = process.env.PLAYWRIGHT_PROXY_SERVER || process.env.HTTP_PROXY || process.env.http_proxy || '';
        if (proxyServer) {
          const proxy = { server: proxyServer };
          const proxyUser = process.env.PLAYWRIGHT_PROXY_USERNAME || process.env.HTTP_PROXY_USERNAME || '';
          const proxyPass = process.env.PLAYWRIGHT_PROXY_PASSWORD || process.env.HTTP_PROXY_PASSWORD || '';
          if (proxyUser) proxy.username = proxyUser;
          if (proxyPass) proxy.password = proxyPass;
          launchOpts.proxy = proxy;
          console.log('🛰️ Using proxy for Playwright:', proxyServer);
        }
      } catch { /* noop */ }
      const channel = process.env.PLAYWRIGHT_CHANNEL || '';
      if (channel) launchOpts.channel = channel;
      try {
        this.browser = await chromium.launch(launchOpts);
      } catch (e1) {
        let AdvancedBrowserManager;
        try {
          const mod = await import('../browser/AdvancedBrowserManager.mjs');
          AdvancedBrowserManager = mod.default || mod.AdvancedBrowserManager;
        } catch {
          const hint = 'Playwright failed to launch. Install browsers: npx playwright install --with-deps';
          console.error('Playwright launch failed:', e1?.message || String(e1), '\nHint:', hint);
          throw new Error(hint);
        }
        const mgr = new AdvancedBrowserManager({});
        await mgr.initialize();
        const { sessionId } = await mgr.createSession();
        const session = mgr.pages.get(sessionId);
        this.browser = mgr.browser;
        this.context = null;
        this.page = session?.page;
        try { await this.page.setViewport({ width: 1280, height: 720 }); } catch { /* noop */ }
        try { this.page.setDefaultTimeout?.(15000); } catch { /* noop */ }
        try { await this.page.setExtraHTTPHeaders?.({ 'accept-language': 'en-US,en;q=0.9,ar;q=0.8' }); } catch { /* noop */ }
        try {
          const initialUrl = process.env.BROWSER_INITIAL_URL || 'about:blank';
          await this.page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch { /* noop */ }
        this.isInitialized = true;
        console.log('✅ Browser initialized successfully (puppeteer fallback via AdvancedBrowserManager)');
        return;
      }

      this.context = await this.browser.newContext({ viewport: { width: 1280, height: 720 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' });
      this.page = await this.context.newPage();
      try { this.page.setDefaultTimeout(15000); } catch { /* noop */ }
      await this.page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9,ar;q=0.8' });
      try {
        const initialUrl = process.env.BROWSER_INITIAL_URL || 'about:blank';
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
      const target = url;
      await this.page.goto(target, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      try {
        const host = new URL(target).hostname;
        if (/google\./i.test(host)) {
          await this.page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => /agree|accept|أوافق|موافقة/i.test(((b && (b.textContent || '')) + (b && (b.value || '')))));
            if (btn) btn.click();
          });
          await new Promise(r => setTimeout(r, 800));
          try { await this.page.waitForSelector('input[name="q"]', { timeout: 3000 }); } catch { /* noop */ }
        }
      } catch { /* noop */ }
      
      return { success: true, url: this.page.url() };
    } catch (error) {
      console.error('Navigation error:', error);
      return { success: false, error: error.message };
    }
  }

  async back() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      await this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 });
      return { success: true, url: this.page.url() };
    } catch (error) {
      console.error('Back navigation error:', error);
      return { success: false, error: error.message };
    }
  }

  async forward() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      await this.page.goForward({ waitUntil: 'domcontentloaded', timeout: 15000 });
      return { success: true, url: this.page.url() };
    } catch (error) {
      console.error('Forward navigation error:', error);
      return { success: false, error: error.message };
    }
  }

  async refresh() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
      return { success: true, url: this.page.url() };
    } catch (error) {
      console.error('Refresh error:', error);
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
      await new Promise(r => setTimeout(r, 500));
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
      
      await new Promise(r => setTimeout(r, 300));
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
      await new Promise(r => setTimeout(r, 200));
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
        await this.navigate(`https://www.google.com/search?q=${q}&hl=en`);
      }
      let results = await this.page.evaluate(() => {
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
      if (!Array.isArray(results) || results.length === 0) {
        try {
          const q2 = encodeURIComponent(String(query).trim());
          await this.navigate(`https://duckduckgo.com/?q=${q2}`);
          results = await this.page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.result').forEach(r => {
              const a = r.querySelector('.result__a');
              const s = r.querySelector('.result__snippet');
              const url = a && a.href ? a.href : '';
              const title = a && a.textContent ? a.textContent : '';
              const snippet = s && s.textContent ? s.textContent : '';
              if (url && title) items.push({ title, url, snippet });
            });
            return items.slice(0, 20);
          });
        } catch { /* noop */ }
      }
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
      this.page = null;
      this.context = null;
      console.log('Browser closed');
    }
  }
}

export default BrowserController;

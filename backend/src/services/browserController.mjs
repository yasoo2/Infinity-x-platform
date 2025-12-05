import puppeteer from 'puppeteer';

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
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.context = await this.browser.createIncognitoBrowserContext();
      this.page = await this.context.newPage();
      await this.page.setViewport({ width: 1280, height: 720 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      this.isInitialized = true;
      console.log('✅ Browser initialized successfully with Playwright');
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
      const screenshot = await this.page.screenshot({ type: 'jpeg', quality: 80, fullPage: false });
      
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

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.isInitialized = false;
      console.log('Browser closed');
    }
  }
}

export default BrowserController;

/**
 * AdvancedBrowserManager.mjs
 * Advanced browser automation and web interaction
 */

import puppeteer from 'puppeteer-core';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';

class AdvancedBrowserManager {
  constructor(options = {}) {
    this.browser = null;
    this.pages = new Map();
    this.browserOptions = options.browserOptions || {
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    };
    this.timeout = options.timeout || 30000;
  }

  /**
   * Initialize the browser
   */
  async initialize() {
    try {
      this.browser = await puppeteer.launch(this.browserOptions);
      console.log('✅ Advanced Browser Manager initialized');
    } catch (err) {
      console.error('❌ Failed to initialize browser:', err);
      throw err;
    }
  }

  /**
   * Create a new browser session
   */
  async createSession(sessionId = null) {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      const id = sessionId || uuidv4();
      const page = await this.browser.newPage();

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Set user agent
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      this.pages.set(id, {
        page,
        createdAt: new Date(),
        url: null,
        title: null
      });

      return { sessionId: id, status: 'ready' };
    } catch (err) {
      console.error('Failed to create browser session:', err);
      throw err;
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(sessionId, url) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      await session.page.goto(url, { waitUntil: 'networkidle2', timeout: this.timeout });

      session.url = url;
      session.title = await session.page.title();

      return {
        success: true,
        url,
        title: session.title
      };
    } catch (err) {
      console.error('Navigation failed:', err);
      throw err;
    }
  }

  /**
   * Click an element
   */
  async click(sessionId, selector) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      await session.page.click(selector);

      return { success: true, selector };
    } catch (err) {
      console.error('Click failed:', err);
      throw err;
    }
  }

  /**
   * Type text in an input field
   */
  async type(sessionId, selector, text) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      await session.page.type(selector, text);

      return { success: true, selector, text };
    } catch (err) {
      console.error('Type failed:', err);
      throw err;
    }
  }

  /**
   * Fill a form
   */
  async fillForm(sessionId, formData) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      for (const [selector, value] of Object.entries(formData)) {
        await session.page.type(selector, value);
      }

      return { success: true, fields: Object.keys(formData).length };
    } catch (err) {
      console.error('Form fill failed:', err);
      throw err;
    }
  }

  /**
   * Submit a form
   */
  async submitForm(sessionId, selector) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      await session.page.click(selector);
      await session.page.waitForNavigation({ waitUntil: 'networkidle2' });

      return { success: true, selector };
    } catch (err) {
      console.error('Form submission failed:', err);
      throw err;
    }
  }

  /**
   * Extract page content
   */
  async extractContent(sessionId) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      const html = await session.page.content();
      const $ = cheerio.load(html);

      const content = {
        title: $('title').text(),
        headings: $('h1, h2, h3').map((i, el) => $(el).text()).get(),
        paragraphs: $('p').map((i, el) => $(el).text()).get(),
        links: $('a').map((i, el) => ({
          text: $(el).text(),
          href: $(el).attr('href')
        })).get(),
        images: $('img').map((i, el) => ({
          src: $(el).attr('src'),
          alt: $(el).attr('alt')
        })).get(),
        tables: $('table').map((i, table) => {
          const rows = $(table).find('tr').map((j, tr) => {
            return $(tr).find('td, th').map((k, td) => $(td).text()).get();
          }).get();
          return rows;
        }).get()
      };

      return content;
    } catch (err) {
      console.error('Content extraction failed:', err);
      throw err;
    }
  }

  /**
   * Extract data with CSS selector
   */
  async extractData(sessionId, selector) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      const data = await session.page.$$eval(selector, elements =>
        elements.map(el => ({
          text: el.textContent,
          html: el.innerHTML,
          attributes: Array.from(el.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {})
        }))
      );

      return data;
    } catch (err) {
      console.error('Data extraction failed:', err);
      throw err;
    }
  }

  /**
   * Wait for element
   */
  async waitForElement(sessionId, selector, timeout = 30000) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      await session.page.waitForSelector(selector, { timeout });

      return { success: true, selector };
    } catch (err) {
      console.error('Wait for element failed:', err);
      throw err;
    }
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(sessionId, filePath) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      await session.page.screenshot({ path: filePath, fullPage: true });

      return { success: true, filePath };
    } catch (err) {
      console.error('Screenshot failed:', err);
      throw err;
    }
  }

  /**
   * Execute JavaScript on page
   */
  async executeScript(sessionId, script) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      const result = await session.page.evaluate(script);

      return { success: true, result };
    } catch (err) {
      console.error('Script execution failed:', err);
      throw err;
    }
  }

  /**
   * Get cookies
   */
  async getCookies(sessionId) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      const cookies = await session.page.cookies();

      return cookies;
    } catch (err) {
      console.error('Get cookies failed:', err);
      throw err;
    }
  }

  /**
   * Set cookies
   */
  async setCookies(sessionId, cookies) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      await session.page.setCookie(...cookies);

      return { success: true, count: cookies.length };
    } catch (err) {
      console.error('Set cookies failed:', err);
      throw err;
    }
  }

  /**
   * Get page metrics
   */
  async getMetrics(sessionId) {
    try {
      const session = this.pages.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      const metrics = await session.page.metrics();

      return metrics;
    } catch (err) {
      console.error('Get metrics failed:', err);
      throw err;
    }
  }

  /**
   * Close a session
   */
  async closeSession(sessionId) {
    try {
      const session = this.pages.get(sessionId);

      if (session) {
        await session.page.close();
        this.pages.delete(sessionId);
      }

      return { success: true };
    } catch (err) {
      console.error('Close session failed:', err);
      throw err;
    }
  }

  /**
   * Close all sessions
   */
  async closeAll() {
    try {
      for (const [sessionId, session] of this.pages) {
        void sessionId;
        await session.page.close();
      }

      this.pages.clear();

      if (this.browser) {
        await this.browser.close();
      }

      return { success: true, closedSessions: this.pages.size };
    } catch (err) {
      console.error('Close all failed:', err);
      throw err;
    }
  }

  /**
   * Get browser statistics
   */
  getStats() {
    return {
      activeSessions: this.pages.size,
      sessions: Array.from(this.pages.entries()).map(([id, session]) => ({
        sessionId: id,
        url: session.url,
        title: session.title,
        createdAt: session.createdAt
      }))
    };
  }
}

export default AdvancedBrowserManager;

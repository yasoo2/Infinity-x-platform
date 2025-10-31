/**
 * Browser Tool - أداة تصفح الويب لـ JOEngine AGI
 * 
 * القدرات:
 * - تصفح أي صفحة ويب
 * - تحليل محتوى الصفحات
 * - ملء النماذج
 * - النقر على العناصر
 * - استخراج البيانات
 * - أخذ لقطات شاشة
 */

import { chromium } from 'playwright';
import { BaseTool } from './ToolsSystem.mjs';

export class BrowserTool extends BaseTool {
  constructor() {
    super(
      'browser',
      'Browse web pages, analyze content, fill forms, and extract data',
      {
        action: {
          type: 'string',
          required: true,
          enum: ['navigate', 'click', 'type', 'extract', 'screenshot'],
          description: 'Action to perform'
        },
        url: {
          type: 'string',
          required: false,
          description: 'URL to navigate to (required for navigate action)'
        },
        selector: {
          type: 'string',
          required: false,
          description: 'CSS selector for element (required for click, type, extract)'
        },
        text: {
          type: 'string',
          required: false,
          description: 'Text to type (required for type action)'
        },
        waitFor: {
          type: 'number',
          required: false,
          description: 'Time to wait in milliseconds'
        }
      }
    );

    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * تهيئة المتصفح
   */
  async initialize() {
    if (this.browser) return;

    console.log('🌐 Initializing browser...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    this.page = await this.context.newPage();
    
    console.log('✅ Browser initialized');
  }

  /**
   * تنفيذ الأداة
   */
  async execute(params) {
    this.validateParams(params);
    await this.initialize();

    const { action } = params;

    switch (action) {
      case 'navigate':
        return await this.navigate(params);
      
      case 'click':
        return await this.click(params);
      
      case 'type':
        return await this.type(params);
      
      case 'extract':
        return await this.extract(params);
      
      case 'screenshot':
        return await this.screenshot(params);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * التنقل إلى صفحة
   */
  async navigate(params) {
    const { url, waitFor } = params;
    
    console.log(`🌐 Navigating to: ${url}`);
    
    await this.page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    if (waitFor) {
      await this.page.waitForTimeout(waitFor);
    }

    // استخراج معلومات الصفحة
    const title = await this.page.title();
    const content = await this.page.content();
    const text = await this.page.evaluate(() => document.body.innerText);

    return {
      success: true,
      url: this.page.url(),
      title,
      textLength: text.length,
      htmlLength: content.length
    };
  }

  /**
   * النقر على عنصر
   */
  async click(params) {
    const { selector, waitFor } = params;
    
    console.log(`👆 Clicking: ${selector}`);
    
    await this.page.click(selector);

    if (waitFor) {
      await this.page.waitForTimeout(waitFor);
    }

    return {
      success: true,
      selector
    };
  }

  /**
   * كتابة نص في حقل
   */
  async type(params) {
    const { selector, text, waitFor } = params;
    
    console.log(`⌨️  Typing into: ${selector}`);
    
    await this.page.fill(selector, text);

    if (waitFor) {
      await this.page.waitForTimeout(waitFor);
    }

    return {
      success: true,
      selector,
      text
    };
  }

  /**
   * استخراج بيانات من الصفحة
   */
  async extract(params) {
    const { selector } = params;
    
    console.log(`📊 Extracting data from: ${selector || 'page'}`);
    
    let data;

    if (selector) {
      // استخراج من عنصر محدد
      data = await this.page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) return null;

        return {
          text: element.innerText,
          html: element.innerHTML,
          attributes: Array.from(element.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {})
        };
      }, selector);
    } else {
      // استخراج من الصفحة كاملة
      data = await this.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          text: document.body.innerText,
          links: Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.innerText,
            href: a.href
          })),
          images: Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            alt: img.alt
          }))
        };
      });
    }

    return {
      success: true,
      data
    };
  }

  /**
   * أخذ لقطة شاشة
   */
  async screenshot(params) {
    const { selector } = params;
    
    console.log(`📸 Taking screenshot...`);
    
    const timestamp = Date.now();
    const filename = `/tmp/joengine-screenshot-${timestamp}.png`;

    if (selector) {
      const element = await this.page.$(selector);
      if (element) {
        await element.screenshot({ path: filename });
      }
    } else {
      await this.page.screenshot({ path: filename, fullPage: true });
    }

    return {
      success: true,
      filename
    };
  }

  /**
   * إغلاق المتصفح
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      console.log('🌐 Browser closed');
    }
  }
}

export default BrowserTool;

// backend/src/lib/browserTools.mjs - أدوات المتصفح المتقدمة
import puppeteer from 'puppeteer-core';

export class BrowserTools {
    constructor() {
        this.sessions = new Map();
    }

    async executeTask(requirements) {
        try {
            const sessionId = `browser_${Date.now()}`;
            const session = await this.createSession(sessionId);
            
            const result = await this.performBrowserTask(session, requirements);
            
            await this.closeSession(sessionId);
            
            return {
                success: true,
                result,
                message: 'Browser task completed successfully'
            };

        } catch (error) {
            console.error('❌ Browser task error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createSession(sessionId) {
        try {
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            
            const session = {
                id: sessionId,
                browser,
                page,
                startTime: new Date(),
                actions: []
            };

            this.sessions.set(sessionId, session);
            return session;

        } catch (error) {
            console.error('❌ Browser session creation error:', error);
            throw error;
        }
    }

    async performBrowserTask(session, requirements) {
        const { url, actions = [] } = requirements;
        
        if (url) {
            await session.page.goto(url, { waitUntil: 'networkidle2' });
        }

        const results = [];
        
        for (const action of actions) {
            const result = await this.executeAction(session, action);
            results.push(result);
        }

        return results;
    }

    async executeAction(session, action) {
        const { type, selector, value, options = {} } = action;

        switch (type) {
            case 'click':
                return await this.clickElement(session, selector);
            case 'type':
                return await this.typeText(session, selector, value);
            case 'screenshot':
                return await this.takeScreenshot(session, options);
            case 'extract':
                return await this.extractData(session, selector);
            case 'wait':
                return await this.waitForElement(session, selector, options.timeout);
            default:
                throw new Error(`Unknown action type: ${type}`);
        }
    }

    async clickElement(session, selector) {
        await session.page.click(selector);
        return { success: true, action: 'click', selector };
    }

    async typeText(session, selector, text) {
        await session.page.type(selector, text);
        return { success: true, action: 'type', selector, text };
    }

    async takeScreenshot(session, options = {}) {
        const screenshot = await session.page.screenshot({
            type: options.type || 'png',
            fullPage: options.fullPage || false
        });
        
        return { 
            success: true, 
            action: 'screenshot', 
            data: screenshot.toString('base64')
        };
    }

    async extractData(session, selector) {
        const data = await session.page.evaluate((sel) => {
            const elements = document.querySelectorAll(sel);
            return Array.from(elements).map(el => ({
                text: el.textContent.trim(),
                html: el.innerHTML,
                attributes: Array.from(el.attributes).reduce((acc, attr) => {
                    acc[attr.name] = attr.value;
                    return acc;
                }, {})
            }));
        }, selector);
        
        return { success: true, action: 'extract', data };
    }

    async waitForElement(session, selector, timeout = 5000) {
        await session.page.waitForSelector(selector, { timeout });
        return { success: true, action: 'wait', selector };
    }

    async closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        try {
            await session.browser.close();
            this.sessions.delete(sessionId);
        } catch (error) {
            console.error('❌ Close browser session error:', error);
        }
    }
}

export default BrowserTools;

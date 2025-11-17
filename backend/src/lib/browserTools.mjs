/**
 * 🌐 Browser Tools - أدوات المتصفح المتقدمة
 * نظام متطور للتحكم في المتصفح وأتمتة المهام
 * متوافق مع Joe Advanced Engine و Gemini Engine
 * 
 * @module BrowserTools
 * @version 2.0.0
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs/promises';
import path from 'path';

/**
 * 🎯 فئة أدوات المتصفح المتقدمة
 */
export class BrowserTools {
    constructor(options = {}) {
        this.sessions = new Map();
        this.config = {
            maxSessions: options.maxSessions || 5,
            sessionTimeout: options.sessionTimeout || 300000, // 5 دقائق
            screenshotsDir: options.screenshotsDir || './screenshots',
            defaultTimeout: options.defaultTimeout || 30000,
            headless: options.headless !== false, // true افتراضياً
            ...options
        };
        
        // 📊 إحصائيات
        this.stats = {
            totalSessions: 0,
            activeSessions: 0,
            totalActions: 0,
            errors: 0,
            startTime: new Date()
        };

        // 🔄 تنظيف دوري للجلسات المنتهية
        this.startCleanupInterval();
        
        console.log('✅ Browser Tools initialized');
    }

    /**
     * 🚀 تنفيذ مهمة متصفح كاملة
     * @param {object} requirements - متطلبات المهمة
     * @returns {Promise<object>} - نتيجة المهمة
     */
    async executeTask(requirements) {
        const startTime = Date.now();
        let sessionId = null;

        try {
            // 🔍 التحقق من المدخلات
            if (!requirements || typeof requirements !== 'object') {
                throw new Error('متطلبات المهمة غير صالحة');
            }

            // 🆔 إنشاء معرف جلسة فريد
            sessionId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            console.log(`🌐 بدء مهمة متصفح: ${sessionId}`);

            // 🔒 التحقق من عدد الجلسات النشطة
            if (this.sessions.size >= this.config.maxSessions) {
                await this.cleanupOldestSession();
            }

            // 🎯 إنشاء جلسة جديدة
            const session = await this.createSession(sessionId, requirements.sessionOptions);

            // ⚡ تنفيذ المهمة
            const result = await this.performBrowserTask(session, requirements);

            // 📊 حساب الوقت المستغرق
            const duration = Date.now() - startTime;

            // 🧹 إغلاق الجلسة
            await this.closeSession(sessionId);

            // 📈 تحديث الإحصائيات
            this.stats.totalActions += result.actions?.length || 0;

            console.log(`✅ مهمة المتصفح اكتملت في ${duration}ms`);

            return {
                success: true,
                sessionId,
                result,
                duration,
                timestamp: new Date().toISOString(),
                message: 'Browser task completed successfully'
            };

        } catch (error) {
            this.stats.errors++;
            console.error('❌ Browser task error:', error);

            // 🧹 تنظيف في حالة الخطأ
            if (sessionId) {
                await this.closeSession(sessionId).catch(console.error);
            }

            return {
                success: false,
                sessionId,
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 🎨 إنشاء جلسة متصفح جديدة
     * @param {string} sessionId - معرف الجلسة
     * @param {object} options - خيارات الجلسة
     * @returns {Promise<object>} - كائن الجلسة
     */
    async createSession(sessionId, options = {}) {
        try {
            console.log(`🔧 إنشاء جلسة متصفح: ${sessionId}`);

            // 🎯 تحديد مسار Chrome
            const executablePath = await this.getChromePath();

            // 🚀 إطلاق المتصفح
            const browser = await puppeteer.launch({
                executablePath,
                headless: this.config.headless ? 'new' : false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    ...(options.args || [])
                ],
                ignoreHTTPSErrors: true,
                defaultViewport: options.viewport || {
                    width: 1920,
                    height: 1080,
                    deviceScaleFactor: 1
                },
                timeout: this.config.defaultTimeout
            });

            // 📄 إنشاء صفحة جديدة
            const page = await browser.newPage();

            // 🎭 تعيين User Agent
            await page.setUserAgent(
                options.userAgent || 
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // 🍪 تعيين Cookies إذا وجدت
            if (options.cookies && Array.isArray(options.cookies)) {
                await page.setCookie(...options.cookies);
            }

            // 📊 تفعيل Console Logs
            page.on('console', msg => {
                if (options.logConsole) {
                    console.log(`🖥️ Browser Console [${msg.type()}]:`, msg.text());
                }
            });

            // ⚠️ معالجة الأخطاء
            page.on('error', error => {
                console.error(`❌ Page Error [${sessionId}]:`, error);
            });

            page.on('pageerror', error => {
                console.error(`❌ Page Script Error [${sessionId}]:`, error);
            });

            // 🎯 إنشاء كائن الجلسة
            const session = {
                id: sessionId,
                browser,
                page,
                startTime: new Date(),
                lastActivity: new Date(),
                actions: [],
                metadata: options.metadata || {},
                config: options
            };

            // 💾 حفظ الجلسة
            this.sessions.set(sessionId, session);
            this.stats.totalSessions++;
            this.stats.activeSessions = this.sessions.size;

            console.log(`✅ جلسة المتصفح جاهزة: ${sessionId}`);

            return session;

        } catch (error) {
            console.error('❌ Browser session creation error:', error);
            throw new Error(`فشل إنشاء جلسة المتصفح: ${error.message}`);
        }
    }

    /**
     * 🎯 الحصول على مسار Chrome
     * @returns {Promise<string>} - مسار التنفيذ
     */
    async getChromePath() {
        // 🐧 Linux / AWS Lambda
        if (process.platform === 'linux') {
            try {
                return await chromium.executablePath();
            } catch (error) {
                console.warn('⚠️ Chromium not found, using system Chrome');
            }
        }

        // 🪟 Windows
        if (process.platform === 'win32') {
            const paths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
            ];
            
            for (const path of paths) {
                try {
                    await fs.access(path);
                    return path;
                } catch {}
            }
        }

        // 🍎 macOS
        if (process.platform === 'darwin') {
            return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        }

        // 🔄 افتراضي
        return 'google-chrome-stable';
    }

    /**
     * ⚡ تنفيذ مهمة المتصفح
     * @param {object} session - الجلسة
     * @param {object} requirements - المتطلبات
     * @returns {Promise<object>} - النتائج
     */
    async performBrowserTask(session, requirements) {
        const { url, actions = [], waitForLoad = true } = requirements;

        try {
            // 🌐 الانتقال إلى الرابط
            if (url) {
                console.log(`🌐 الانتقال إلى: ${url}`);
                
                await session.page.goto(url, {
                    waitUntil: waitForLoad ? 'networkidle2' : 'domcontentloaded',
                    timeout: this.config.defaultTimeout
                });

                session.actions.push({
                    type: 'navigation',
                    url,
                    timestamp: new Date()
                });
            }

            // 📋 تنفيذ الإجراءات
            const results = [];

            for (let i = 0; i < actions.length; i++) {
                const action = actions[i];
                
                console.log(`⚡ تنفيذ إجراء ${i + 1}/${actions.length}: ${action.type}`);

                try {
                    const result = await this.executeAction(session, action);
                    results.push(result);

                    // 🔄 تحديث آخر نشاط
                    session.lastActivity = new Date();
                    session.actions.push({
                        ...action,
                        result,
                        timestamp: new Date()
                    });

                    // ⏱️ انتظار بين الإجراءات (اختياري)
                    if (action.delay) {
                        await this.delay(action.delay);
                    }

                } catch (actionError) {
                    console.error(`❌ فشل الإجراء ${i + 1}:`, actionError);
                    
                    results.push({
                        success: false,
                        action: action.type,
                        error: actionError.message
                    });

                    // 🛑 إيقاف عند الخطأ (اختياري)
                    if (action.stopOnError !== false) {
                        throw actionError;
                    }
                }
            }

            // 📊 معلومات الصفحة النهائية
            const pageInfo = await this.getPageInfo(session);

            return {
                actions: results,
                pageInfo,
                totalActions: actions.length,
                successfulActions: results.filter(r => r.success).length,
                failedActions: results.filter(r => !r.success).length
            };

        } catch (error) {
            console.error('❌ Browser task execution error:', error);
            throw error;
        }
    }

    /**
     * 🎬 تنفيذ إجراء واحد
     * @param {object} session - الجلسة
     * @param {object} action - الإجراء
     * @returns {Promise<object>} - النتيجة
     */
    async executeAction(session, action) {
        const { type, selector, value, options = {} } = action;

        // ⏱️ تعيين Timeout للإجراء
        const timeout = options.timeout || this.config.defaultTimeout;

        switch (type) {
            case 'click':
                return await this.clickElement(session, selector, options);

            case 'type':
                return await this.typeText(session, selector, value, options);

            case 'screenshot':
                return await this.takeScreenshot(session, options);

            case 'extract':
                return await this.extractData(session, selector, options);

            case 'wait':
                return await this.waitForElement(session, selector, timeout);

            case 'scroll':
                return await this.scrollPage(session, options);

            case 'evaluate':
                return await this.evaluateScript(session, value);

            case 'select':
                return await this.selectOption(session, selector, value);

            case 'hover':
                return await this.hoverElement(session, selector);

            case 'upload':
                return await this.uploadFile(session, selector, value);

            case 'download':
                return await this.downloadFile(session, selector, options);

            case 'cookies':
                return await this.manageCookies(session, options);

            case 'navigate':
                return await this.navigatePage(session, value, options);

            default:
                throw new Error(`Unknown action type: ${type}`);
        }
    }

    /**
     * 🖱️ النقر على عنصر
     */
    async clickElement(session, selector, options = {}) {
        try {
            await session.page.waitForSelector(selector, { 
                timeout: options.timeout || this.config.defaultTimeout 
            });

            if (options.scroll) {
                await session.page.evaluate((sel) => {
                    document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' });
                }, selector);
                await this.delay(500);
            }

            await session.page.click(selector, {
                button: options.button || 'left',
                clickCount: options.clickCount || 1,
                delay: options.delay || 0
            });

            return { 
                success: true, 
                action: 'click', 
                selector,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`فشل النقر على ${selector}: ${error.message}`);
        }
    }

    /**
     * ⌨️ كتابة نص
     */
    async typeText(session, selector, text, options = {}) {
        try {
            await session.page.waitForSelector(selector, { 
                timeout: options.timeout || this.config.defaultTimeout 
            });

            if (options.clear) {
                await session.page.click(selector, { clickCount: 3 });
                await session.page.keyboard.press('Backspace');
            }

            await session.page.type(selector, text, {
                delay: options.delay || 50
            });

            if (options.pressEnter) {
                await session.page.keyboard.press('Enter');
            }

            return { 
                success: true, 
                action: 'type', 
                selector, 
                text: options.hideText ? '***' : text,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`فشل الكتابة في ${selector}: ${error.message}`);
        }
    }

    /**
     * 📸 التقاط لقطة شاشة
     */
    async takeScreenshot(session, options = {}) {
        try {
            // 📁 إنشاء مجلد Screenshots
            await fs.mkdir(this.config.screenshotsDir, { recursive: true });

            const filename = options.filename || `screenshot_${Date.now()}.png`;
            const filepath = path.join(this.config.screenshotsDir, filename);

            const screenshot = await session.page.screenshot({
                path: options.saveToDisk ? filepath : undefined,
                type: options.type || 'png',
                fullPage: options.fullPage || false,
                quality: options.quality || 90,
                clip: options.clip
            });

            return { 
                success: true, 
                action: 'screenshot',
                filename,
                filepath: options.saveToDisk ? filepath : undefined,
                data: options.returnBase64 ? screenshot.toString('base64') : undefined,
                size: screenshot.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`فشل التقاط الشاشة: ${error.message}`);
        }
    }

    /**
     * 📊 استخراج بيانات
     */
    async extractData(session, selector, options = {}) {
        try {
            await session.page.waitForSelector(selector, { 
                timeout: options.timeout || this.config.defaultTimeout 
            });

            const data = await session.page.evaluate((sel, opts) => {
                const elements = document.querySelectorAll(sel);
                
                return Array.from(elements).map(el => {
                    const result = {
                        text: el.textContent?.trim() || '',
                        html: opts.includeHtml ? el.innerHTML : undefined,
                        tagName: el.tagName.toLowerCase()
                    };

                    if (opts.includeAttributes) {
                        result.attributes = Array.from(el.attributes).reduce((acc, attr) => {
                            acc[attr.name] = attr.value;
                            return acc;
                        }, {});
                    }

                    if (opts.includeStyles) {
                        const styles = window.getComputedStyle(el);
                        result.styles = {
                            display: styles.display,
                            visibility: styles.visibility,
                            position: styles.position
                        };
                    }

                    return result;
                });
            }, selector, options);

            return { 
                success: true, 
                action: 'extract', 
                selector,
                data,
                count: data.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`فشل استخراج البيانات من ${selector}: ${error.message}`);
        }
    }

    /**
     * ⏳ انتظار عنصر
     */
    async waitForElement(session, selector, timeout = 5000) {
        try {
            await session.page.waitForSelector(selector, { timeout });
            
            return { 
                success: true, 
                action: 'wait', 
                selector,
                timeout,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`انتهت مهلة انتظار ${selector}: ${error.message}`);
        }
    }

    /**
     * 📜 التمرير في الصفحة
     */
    async scrollPage(session, options = {}) {
        try {
            await session.page.evaluate((opts) => {
                if (opts.to === 'bottom') {
                    window.scrollTo(0, document.body.scrollHeight);
                } else if (opts.to === 'top') {
                    window.scrollTo(0, 0);
                } else if (opts.x !== undefined || opts.y !== undefined) {
                    window.scrollTo(opts.x || 0, opts.y || 0);
                }
            }, options);

            await this.delay(options.delay || 500);

            return { 
                success: true, 
                action: 'scroll',
                options,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`فشل التمرير: ${error.message}`);
        }
    }

    /**
     * 🔧 تنفيذ كود JavaScript
     */
    async evaluateScript(session, script) {
        try {
            const result = await session.page.evaluate(script);
            
            return { 
                success: true, 
                action: 'evaluate',
                result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`فشل تنفيذ السكريبت: ${error.message}`);
        }
    }

    /**
     * 📋 اختيار خيار من قائمة
     */
    async selectOption(session, selector, value) {
        try {
            await session.page.waitForSelector(selector);
            await session.page.select(selector, value);
            
            return { 
                success: true, 
                action: 'select',
                selector,
                value,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`فشل اختيار ${value} من ${selector}: ${error.message}`);
        }
    }

    /**
     * 🖱️ التمرير فوق عنصر
     */
    async hoverElement(session, selector) {
        try {
            await session.page.waitForSelector(selector);
            await session.page.hover(selector);
            
            return { 
                success: true, 
                action: 'hover',
                selector,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`فشل التمرير فوق ${selector}: ${error.message}`);
        }
    }

    /**
     * 📤 رفع ملف
     */
    async uploadFile(session, selector, filePath) {
        try {
            await session.page.waitForSelector(selector);
            
            const input = await session.page.$(selector);
            await input.uploadFile(filePath);
            
            return { 
                success: true, 
                action: 'upload',
                selector,
                filePath,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`فشل رفع الملف: ${error.message}`);
        }
    }

    /**
     * 🍪 إدارة Cookies
     */
    async manageCookies(session, options = {}) {
        try {
            if (options.action === 'get') {
                const cookies = await session.page.cookies();
                return { success: true, action: 'cookies', cookies };
            }
            
            if (options.action === 'set' && options.cookies) {
                await session.page.setCookie(...options.cookies);
                return { success: true, action: 'cookies', set: options.cookies.length };
            }
            
            if (options.action === 'clear') {
                const cookies = await session.page.cookies();
                await session.page.deleteCookie(...cookies);
                return { success: true, action: 'cookies', cleared: cookies.length };
            }
            
            throw new Error('Invalid cookies action');
        } catch (error) {
            throw new Error(`فشل إدارة Cookies: ${error.message}`);
        }
    }

    /**
     * 🌐 التنقل في الصفحة
     */
    async navigatePage(session, action, options = {}) {
        try {
            if (action === 'back') {
                await session.page.goBack(options);
            } else if (action === 'forward') {
                await session.page.goForward(options);
            } else if (action === 'reload') {
                await session.page.reload(options);
            }
            
            return { 
                success: true, 
                action: 'navigate',
                direction: action,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`فشل التنقل: ${error.message}`);
        }
    }

    /**
     * 📊 الحصول على معلومات الصفحة
     */
    async getPageInfo(session) {
        try {
            return await session.page.evaluate(() => ({
                url: window.location.href,
                title: document.title,
                dimensions: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    scrollHeight: document.body.scrollHeight
                },
                performance: {
                    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
                    domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
                }
            }));
        } catch (error) {
            return null;
        }
    }

    /**
     * 🧹 إغلاق جلسة
     */
    async closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`⚠️ الجلسة ${sessionId} غير موجودة`);
            return;
        }

        try {
            console.log(`🧹 إغلاق جلسة: ${sessionId}`);
            
            await session.browser.close();
            this.sessions.delete(sessionId);
            this.stats.activeSessions = this.sessions.size;
            
            console.log(`✅ تم إغلاق الجلسة: ${sessionId}`);
        } catch (error) {
            console.error('❌ Close browser session error:', error);
        }
    }

    /**
     * 🧹 تنظيف أقدم جلسة
     */
    async cleanupOldestSession() {
        if (this.sessions.size === 0) return;

        let oldestSession = null;
        let oldestTime = Date.now();

        for (const [id, session] of this.sessions) {
            if (session.lastActivity < oldestTime) {
                oldestTime = session.lastActivity;
                oldestSession = id;
            }
        }

        if (oldestSession) {
            console.log(`🧹 تنظيف أقدم جلسة: ${oldestSession}`);
            await this.closeSession(oldestSession);
        }
    }

    /**
     * 🔄 تنظيف دوري
     */
    startCleanupInterval() {
        setInterval(async () => {
            const now = Date.now();
            
            for (const [id, session] of this.sessions) {
                const age = now - session.lastActivity.getTime();
                
                if (age > this.config.sessionTimeout) {
                    console.log(`⏰ انتهت صلاحية الجلسة: ${id}`);
                    await this.closeSession(id);
                }
            }
        }, 60000); // كل دقيقة
    }

    /**
     * ⏱️ تأخير
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 📊 الحصول على الإحصائيات
     */
    getStats() {
        return {
            ...this.stats,
            activeSessions: this.sessions.size,
            uptime: Date.now() - this.stats.startTime.getTime()
        };
    }

    /**
     * 🧹 إغلاق جميع الجلسات
     */
    async closeAllSessions() {
        console.log('🧹 إغلاق جميع الجلسات...');
        
        const promises = Array.from(this.sessions.keys()).map(id => 
            this.closeSession(id)
        );
        
        await Promise.allSettled(promises);
        
        console.log('✅ تم إغلاق جميع الجلسات');
    }
}

export default BrowserTools;

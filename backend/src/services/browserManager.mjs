
import { chromium } from 'playwright';
import { getUpstashRedis } from '../utils/upstashRedis.mjs';

let browserInstance = null;
let launchPromise = null;

export async function getBrowser() {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    if (!launchPromise) {
        console.log('🚀 Launching new shared browser instance...');
        launchPromise = chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }).then(browser => {
            console.log('✅ Shared browser instance launched successfully.');
            browserInstance = browser;
            browser.on('disconnected', () => {
                console.log('⚠️ Shared browser instance disconnected.');
                browserInstance = null;
                launchPromise = null;
            });
            return browser;
        }).catch(error => {
            console.error('❌ Failed to launch shared browser instance:', error);
            launchPromise = null;
            throw error;
        });
    }

    return launchPromise;
}

/**
 * Fetches the content of a URL, using a cache to speed up repeated requests.
 * @param {string} url The URL to fetch.
 * @returns {Promise<string>} A promise that resolves to the page content.
 */
export async function getPageContent(url) {
    const redis = getUpstashRedis();
    const cacheKey = `browse:${url}`;

    if (redis) {
        try {
            const cachedContent = await redis.get(cacheKey);
            if (cachedContent) {
                console.log(`CACHE HIT: Found content for ${url} in Redis.`);
                return `(Cached Content)\n${cachedContent}`;
            }
        } catch (error) {
            console.error(`Redis GET failed for key "${cacheKey}":`, error.message);
            // Don't block the request, just proceed without cache
        }
    }

    console.log(`CACHE MISS: Fetching content for ${url} from the web.`);
    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const content = await page.content();
        if (redis) {
            try {
                await redis.set(cacheKey, content, { ex: 3600 });
                console.log(`CACHED: Stored content for ${url} in Redis.`);
            } catch (error) {
                console.error(`Redis SET failed for key "${cacheKey}":`, error.message);
            }
        }
        return content;
    } catch (e) {
        try {
            const res = await fetch(url, { headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'User-Agent': 'Mozilla/5.0 (compatible; JOE/1.0; +http://localhost)' } });
            const text = await res.text();
            if (redis) {
                try {
                    await redis.set(cacheKey, text, { ex: 3600 });
                    console.log(`CACHED (HTTP): Stored content for ${url} in Redis.`);
                } catch (error) {
                    console.error(`Redis SET failed for key "${cacheKey}":`, error.message);
                }
            }
            return text;
        } catch (e2) {
            throw e2;
        }
    } finally {
        try { if (page) await page.close(); } catch { /* noop */ }
    }
}


export async function closeBrowser() {
    if (launchPromise) {
        console.log('👋 Closing shared browser instance...');
        const browser = await getBrowser(); // Ensures we wait for launch to complete
        if (browser) {
            await browser.close();
        }
        browserInstance = null;
        launchPromise = null;
        console.log('✅ Shared browser instance closed.');
    }
}

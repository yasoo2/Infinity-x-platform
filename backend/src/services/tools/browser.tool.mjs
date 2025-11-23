
/**
 * Hyper-Digital Explorer - A state-of-the-art tool for comprehensive web browsing, analysis, and visualization.
 * Leverages Playwright for true browser rendering and Cheerio for robust content extraction.
 * @version 2.0.0 - ToolManager Compliant
 */

import { chromium } from 'playwright-core';
import * as cheerio from 'cheerio';
import { getBrowser } from '../services/browserManager.mjs';

/**
 * Fetches the full HTML of a page after dynamic content has loaded.
 * @param {string} url The URL to visit.
 * @returns {Promise<string>} The fully rendered HTML of the page.
 */
async function getFullPageHTML(url) {
    const browser = await getBrowser();
    const page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
        return await page.content();
    } finally {
        await page.close();
    }
}

async function browseWebsite({ url }) {
    try {
        const html = await getFullPageHTML(url);
        const $ = cheerio.load(html);

        // Remove non-essential tags for cleaner content extraction
        $('script, style, nav, footer, header, iframe, noscript, aside, .ad, .advertisement, [role="banner"], [role="contentinfo"]').remove();

        const title = $('title').text().trim() || $('h1').first().text().trim();
        const description = $('meta[name="description"]').attr('content') ||
                           $('meta[property="og:description"]').attr('content') || '';

        // Intelligent content extraction
        let mainContent = $('article').first().html() || $('main').first().html();
        if (!mainContent) {
            mainContent = $('body').html();
        }

        // Convert HTML to a more readable text format
        const cleanContent = cheerio.load(mainContent, { decodeEntities: true })
            .text()
            .trim()
            .replace(/\s{2,}/g, ' \n'); // Normalize whitespace

        // Extract key links
        const links = [];
        $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text().trim();
            if (href && (href.startsWith('http') || href.startsWith('/')) && text && links.length < 15) {
                try {
                    const absoluteUrl = new URL(href, url).href;
                    if (!links.some(l => l.url === absoluteUrl)) {
                       links.push({ text, url: absoluteUrl });
                    }
                } catch(e) { /* Ignore invalid URLs */ }
            }
        });

        return {
            success: true,
            url,
            title,
            description,
            content: cleanContent.substring(0, 12000), // Increased content limit
            links
        };
    } catch (error) {
        console.error(`❌ Error in browseWebsite for ${url}:`, error);
        return { success: false, error: `Failed to browse website: ${error.message}` };
    }
}
browseWebsite.metadata = {
    name: "browseWebsite",
    description: "Fetches, parses, and summarizes the content of a specific URL by rendering it in a real browser. Use this to read articles, get details from dynamic webpages, or analyze a site's content.",
    parameters: {
        type: "object",
        properties: {
            url: { type: "string", description: "The full URL of the website to browse." }
        },
        required: ["url"]
    }
};

async function screenshotWebsite({ url, fullPage = false }) {
    const browser = await getBrowser();
    const page = await browser.newPage({ deviceScaleFactor: 2 }); // Higher resolution
    try {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
        
        const screenshotBuffer = await page.screenshot({ 
            path: `screenshot-${new Date().toISOString()}.png`,
            fullPage,
            type: 'png'
        });

        return { 
            success: true, 
            message: "Screenshot saved successfully.",
            path: `screenshot-${new Date().toISOString()}.png`
        };

    } catch (error) {
        console.error(`❌ Error taking screenshot for ${url}:`, error);
        return { success: false, error: `Failed to take screenshot: ${error.message}` };
    } finally {
        await page.close();
    }
}
screenshotWebsite.metadata = {
    name: "screenshotWebsite",
    description: "Captures a screenshot of a given URL. Renders the page in a virtual browser.",
    parameters: {
        type: "object",
        properties: {
            url: { type: "string", description: "The URL to capture." },
            fullPage: { type: "boolean", description: "Whether to capture the entire scrollable page. Defaults to false." }
        },
        required: ["url"]
    }
};


export default { browseWebsite, screenshotWebsite };


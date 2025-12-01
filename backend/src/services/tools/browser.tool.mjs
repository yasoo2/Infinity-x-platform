
import { getPageContent, getBrowser } from '../browserManager.mjs';
import * as cheerio from 'cheerio';


async function browseWebsite({ url }) {
    try {
        // Use the new caching mechanism
        const html = await getPageContent(url);
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
                } catch { /* Ignore invalid URLs */ }
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
    const page = await browser.newPage({ deviceScaleFactor: 1.5 }); // Adjusted for balance
    try {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
        
        // Capture the screenshot directly into a buffer
        const screenshotBuffer = await page.screenshot({ 
            fullPage,
            type: 'png'
        });

        // Convert to Base64 and return it, giving the AI vision
        const base64Image = screenshotBuffer.toString('base64');

        return { 
            success: true, 
            message: "Screenshot captured successfully and returned as Base64.",
            base64Image: base64Image
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
    description: "Captures a screenshot of a given URL and returns it as a Base64 encoded string. This allows for visual analysis of the webpage.",
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

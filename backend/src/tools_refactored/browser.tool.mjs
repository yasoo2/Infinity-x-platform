/**
 * Browser Tool - A unified tool for advanced website browsing and analysis.
 * Combines capabilities for fetching, parsing, and understanding web content.
 * @version 1.0.0 - ToolManager Compliant
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

async function browseWebsite({ url }) {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      timeout: 15000
    });
    const $ = cheerio.load(response.data);

    // Remove non-essential tags for cleaner content extraction
    $('script, style, nav, footer, header, iframe, noscript, aside, .ad, .advertisement').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim();
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    
    // Extract main content, attempting to find the most relevant container
    let mainContent = $('article').first().text() || $('main').first().text();
    if (!mainContent) {
        mainContent = $('body').text();
    }
    const cleanContent = mainContent.trim().replace(/\s{2,}/g, ' \n'); // Normalize whitespace

    // Extract key links
    const links = [];
    $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        if (href && href.startsWith('http') && text && links.length < 10) {
            links.push({ text, url: new URL(href, url).href });
        }
    });

    return {
      success: true,
      url,
      title,
      description,
      content: cleanContent.substring(0, 8000), // Limit content size
      links
    };
  } catch (error) {
    return { success: false, error: `Failed to browse website: ${error.message}` };
  }
}
browseWebsite.metadata = {
    name: "browseWebsite",
    description: "Fetches, parses, and summarizes the main content of a specific URL. Use this to read an article, get details from a webpage, or analyze a site's content.",
    parameters: {
        type: "object",
        properties: {
            url: { type: "string", description: "The full URL of the website to browse." }
        },
        required: ["url"]
    }
};

async function findOnPage({ url, query }) {
    try {
        const result = await browseWebsite({ url });
        if (!result.success) return result;

        const queryLower = query.toLowerCase();
        const paragraphs = result.content.split('\n').filter(p => p.toLowerCase().includes(queryLower));
        
        if (paragraphs.length > 0) {
            return { success: true, query, url, results: paragraphs };
        } else {
            return { success: false, message: `Could not find "${query}" on the page.` };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}
findOnPage.metadata = {
    name: "findOnPage",
    description: "Finds specific information or text on a single webpage.",
    parameters: {
        type: "object",
        properties: {
            url: { type: "string", description: "The URL of the page to search on." },
            query: { type: "string", description: "The text to find on the page." }
        },
        required: ["url", "query"]
    }
};


export default { browseWebsite, findOnPage };

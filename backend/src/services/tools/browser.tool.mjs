
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


function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const list = u.searchParams.get('list');
      void list;
      const paths = u.pathname.split('/').filter(Boolean);
      const last = paths.pop();
      if (u.pathname.startsWith('/shorts/') && last) return last;
    }
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return id;
    }
  } catch { /* noop */ }
  return null;
}

async function fetchYouTubeTranscript(videoId) {
  const endpoints = [
    `https://youtubetranscript.com/?server_vid2=${encodeURIComponent(videoId)}`,
    `https://youtubetranscript.com/?server_vid2=${encodeURIComponent(videoId)}&lang=en`,
    `https://youtubetranscript.com/?server_vid2=${encodeURIComponent(videoId)}&lang=ar`
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { headers: { 'Accept': 'application/json, text/xml;q=0.9, */*;q=0.8' } });
      const ct = String(res.headers.get('content-type') || '');
      if (ct.includes('application/json')) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (Array.isArray(data?.transcript) ? data.transcript : []);
        const text = items.map(x => x.text).join(' ').trim();
        if (text) return text;
      } else {
        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });
        const text = $('text').map((_, el) => $(el).text()).get().join(' ').trim();
        if (text) return text;
      }
    } catch { /* try next */ }
  }
  return '';
}

function detectLang(str) {
  const s = String(str || '');
  const hasArabic = /[\u0600-\u06FF]/.test(s);
  return hasArabic ? 'ar' : 'en';
}

export default (dependencies) => {
  void dependencies;
  async function analyzeVideoFromUrl({ url, targetLanguage }) {
    try {
      const u = String(url || '').trim();
      if (!u) return { success: false, error: 'URL_REQUIRED' };
      const youId = extractYouTubeId(u);
      let transcript = '';
      let source = '';
      let title = '';
      if (youId) {
        transcript = await fetchYouTubeTranscript(youId);
        source = 'youtube';
        try {
          const page = await browseWebsite({ url: u });
          title = page?.title || '';
        } catch { title = ''; }
      } else if (/\.(mp4|webm|m4v|mov)(\?|$)/i.test(u)) {
        source = 'direct';
      } else if (/(vimeo\.com)/i.test(u)) {
        source = 'vimeo';
      } else {
        source = 'unknown';
      }
      const lang = String(targetLanguage || detectLang(transcript)).toLowerCase();
      return { success: true, source, title, transcript, language: lang };
    } catch (e) {
      return { success: false, error: e?.message || String(e) };
    }
  }
  analyzeVideoFromUrl.metadata = {
    name: 'analyzeVideoFromUrl',
    description: 'Extract transcript and metadata from a video URL (YouTube supported).',
    parameters: { type: 'object', properties: { url: { type: 'string' }, targetLanguage: { type: 'string' } }, required: ['url'] }
  };

  return { browseWebsite, screenshotWebsite, analyzeVideoFromUrl };
};

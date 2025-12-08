
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

async function simplifyDomOutline({ url }) {
  try {
    const html = await getPageContent(url);
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, iframe, noscript, aside, .ad, .advertisement, [role="banner"], [role="contentinfo"]').remove();
    const headings = [];
    $('h1, h2, h3').each((i, el) => {
      const tag = el.tagName?.toLowerCase?.() || (el.name || '').toLowerCase();
      const text = $(el).text().trim();
      if (text) headings.push({ tag, text });
    });
    const forms = [];
    $('form').each((i, f) => {
      const inputs = [];
      $(f).find('input, textarea, select, button').each((j, el) => {
        const name = $(el).attr('name') || '';
        const type = $(el).attr('type') || (el.tagName || el.name || '').toLowerCase();
        const placeholder = $(el).attr('placeholder') || '';
        const label = $(el).closest('label').text().trim() || '';
        inputs.push({ type, name, label, placeholder });
      });
      forms.push({ inputsCount: inputs.length, inputs });
    });
    const links = [];
    $('a[href]').slice(0, 30).each((i, a) => {
      const href = $(a).attr('href');
      const text = $(a).text().trim();
      if (href && text) {
        try { links.push({ text, url: new URL(href, url).href }); } catch { /* noop */ }
      }
    });
    return { success: true, url, headings, forms, links };
  } catch (error) {
    return { success: false, error: error?.message || String(error) };
  }
}
simplifyDomOutline.metadata = {
  name: 'simplifyDomOutline',
  description: 'Simplify DOM to an outline of headings, forms, and primary links for planning actions.',
  parameters: { type: 'object', properties: { url: { type: 'string', description: 'Target page URL' } }, required: ['url'] }
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

function splitSentences(str, lang) {
  const s = String(str || '').trim();
  if (!s) return [];
  const re = lang === 'ar' ? /[.!؟…]+\s+/ : /[.!?]+\s+/;
  return s.split(re).map(x => x.trim()).filter(x => x.length > 1);
}

function tokenize(str, lang) {
  const s = String(str || '').toLowerCase();
  const re = lang === 'ar' ? /[\u0600-\u06FF]+/g : /[a-z]+/g;
  return s.match(re) || [];
}

function getStopwords(lang) {
  if (lang === 'ar') return ['و','في','على','من','الى','إلى','عن','مع','أن','إن','كان','كانت','هو','هي','هذا','هذه','ذلك','الى','لكن','او','أو'];
  return ['the','a','an','and','or','to','of','in','on','for','with','is','are','was','were','be','been','it','that','this','but'];
}

function getLexicon(lang) {
  if (lang === 'ar') {
    return {
      pos: ['جيد','رائع','ممتاز','جميل','احب','أحب','سعيد','نجاح','تفوق','ايجابي','إيجابي','مبهج','مفرح'],
      neg: ['سيء','رديء','كريه','اكره','أكره','حزين','فشل','خسارة','سلبي','غاضب','مشكلة','كارثي','ضعيف']
    };
  }
  return {
    pos: ['good','great','excellent','amazing','love','like','happy','success','win','positive','nice','pleasant'],
    neg: ['bad','terrible','awful','hate','sad','fail','loss','negative','angry','problem','poor']
  };
}

function computeSentiment(str, lang) {
  const tokens = tokenize(str, lang);
  if (!tokens.length) return { score: 0, positive: 0, negative: 0 };
  const { pos, neg } = getLexicon(lang);
  let p = 0, n = 0;
  for (const t of tokens) {
    if (pos.includes(t)) p += 1;
    if (neg.includes(t)) n += 1;
  }
  const denom = Math.max(tokens.length, 1);
  const score = Math.max(-1, Math.min(1, (p - n) / denom));
  return { score: Number(score.toFixed(3)), positive: p, negative: n };
}

function extractKeywords(str, lang, topN = 12) {
  const stop = new Set(getStopwords(lang));
  const tokens = tokenize(str, lang).filter(t => !stop.has(t));
  const freq = new Map();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  const arr = Array.from(freq.entries()).sort((a,b) => b[1]-a[1]).slice(0, topN);
  return arr.map(([term,count]) => ({ term, count }));
}

function makeScenes(sentences, size = 5, maxScenes = 30) {
  const scenes = [];
  if (!Array.isArray(sentences) || !sentences.length) return scenes;
  for (let i = 0; i < sentences.length && scenes.length < maxScenes; i += size) {
    const chunk = sentences.slice(i, i + size);
    scenes.push({ index: scenes.length, startSentence: i, endSentence: Math.min(i + size - 1, sentences.length - 1), text: chunk.join(' ') });
  }
  return scenes;
}

export default (dependencies) => {
  void dependencies;
  async function analyzeVideoFromUrl({ url, targetLanguage, sceneSize = 5, maxScenes = 30 }) {
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
      const sentences = splitSentences(transcript, lang);
      const scenes = makeScenes(sentences, Number(sceneSize) || 5, Number(maxScenes) || 30);
      const kw = extractKeywords(transcript, lang);
      const overallSentiment = computeSentiment(transcript, lang);
      const scenesDetailed = scenes.map(s => ({ ...s, sentiment: computeSentiment(s.text, lang) }));
      return { success: true, source, title, transcript, language: lang, sentencesCount: sentences.length, keywords: kw, sentiment: overallSentiment, scenes: scenesDetailed };
    } catch (e) {
      return { success: false, error: e?.message || String(e) };
    }
  }
  analyzeVideoFromUrl.metadata = {
    name: 'analyzeVideoFromUrl',
    description: 'Analyze video URL to extract transcript, scenes, keywords, and sentiment.',
    parameters: { type: 'object', properties: { url: { type: 'string' }, targetLanguage: { type: 'string' }, sceneSize: { type: 'integer' }, maxScenes: { type: 'integer' } }, required: ['url'] }
  };

  return { browseWebsite, screenshotWebsite, analyzeVideoFromUrl, simplifyDomOutline };
};

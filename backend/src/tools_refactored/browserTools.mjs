/**
 * Browser Tools - أدوات تصفح المواقع
 * يوفر قدرات تصفح المواقع وجمع المعلومات لـ JOE
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * تصفح موقع ويب وجمع المعلومات منه
 */
export async function browseWebsite(url) {
  try {
    console.log(`🌐 Browsing: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // استخراج المعلومات الأساسية
    const title = $('title').text() || $('h1').first().text() || 'No title';
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       'No description';

    // استخراج النصوص الرئيسية
    const paragraphs = [];
    $('p').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 50) {
        paragraphs.push(text);
      }
    });

    // استخراج العناوين
    const headings = [];
    $('h1, h2, h3').each((i, elem) => {
      headings.push($(elem).text().trim());
    });

    // استخراج الروابط
    const links = [];
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      if (href && text) {
        links.push({ text, href });
      }
    });

    return {
      success: true,
      url,
      title,
      description,
      headings: headings.slice(0, 10),
      paragraphs: paragraphs.slice(0, 5),
      links: links.slice(0, 10),
      contentLength: response.data.length
    };

  } catch (error) {
    console.error('Browse website error:', error.message);
    return {
      success: false,
      error: error.message,
      url
    };
  }
}

/**
 * البحث عن معلومات محددة في صفحة ويب
 */
export async function extractInfo(url, query) {
  try {
    const browseResult = await browseWebsite(url);
    
    if (!browseResult.success) {
      return browseResult;
    }

    // البحث عن المعلومات المطلوبة في المحتوى
    const queryLower = query.toLowerCase();
    const relevantParagraphs = browseResult.paragraphs.filter(p => 
      p.toLowerCase().includes(queryLower)
    );

    return {
      success: true,
      url,
      query,
      title: browseResult.title,
      relevantInfo: relevantParagraphs.length > 0 ? relevantParagraphs : browseResult.paragraphs.slice(0, 3),
      allParagraphs: browseResult.paragraphs
    };

  } catch (error) {
    console.error('Extract info error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * البحث في عدة مواقع ومقارنة النتائج
 */
export async function multiSiteBrowse(urls) {
  try {
    const results = await Promise.all(
      urls.map(url => browseWebsite(url))
    );

    return {
      success: true,
      count: results.length,
      results: results.filter(r => r.success)
    };

  } catch (error) {
    console.error('Multi-site browse error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export const browserTools = {
  browseWebsite,
  extractInfo,
  multiSiteBrowse
};

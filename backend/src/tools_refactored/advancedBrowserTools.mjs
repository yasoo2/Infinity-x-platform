/**
 * Advanced Browser Tools - أدوات تصفح متقدمة
 * أدوات قوية للوصول الكامل للإنترنت مثل Manus AI
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * تصفح موقع ويب بشكل متقدم مع استخراج شامل
 */
export async function advancedBrowse(url, options = {}) {
  try {
    const {
      extractImages = true,
      extractScripts = false,
      extractStyles = false,
      followLinks = false,
      maxDepth = 1
    } = options;

    console.log(`🌐 Advanced browsing: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // استخراج معلومات Meta الكاملة
    const metadata = {
      title: $('title').text() || $('h1').first().text(),
      description: $('meta[name="description"]').attr('content') || 
                   $('meta[property="og:description"]').attr('content'),
      keywords: $('meta[name="keywords"]').attr('content'),
      author: $('meta[name="author"]').attr('content'),
      ogImage: $('meta[property="og:image"]').attr('content'),
      canonical: $('link[rel="canonical"]').attr('href'),
      language: $('html').attr('lang') || 'en'
    };

    // استخراج جميع العناوين بترتيب هرمي
    const structure = [];
    $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
      structure.push({
        level: elem.name,
        text: $(elem).text().trim(),
        id: $(elem).attr('id')
      });
    });

    // استخراج المحتوى النصي الكامل
    const content = {
      paragraphs: [],
      lists: [],
      tables: [],
      quotes: []
    };

    // الفقرات
    $('p').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 20) {
        content.paragraphs.push(text);
      }
    });

    // القوائم
    $('ul, ol').each((i, elem) => {
      const items = [];
      $(elem).find('li').each((j, li) => {
        items.push($(li).text().trim());
      });
      if (items.length > 0) {
        content.lists.push({
          type: elem.name,
          items
        });
      }
    });

    // الجداول
    $('table').each((i, elem) => {
      const headers = [];
      const rows = [];
      
      $(elem).find('th').each((j, th) => {
        headers.push($(th).text().trim());
      });
      
      $(elem).find('tr').each((j, tr) => {
        const cells = [];
        $(tr).find('td').each((k, td) => {
          cells.push($(td).text().trim());
        });
        if (cells.length > 0) {
          rows.push(cells);
        }
      });
      
      if (headers.length > 0 || rows.length > 0) {
        content.tables.push({ headers, rows });
      }
    });

    // الاقتباسات
    $('blockquote').each((i, elem) => {
      content.quotes.push($(elem).text().trim());
    });

    // استخراج الروابط مع التصنيف
    const links = {
      internal: [],
      external: [],
      navigation: [],
      resources: []
    };

    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      
      if (href && text) {
        const link = { text, href };
        
        if (href.startsWith('http')) {
          if (href.includes(new URL(url).hostname)) {
            links.internal.push(link);
          } else {
            links.external.push(link);
          }
        } else if (href.startsWith('#')) {
          links.navigation.push(link);
        } else {
          links.resources.push(link);
        }
      }
    });

    // استخراج الصور
    const images = [];
    if (extractImages) {
      $('img').each((i, elem) => {
        const src = $(elem).attr('src');
        const alt = $(elem).attr('alt');
        if (src) {
          images.push({
            src: src.startsWith('http') ? src : new URL(src, url).href,
            alt: alt || 'No alt text',
            width: $(elem).attr('width'),
            height: $(elem).attr('height')
          });
        }
      });
    }

    // استخراج النصوص البرمجية
    const scripts = [];
    if (extractScripts) {
      $('script').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src) {
          scripts.push(src);
        }
      });
    }

    // تحليل البنية
    const analysis = {
      hasNavigation: $('nav').length > 0,
      hasFooter: $('footer').length > 0,
      hasHeader: $('header').length > 0,
      hasSidebar: $('aside').length > 0,
      formCount: $('form').length,
      buttonCount: $('button').length,
      videoCount: $('video').length,
      audioCount: $('audio').length,
      iframeCount: $('iframe').length
    };

    return {
      success: true,
      url,
      metadata,
      structure,
      content,
      links,
      images: images.slice(0, 20),
      scripts: extractScripts ? scripts : undefined,
      analysis,
      stats: {
        totalParagraphs: content.paragraphs.length,
        totalLinks: Object.values(links).flat().length,
        totalImages: images.length,
        contentSize: response.data.length,
        loadTime: response.headers['x-response-time'] || 'N/A'
      }
    };

  } catch (error) {
    console.error('Advanced browse error:', error.message);
    return {
      success: false,
      error: error.message,
      url
    };
  }
}

/**
 * البحث الذكي في محتوى الصفحة
 */
export async function intelligentSearch(url, query) {
  try {
    const browseResult = await advancedBrowse(url);
    
    if (!browseResult.success) {
      return browseResult;
    }

    const queryLower = query.toLowerCase();
    const results = {
      exactMatches: [],
      partialMatches: [],
      relatedContent: []
    };

    // البحث في الفقرات
    browseResult.content.paragraphs.forEach(p => {
      const pLower = p.toLowerCase();
      if (pLower.includes(queryLower)) {
        if (pLower.split(' ').includes(queryLower)) {
          results.exactMatches.push({ type: 'paragraph', content: p });
        } else {
          results.partialMatches.push({ type: 'paragraph', content: p });
        }
      }
    });

    // البحث في العناوين
    browseResult.structure.forEach(h => {
      const hLower = h.text.toLowerCase();
      if (hLower.includes(queryLower)) {
        results.exactMatches.push({ type: 'heading', level: h.level, content: h.text });
      }
    });

    // البحث في القوائم
    browseResult.content.lists.forEach(list => {
      list.items.forEach(item => {
        if (item.toLowerCase().includes(queryLower)) {
          results.partialMatches.push({ type: 'list', content: item });
        }
      });
    });

    return {
      success: true,
      url,
      query,
      results,
      totalMatches: results.exactMatches.length + results.partialMatches.length
    };

  } catch (error) {
    console.error('Intelligent search error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تصفح متعدد المواقع مع المقارنة
 */
export async function compareSites(urls, comparisonPoints = []) {
  try {
    console.log(`🔍 Comparing ${urls.length} sites...`);

    const results = await Promise.all(
      urls.map(url => advancedBrowse(url))
    );

    const comparison = {
      sites: results.filter(r => r.success).map(r => ({
        url: r.url,
        title: r.metadata.title,
        contentSize: r.stats.contentSize,
        paragraphCount: r.stats.totalParagraphs,
        linkCount: r.stats.totalLinks,
        imageCount: r.stats.totalImages,
        hasNavigation: r.analysis.hasNavigation,
        language: r.metadata.language
      })),
      summary: {
        totalSites: urls.length,
        successfulScans: results.filter(r => r.success).length,
        failedScans: results.filter(r => !r.success).length
      }
    };

    return {
      success: true,
      comparison
    };

  } catch (error) {
    console.error('Compare sites error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * مراقبة التغييرات في موقع
 */
export async function monitorWebsite(url, previousData = null) {
  try {
    const currentData = await advancedBrowse(url);
    
    if (!currentData.success) {
      return currentData;
    }

    if (!previousData) {
      return {
        success: true,
        message: 'First scan completed',
        data: currentData
      };
    }

    const changes = {
      titleChanged: currentData.metadata.title !== previousData.metadata.title,
      contentSizeChanged: currentData.stats.contentSize !== previousData.stats.contentSize,
      paragraphCountChanged: currentData.stats.totalParagraphs !== previousData.stats.totalParagraphs,
      newLinks: currentData.stats.totalLinks - previousData.stats.totalLinks,
      newImages: currentData.stats.totalImages - previousData.stats.totalImages
    };

    return {
      success: true,
      url,
      changes,
      hasChanges: Object.values(changes).some(v => v !== 0 && v !== false),
      currentData
    };

  } catch (error) {
    console.error('Monitor website error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export const advancedBrowserTools = {
  advancedBrowse,
  intelligentSearch,
  compareSites,
  monitorWebsite
};

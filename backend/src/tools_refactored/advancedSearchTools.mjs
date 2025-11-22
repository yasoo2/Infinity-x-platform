/**
 * Advanced Search Tools - أدوات بحث متقدمة وسريعة
 * محرك بحث ذكي مثل Manus AI
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * البحث المتقدم في الإنترنت
 */
export async function advancedWebSearch(query, options = {}) {
  try {
    const {
      maxResults = 10,
      language = 'ar',
      region = 'sa',
      timeRange = 'any' // any, day, week, month, year
    } = options;

    console.log(`🔍 Advanced search: "${query}"`);

    // استخدام عدة محركات بحث
    const searchEngines = [
      {
        name: 'DuckDuckGo',
        url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        parser: parseDuckDuckGo
      }
    ];

    const allResults = [];

    for (const engine of searchEngines) {
      try {
        const response = await axios.get(engine.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        const results = engine.parser(response.data);
        allResults.push(...results);
      } catch (error) {
        console.error(`${engine.name} search failed:`, error.message);
      }
    }

    // إزالة التكرارات
    const uniqueResults = [];
    const seenUrls = new Set();

    for (const result of allResults) {
      if (!seenUrls.has(result.url)) {
        seenUrls.add(result.url);
        uniqueResults.push(result);
      }
    }

    return {
      success: true,
      query,
      results: uniqueResults.slice(0, maxResults),
      totalResults: uniqueResults.length,
      searchEngines: searchEngines.map(e => e.name)
    };

  } catch (error) {
    console.error('Advanced web search error:', error.message);
    return {
      success: false,
      error: error.message,
      query
    };
  }
}

/**
 * تحليل نتائج DuckDuckGo
 */
function parseDuckDuckGo(html) {
  const $ = cheerio.load(html);
  const results = [];

  $('.result').each((i, elem) => {
    const title = $(elem).find('.result__title').text().trim();
    const url = $(elem).find('.result__url').attr('href');
    const snippet = $(elem).find('.result__snippet').text().trim();

    if (title && url) {
      results.push({
        title,
        url,
        snippet,
        source: 'DuckDuckGo'
      });
    }
  });

  return results;
}

/**
 * البحث الذكي مع تحليل النتائج
 */
export async function intelligentWebSearch(query, context = '') {
  try {
    console.log(`🧠 Intelligent search: "${query}"`);

    // البحث الأساسي
    const searchResults = await advancedWebSearch(query, { maxResults: 5 });

    if (!searchResults.success) {
      return searchResults;
    }

    // تحليل النتائج وتصنيفها
    const analyzedResults = [];

    for (const result of searchResults.results) {
      const analysis = {
        ...result,
        relevanceScore: calculateRelevance(result, query, context),
        category: categorizeResult(result),
        keyPoints: extractKeyPoints(result.snippet)
      };
      analyzedResults.push(analysis);
    }

    // ترتيب حسب الصلة
    analyzedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      success: true,
      query,
      context,
      results: analyzedResults,
      summary: generateSummary(analyzedResults)
    };

  } catch (error) {
    console.error('Intelligent web search error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * حساب درجة الصلة
 */
function calculateRelevance(result, query, context) {
  let score = 0;
  const queryWords = query.toLowerCase().split(' ');
  const titleLower = result.title.toLowerCase();
  const snippetLower = result.snippet.toLowerCase();

  // التطابق في العنوان (وزن أعلى)
  queryWords.forEach(word => {
    if (titleLower.includes(word)) score += 3;
    if (snippetLower.includes(word)) score += 1;
  });

  // التطابق مع السياق
  if (context) {
    const contextWords = context.toLowerCase().split(' ');
    contextWords.forEach(word => {
      if (titleLower.includes(word) || snippetLower.includes(word)) {
        score += 0.5;
      }
    });
  }

  return score;
}

/**
 * تصنيف النتيجة
 */
function categorizeResult(result) {
  const url = result.url.toLowerCase();
  const title = result.title.toLowerCase();

  if (url.includes('github') || title.includes('github')) return 'code';
  if (url.includes('stackoverflow')) return 'technical';
  if (url.includes('wikipedia') || url.includes('wiki')) return 'reference';
  if (url.includes('youtube') || url.includes('video')) return 'video';
  if (url.includes('blog') || title.includes('blog')) return 'blog';
  if (url.includes('news')) return 'news';
  if (url.includes('docs') || url.includes('documentation')) return 'documentation';

  return 'general';
}

/**
 * استخراج النقاط الرئيسية
 */
function extractKeyPoints(snippet) {
  const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 10);
  return sentences.slice(0, 2).map(s => s.trim());
}

/**
 * توليد ملخص للنتائج
 */
function generateSummary(results) {
  const categories = {};
  results.forEach(r => {
    categories[r.category] = (categories[r.category] || 0) + 1;
  });

  return {
    totalResults: results.length,
    topResult: results[0],
    categories,
    averageRelevance: results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length
  };
}

/**
 * البحث المتوازي في عدة استعلامات
 */
export async function parallelSearch(queries) {
  try {
    console.log(`⚡ Parallel search for ${queries.length} queries`);

    const results = await Promise.all(
      queries.map(query => advancedWebSearch(query, { maxResults: 5 }))
    );

    return {
      success: true,
      queries,
      results: results.filter(r => r.success),
      totalQueries: queries.length,
      successfulQueries: results.filter(r => r.success).length
    };

  } catch (error) {
    console.error('Parallel search error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * البحث العميق - البحث ثم تصفح النتائج
 */
export async function deepSearch(query, maxDepth = 3) {
  try {
    console.log(`🔬 Deep search: "${query}" (depth: ${maxDepth})`);

    // المرحلة 1: البحث
    const searchResults = await advancedWebSearch(query, { maxResults: maxDepth });

    if (!searchResults.success) {
      return searchResults;
    }

    // المرحلة 2: تصفح أفضل النتائج
    const { advancedBrowse } = await import('./advancedBrowserTools.mjs');
    
    const detailedResults = [];
    for (const result of searchResults.results.slice(0, maxDepth)) {
      try {
        const browseResult = await advancedBrowse(result.url);
        if (browseResult.success) {
          detailedResults.push({
            ...result,
            fullContent: browseResult
          });
        }
      } catch (error) {
        console.error(`Failed to browse ${result.url}:`, error.message);
      }
    }

    return {
      success: true,
      query,
      searchResults: searchResults.results,
      detailedResults,
      depth: maxDepth
    };

  } catch (error) {
    console.error('Deep search error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export const advancedSearchTools = {
  advancedWebSearch,
  intelligentWebSearch,
  parallelSearch,
  deepSearch
};

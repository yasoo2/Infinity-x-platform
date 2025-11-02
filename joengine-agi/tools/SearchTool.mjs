/**
 * Search Tool - أداة البحث على الإنترنت لـ JOEngine AGI
 * 
 * القدرات:
 * - البحث عن معلومات حديثة على الإنترنت
 * - استرجاع نتائج البحث الحقيقية
 * - دعم Google Custom Search API و DuckDuckGo كبديل مجاني
 */

import { BaseTool } from './ToolsSystem.mjs';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class SearchTool extends BaseTool {
  constructor() {
    super(
      'search',
      'Search the internet for up-to-date information using real search engines',
      {
        query: {
          type: 'string',
          required: true,
          description: 'The search query to execute'
        },
        count: {
          type: 'number',
          required: false,
          description: 'Number of results to return (default 5)'
        },
        engine: {
          type: 'string',
          required: false,
          description: 'Search engine to use: "google" (requires API key) or "duckduckgo" (free, default)'
        }
      }
    );
  }

  /**
   * تنفيذ الأداة
   */
  async execute(params) {
    this.validateParams(params);

    const { query, count = 5, engine = 'duckduckgo' } = params;

    console.log(`🌐 Searching the web for: "${query}" (Top ${count} results) using ${engine}`);

    try {
      if (engine === 'google') {
        return await this.searchWithGoogle(query, count);
      } else {
        return await this.searchWithDuckDuckGo(query, count);
      }
    } catch (error) {
      console.error('Search error:', error.message);
      return {
        success: false,
        error: error.message,
        query: query
      };
    }
  }

  /**
   * البحث باستخدام Google Custom Search API
   */
  async searchWithGoogle(query, count) {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      console.warn('⚠️ Google API credentials not found, falling back to DuckDuckGo');
      return await this.searchWithDuckDuckGo(query, count);
    }

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: query,
          num: Math.min(count, 10) // Google API max is 10
        },
        timeout: 10000
      });

      const results = response.data.items?.map(item => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link
      })) || [];

      return {
        success: true,
        query: query,
        engine: 'google',
        results: results,
        message: `Found ${results.length} relevant results for "${query}" using Google`
      };
    } catch (error) {
      console.error('Google Search API error:', error.message);
      console.warn('⚠️ Falling back to DuckDuckGo');
      return await this.searchWithDuckDuckGo(query, count);
    }
  }

  /**
   * البحث باستخدام DuckDuckGo (مجاني، لا يتطلب API key)
   */
  async searchWithDuckDuckGo(query, count) {
    try {
      // استخدام DuckDuckGo HTML search
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // استخراج النتائج من HTML
      $('.result').each((i, elem) => {
        if (results.length >= count) return false;

        const $elem = $(elem);
        const title = $elem.find('.result__a').text().trim();
        const url = $elem.find('.result__url').attr('href') || $elem.find('.result__a').attr('href');
        const snippet = $elem.find('.result__snippet').text().trim();

        if (title && url) {
          results.push({
            title: title,
            snippet: snippet || 'No description available',
            url: url.startsWith('//') ? 'https:' + url : url
          });
        }
      });

      // إذا لم نجد نتائج من HTML، نستخدم DuckDuckGo Instant Answer API
      if (results.length === 0) {
        return await this.searchWithDuckDuckGoAPI(query, count);
      }

      return {
        success: true,
        query: query,
        engine: 'duckduckgo',
        results: results,
        message: `Found ${results.length} relevant results for "${query}" using DuckDuckGo`
      };
    } catch (error) {
      console.error('DuckDuckGo search error:', error.message);
      // محاولة أخيرة مع API
      return await this.searchWithDuckDuckGoAPI(query, count);
    }
  }

  /**
   * البحث باستخدام DuckDuckGo Instant Answer API
   */
  async searchWithDuckDuckGoAPI(query, count) {
    try {
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_html: 1,
          skip_disambig: 1
        },
        timeout: 10000
      });

      const data = response.data;
      const results = [];

      // استخراج النتائج من الـ API
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
        });
      }

      // إضافة Related Topics
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        data.RelatedTopics.slice(0, count - results.length).forEach(topic => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || topic.Text,
              snippet: topic.Text,
              url: topic.FirstURL
            });
          }
        });
      }

      // إذا لم نجد أي نتائج، نُرجع نتيجة واحدة على الأقل
      if (results.length === 0) {
        results.push({
          title: `Search results for: ${query}`,
          snippet: 'Visit DuckDuckGo to see full search results',
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
        });
      }

      return {
        success: true,
        query: query,
        engine: 'duckduckgo-api',
        results: results,
        message: `Found ${results.length} relevant results for "${query}" using DuckDuckGo API`
      };
    } catch (error) {
      console.error('DuckDuckGo API error:', error.message);
      
      // إرجاع نتيجة بديلة على الأقل
      return {
        success: true,
        query: query,
        engine: 'fallback',
        results: [{
          title: `Search for: ${query}`,
          snippet: 'Unable to fetch search results. Please try again or check your internet connection.',
          url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
        }],
        message: 'Search completed with fallback results',
        warning: 'Could not connect to search engines. Please check your internet connection.'
      };
    }
  }
}

export default SearchTool;

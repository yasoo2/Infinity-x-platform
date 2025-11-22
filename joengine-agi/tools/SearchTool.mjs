import { BaseTool } from './Tool.mjs';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * @class SearchTool
 * @description A tool to search the internet. It can use Google Custom Search API or
 * fall back to a free DuckDuckGo search (HTML scraping + API).
 */
export class SearchTool extends BaseTool {
  name = 'search_tool';
  description = 'Searches the internet for up-to-date information. Can use different search engines.';

  parameters = {
    query: {
      type: 'string',
      description: 'The search query to execute.',
      required: true,
    },
    count: {
      type: 'number',
      description: 'The desired number of results to return (default: 5).',
      required: false,
    },
    engine: {
      type: 'string',
      description: 'The search engine to use: "google" (requires API key) or "duckduckgo" (free, default).',
      required: false,
    },
  };

  constructor() {
    super();
    this.googleApiKey = process.env.GOOGLE_API_KEY;
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  }

  async execute(params) {
    const validation = this.validate(params);
    if (!validation.isValid) {
      return { success: false, error: validation.message };
    }

    const { query, count = 5, engine = 'duckduckgo' } = params;
    console.log(`Searching the web for: \"${query}\" using engine: ${engine}`);

    if (engine === 'google') {
      if (!this.googleApiKey || !this.googleSearchEngineId) {
        console.warn('Google API credentials not found. Falling back to DuckDuckGo.');
        return this._searchDuckDuckGo(query, count);
      }
      try {
        return await this._searchGoogle(query, count);
      } catch (error) {
        console.error(`Google Search failed: ${error.message}. Falling back to DuckDuckGo.`);
        return this._searchDuckDuckGo(query, count);
      }
    } else {
      return this._searchDuckDuckGo(query, count);
    }
  }

  async _searchGoogle(query, count) {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: this.googleApiKey,
        cx: this.googleSearchEngineId,
        q: query,
        num: Math.min(count, 10), // Google API max is 10
      },
      timeout: 10000,
    });

    const results = response.data.items?.map(item => ({
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      source: 'Google Custom Search',
    })) || [];

    return {
      success: true,
      query: query,
      engine: 'google',
      results: results,
      message: `Found ${results.length} results using Google.`
    };
  }

  async _searchDuckDuckGo(query, count) {
    try {
      // First, attempt to get rich results by scraping the HTML version.
      const htmlResults = await this._scrapeDuckDuckGoHTML(query, count);
      if (htmlResults.results.length > 0) {
        return htmlResults;
      }
    } catch (error) {
      console.warn(`DuckDuckGo HTML scraping failed: ${error.message}. Falling back to the API.`);
    }

    // If scraping fails or yields no results, use the DuckDuckGo Instant Answer API.
    try {
      return await this._queryDuckDuckGoAPI(query, count);
    } catch (apiError) {
      console.error(`All DuckDuckGo search methods failed for query: \"${query}\".`);
      return this._createFallbackResult(query, apiError.message);
    }
  }

  async _scrapeDuckDuckGoHTML(query, count) {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.result').each((i, elem) => {
      if (results.length >= count) return false; // Stop iterating once we have enough results

      const $elem = $(elem);
      const title = $elem.find('.result__a').text().trim();
      const rawUrl = $elem.find('.result__a').attr('href');
      const snippet = $elem.find('.result__snippet').text().trim();
      
      if (title && rawUrl) {
        const cleanUrl = new URL(rawUrl, 'https://duckduckgo.com').href.replace(/&rut=.*$/, '');
        results.push({
          title,
          snippet: snippet || 'No description available.',
          url: cleanUrl,
          source: 'DuckDuckGo HTML',
        });
      }
    });

    return {
      success: true,
      query: query,
      engine: 'duckduckgo_html',
      results: results,
      message: `Found ${results.length} results using DuckDuckGo HTML.`
    };
  }

  async _queryDuckDuckGoAPI(query, count) {
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: { q: query, format: 'json', no_html: 1, skip_disambig: 1 },
      timeout: 10000,
    });

    const data = response.data;
    const results = [];

    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        source: 'DuckDuckGo API',
      });
    }

    if (data.RelatedTopics) {
        data.RelatedTopics.slice(0, count - results.length).forEach(topic => {
            if (topic.Text && topic.FirstURL) {
                results.push({
                    title: topic.Text.split(' - ')[0] || topic.Text,
                    snippet: topic.Text,
                    url: topic.FirstURL,
                    source: 'DuckDuckGo API',
                });
            }
        });
    }

    return {
        success: true,
        query: query,
        engine: 'duckduckgo_api',
        results: results,
        message: `Found ${results.length} results using DuckDuckGo API.`
    };
  }

  _createFallbackResult(query, errorMessage) {
    return {
      success: false,
      query: query,
      engine: 'fallback',
      results: [],
      error: `All search attempts failed. Last error: ${errorMessage}`,
    };
  }
}

export default SearchTool;

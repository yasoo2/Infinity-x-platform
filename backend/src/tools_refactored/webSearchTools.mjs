/**
 * Web Search Tools - أدوات البحث على الإنترنت
 * يوفر قدرات البحث على الإنترنت لـ JOE
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * البحث على الإنترنت باستخدام DuckDuckGo HTML Search
 */
export async function searchWeb(query) {
  try {
    console.log('🔍 Searching web for:', query);
    
    // استخدام DuckDuckGo HTML Search
    const response = await axios.get('https://html.duckduckgo.com/html/', {
      params: {
        q: query
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // استخراج نتائج البحث من DuckDuckGo
    $('.result').each((i, element) => {
      const titleElement = $(element).find('.result__a');
      const snippetElement = $(element).find('.result__snippet');
      const urlElement = $(element).find('.result__url');

      const title = titleElement.text().trim();
      const snippet = snippetElement.text().trim();
      let url = urlElement.attr('href') || titleElement.attr('href');

      // تنظيف الـ URL
      if (url && url.startsWith('//duckduckgo.com/l/?uddg=')) {
        try {
          const urlParams = new URLSearchParams(url.split('?')[1]);
          url = decodeURIComponent(urlParams.get('uddg') || '');
        } catch (e) {
          // ignore
        }
      }

      if (title && url && url.startsWith('http')) {
        results.push({
          title,
          url,
          snippet,
          source: 'DuckDuckGo'
        });
      }
    });

    console.log(`✅ Found ${results.length} results`);

    return {
      success: true,
      query,
      results: results.slice(0, 10), // أول 10 نتائج
      count: results.length
    };
  } catch (error) {
    console.error('❌ Web search error:', error.message);
    return {
      success: false,
      error: 'فشل البحث في الإنترنت: ' + error.message,
      results: []
    };
  }
}

/**
 * تصفح موقع ويب واستخراج المحتوى
 */
export async function browseWebsite(url) {
  try {
    console.log('🌐 Browsing website:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const $ = cheerio.load(response.data);
    
    // إزالة العناصر غير المرغوب فيها
    $('script, style, nav, footer, header, iframe, ads, .ad, .advertisement').remove();
    
    // استخراج المحتوى
    const title = $('title').text().trim();
    const mainContent = $('article, main, .content, #content, .post, .entry-content, body').first().text().trim();
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    
    // استخراج الروابط
    const links = [];
    $('a[href]').each((i, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      if (href && text && href.startsWith('http') && links.length < 10) {
        links.push({ text, url: href });
      }
    });

    // تنظيف المحتوى من الفراغات الزائدة
    const cleanContent = mainContent
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    console.log(`✅ Extracted content from ${url}`);

    return {
      success: true,
      url,
      title,
      description,
      content: cleanContent.substring(0, 5000), // أول 5000 حرف
      links
    };
  } catch (error) {
    console.error('❌ Browse website error:', error.message);
    return {
      success: false,
      error: 'فشل تصفح الموقع: ' + error.message
    };
  }
}

/**
 * الحصول على معلومات الطقس (باستخدام Open-Meteo API - مجاني)
 */
export async function getWeather(city) {
  try {
    // أولاً: الحصول على إحداثيات المدينة
    const geocodeResponse = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
      params: {
        name: city,
        count: 1,
        language: 'ar',
        format: 'json'
      }
    });

    if (!geocodeResponse.data.results || geocodeResponse.data.results.length === 0) {
      return {
        success: false,
        error: `لم أتمكن من العثور على مدينة "${city}"`
      };
    }

    const location = geocodeResponse.data.results[0];
    const { latitude, longitude, name, country } = location;

    // ثانياً: الحصول على بيانات الطقس
    const weatherResponse = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude,
        longitude,
        current_weather: true,
        timezone: 'auto'
      }
    });

    const weather = weatherResponse.data.current_weather;

    // تحويل رمز الطقس إلى وصف
    const weatherCodes = {
      0: 'صافٍ',
      1: 'صافٍ في الغالب',
      2: 'غائم جزئياً',
      3: 'غائم',
      45: 'ضباب',
      48: 'ضباب متجمد',
      51: 'رذاذ خفيف',
      53: 'رذاذ معتدل',
      55: 'رذاذ كثيف',
      61: 'مطر خفيف',
      63: 'مطر معتدل',
      65: 'مطر غزير',
      71: 'ثلج خفيف',
      73: 'ثلج معتدل',
      75: 'ثلج كثيف',
      80: 'زخات مطر خفيفة',
      81: 'زخات مطر معتدلة',
      82: 'زخات مطر غزيرة',
      95: 'عاصفة رعدية',
      96: 'عاصفة رعدية مع برد خفيف',
      99: 'عاصفة رعدية مع برد كثيف'
    };

    const weatherDescription = weatherCodes[weather.weathercode] || 'غير معروف';

    return {
      success: true,
      city: name,
      country,
      temperature: weather.temperature,
      windSpeed: weather.windspeed,
      weatherDescription,
      weatherCode: weather.weathercode,
      time: weather.time
    };
  } catch (error) {
    console.error('Weather API error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

export const webSearchTools = {
  searchWeb,
  browseWebsite,
  getWeather
};

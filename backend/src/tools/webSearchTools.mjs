/**
 * Web Search Tools - أدوات البحث على الإنترنت
 * يوفر قدرات البحث على الإنترنت لـ JOE
 */

import axios from 'axios';

/**
 * البحث على الإنترنت باستخدام DuckDuckGo API (مجاني)
 */
export async function searchWeb(query) {
  try {
    // استخدام DuckDuckGo Instant Answer API (مجاني وبدون API key)
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1,
        skip_disambig: 1
      }
    });

    const data = response.data;
    let results = [];

    // جمع النتائج من مصادر مختلفة
    if (data.AbstractText) {
      results.push({
        title: data.Heading || 'معلومات عامة',
        snippet: data.AbstractText,
        url: data.AbstractURL || '',
        source: data.AbstractSource || 'DuckDuckGo'
      });
    }

    // إضافة النتائج ذات الصلة
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 5).forEach(topic => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'نتيجة ذات صلة',
            snippet: topic.Text,
            url: topic.FirstURL,
            source: 'DuckDuckGo'
          });
        }
      });
    }

    return {
      success: true,
      query,
      results,
      count: results.length
    };
  } catch (error) {
    console.error('Web search error:', error.message);
    return {
      success: false,
      error: error.message
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
  getWeather
};

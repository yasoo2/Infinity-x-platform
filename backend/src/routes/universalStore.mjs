import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Universal Store Integration
 * Supports ANY e-commerce platform via API
 */

// Supported platforms with their API specs
const PLATFORMS = {
  shopify: {
    name: 'Shopify',
    authType: 'token',
    endpoints: {
      shop: '/admin/api/2024-01/shop.json',
      products: '/admin/api/2024-01/products.json',
      orders: '/admin/api/2024-01/orders.json'
    }
  },
  woocommerce: {
    name: 'WooCommerce',
    authType: 'basic',
    endpoints: {
      system: '/wp-json/wc/v3/system_status',
      products: '/wp-json/wc/v3/products',
      orders: '/wp-json/wc/v3/orders'
    }
  },
  magento: {
    name: 'Magento',
    authType: 'bearer',
    endpoints: {
      store: '/rest/V1/store/storeConfigs',
      products: '/rest/V1/products',
      orders: '/rest/V1/orders'
    }
  },
  prestashop: {
    name: 'PrestaShop',
    authType: 'key',
    endpoints: {
      shop: '/api/shops',
      products: '/api/products',
      orders: '/api/orders'
    }
  },
  opencart: {
    name: 'OpenCart',
    authType: 'token',
    endpoints: {
      store: '/index.php?route=api/store',
      products: '/index.php?route=api/product',
      orders: '/index.php?route=api/order'
    }
  },
  bigcommerce: {
    name: 'BigCommerce',
    authType: 'token',
    endpoints: {
      store: '/v2/store',
      products: '/v3/catalog/products',
      orders: '/v2/orders'
    }
  },
  custom: {
    name: 'Custom API',
    authType: 'flexible',
    endpoints: {
      // User-defined endpoints
    }
  }
};

/**
 * Connect to ANY store platform
 */
router.post('/connect', async (req, res) => {
  try {
    const { 
      platform, 
      storeUrl, 
      authType, 
      apiKey, 
      apiSecret, 
      accessToken,
      customEndpoints 
    } = req.body;

    if (!platform || !storeUrl) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: platform, storeUrl'
      });
    }

    console.log(`🔗 Connecting to ${platform} store: ${storeUrl}`);

    const platformConfig = PLATFORMS[platform] || PLATFORMS.custom;
    let connectionValid = false;
    let storeData = null;

    // Build request based on auth type
    const requestConfig = buildRequestConfig(platform, authType, {
      apiKey,
      apiSecret,
      accessToken,
      storeUrl,
      customEndpoints
    });

    try {
      // Test connection
      const testEndpoint = customEndpoints?.test || platformConfig.endpoints.shop || platformConfig.endpoints.store || platformConfig.endpoints.system;
      const testUrl = `${storeUrl}${testEndpoint}`;
      
      const response = await axios.get(testUrl, requestConfig);
      connectionValid = true;
      storeData = response.data;
    } catch (error) {
      console.error(`${platform} connection failed:`, error.message);
      return res.status(401).json({
        ok: false,
        error: `Failed to connect to ${platform} store. Please check your credentials and URL.`,
        details: error.response?.data || error.message
      });
    }

    // Save connection to database (implement later)
    console.log(`✅ Successfully connected to ${platform} store`);

    res.json({
      ok: true,
      message: `Successfully connected to ${platformConfig.name} store`,
      platform,
      storeUrl,
      storeData: {
        platform: platformConfig.name,
        connected: true,
        connectedAt: new Date().toISOString(),
        dataPreview: JSON.stringify(storeData).substring(0, 200) + '...'
      }
    });

  } catch (error) {
    console.error('❌ Store Connection Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * Fetch products from ANY store
 */
router.post('/fetch-products', async (req, res) => {
  try {
    const { 
      platform, 
      storeUrl, 
      authType, 
      apiKey, 
      apiSecret, 
      accessToken,
      customEndpoints,
      limit = 10
    } = req.body;

    console.log(`📦 Fetching products from ${platform}...`);

    const platformConfig = PLATFORMS[platform] || PLATFORMS.custom;
    const requestConfig = buildRequestConfig(platform, authType, {
      apiKey,
      apiSecret,
      accessToken,
      storeUrl,
      customEndpoints
    });

    const productsEndpoint = customEndpoints?.products || platformConfig.endpoints.products;
    const productsUrl = `${storeUrl}${productsEndpoint}?limit=${limit}`;

    const response = await axios.get(productsUrl, requestConfig);
    const products = extractProducts(platform, response.data);

    res.json({
      ok: true,
      platform: platformConfig.name,
      productsCount: products.length,
      products
    });

  } catch (error) {
    console.error('❌ Fetch Products Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * AI-powered universal store analysis
 */
router.post('/analyze', async (req, res) => {
  try {
    const { 
      platform, 
      storeUrl, 
      authType, 
      apiKey, 
      apiSecret, 
      accessToken,
      customEndpoints,
      analysisGoals
    } = req.body;

    console.log(`🔍 Analyzing ${platform} store...`);

    // Fetch store data
    const platformConfig = PLATFORMS[platform] || PLATFORMS.custom;
    const requestConfig = buildRequestConfig(platform, authType, {
      apiKey,
      apiSecret,
      accessToken,
      storeUrl,
      customEndpoints
    });

    // Get products
    const productsEndpoint = customEndpoints?.products || platformConfig.endpoints.products;
    const productsUrl = `${storeUrl}${productsEndpoint}?limit=20`;
    const productsResponse = await axios.get(productsUrl, requestConfig);
    const products = extractProducts(platform, productsResponse.data);

    // AI Analysis
    const prompt = `You are an expert e-commerce consultant analyzing a ${platformConfig.name} store.

**Platform**: ${platformConfig.name}
**Store URL**: ${storeUrl}
**Products Sample**: ${JSON.stringify(products.slice(0, 5), null, 2)}
**Total Products Analyzed**: ${products.length}
**Analysis Goals**: ${analysisGoals || 'General optimization and improvement'}

Provide a comprehensive analysis with:
1. **Store Health Score** (0-100)
2. **Critical Issues** (3-5 urgent problems)
3. **Quick Wins** (3-5 easy improvements)
4. **Product Optimization** (specific recommendations)
5. **SEO Improvements** (actionable SEO tips)
6. **Conversion Optimization** (CRO recommendations)
7. **Long-term Strategy** (3-5 strategic goals)

Format as JSON:
{
  "healthScore": number,
  "criticalIssues": ["issue1", "issue2", ...],
  "quickWins": ["win1", "win2", ...],
  "productOptimization": ["tip1", "tip2", ...],
  "seoImprovements": ["seo1", "seo2", ...],
  "conversionOptimization": ["cro1", "cro2", ...],
  "longTermStrategy": ["strategy1", "strategy2", ...]
}

Return ONLY valid JSON.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let analysis = response.text();

    // Clean and parse JSON
    analysis = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsedAnalysis = JSON.parse(analysis);

    console.log('✅ Store analysis completed!');

    res.json({
      ok: true,
      platform: platformConfig.name,
      storeUrl,
      analysis: parsedAnalysis,
      metadata: {
        analyzedAt: new Date().toISOString(),
        productsAnalyzed: products.length,
        aiModel: 'gemini-2.0-flash-exp'
      }
    });

  } catch (error) {
    console.error('❌ Store Analysis Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * Get supported platforms list
 */
router.get('/platforms', (req, res) => {
  const platformsList = Object.entries(PLATFORMS).map(([key, value]) => ({
    id: key,
    name: value.name,
    authType: value.authType,
    supported: true
  }));

  res.json({
    ok: true,
    platforms: platformsList,
    total: platformsList.length
  });
});

// Helper Functions

function buildRequestConfig(platform, authType, credentials) {
  const { apiKey, apiSecret, accessToken, storeUrl } = credentials;
  const config = {
    headers: {},
    timeout: 30000
  };

  switch (platform) {
    case 'shopify':
      config.headers['X-Shopify-Access-Token'] = accessToken || apiKey;
      break;
    
    case 'woocommerce':
      config.auth = {
        username: apiKey || apiSecret?.split(':')[0],
        password: apiSecret?.split(':')[1] || apiSecret
      };
      break;
    
    case 'magento':
      config.headers['Authorization'] = `Bearer ${accessToken || apiKey}`;
      break;
    
    case 'prestashop':
      config.params = { ws_key: apiKey };
      break;
    
    case 'opencart':
      config.headers['X-Oc-Merchant-Id'] = apiKey;
      config.headers['X-Oc-Session'] = accessToken;
      break;
    
    case 'bigcommerce':
      config.headers['X-Auth-Token'] = accessToken || apiKey;
      break;
    
    case 'custom':
      // Flexible auth based on authType
      if (authType === 'bearer' || authType === 'token') {
        config.headers['Authorization'] = `Bearer ${accessToken || apiKey}`;
      } else if (authType === 'basic') {
        config.auth = {
          username: apiKey,
          password: apiSecret
        };
      } else if (authType === 'apikey') {
        config.headers['X-API-Key'] = apiKey;
      }
      break;
  }

  return config;
}

function extractProducts(platform, data) {
  switch (platform) {
    case 'shopify':
      return data.products || [];
    
    case 'woocommerce':
    case 'magento':
    case 'bigcommerce':
      return Array.isArray(data) ? data : data.items || [];
    
    case 'prestashop':
      return data.products || data.product || [];
    
    case 'opencart':
      return data.data || [];
    
    case 'custom':
      // Try to intelligently extract products
      return Array.isArray(data) ? data : 
             data.products || data.items || data.data || [];
    
    default:
      return Array.isArray(data) ? data : [];
  }
}

export default router;

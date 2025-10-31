import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Connect to external store (Shopify, WooCommerce, etc.)
 */
router.post('/connect-store', async (req, res) => {
  try {
    const { storeType, apiToken, storeUrl } = req.body;

    if (!storeType || !apiToken || !storeUrl) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: storeType, apiToken, storeUrl'
      });
    }

    console.log(`🔗 Connecting to ${storeType} store: ${storeUrl}`);

    // Validate connection based on store type
    let connectionValid = false;
    let storeData = null;

    if (storeType === 'shopify') {
      // Test Shopify connection
      try {
        const response = await axios.get(`${storeUrl}/admin/api/2024-01/shop.json`, {
          headers: {
            'X-Shopify-Access-Token': apiToken
          }
        });
        connectionValid = true;
        storeData = response.data.shop;
      } catch (error) {
        console.error('Shopify connection failed:', error.message);
      }
    } else if (storeType === 'woocommerce') {
      // Test WooCommerce connection
      try {
        const response = await axios.get(`${storeUrl}/wp-json/wc/v3/system_status`, {
          auth: {
            username: apiToken.split(':')[0],
            password: apiToken.split(':')[1]
          }
        });
        connectionValid = true;
        storeData = response.data;
      } catch (error) {
        console.error('WooCommerce connection failed:', error.message);
      }
    }

    if (!connectionValid) {
      return res.status(401).json({
        ok: false,
        error: 'Failed to connect to store. Please check your API token and store URL.'
      });
    }

    // Save connection to database (implement later)
    console.log(`✅ Successfully connected to ${storeType} store`);

    res.json({
      ok: true,
      message: `Successfully connected to ${storeType} store`,
      storeType,
      storeUrl,
      storeData: {
        name: storeData?.name || storeData?.environment?.home_url,
        connected: true,
        connectedAt: new Date().toISOString()
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
 * AI-powered store improvement
 */
router.post('/improve-store', async (req, res) => {
  try {
    const { storeType, apiToken, storeUrl, improvementGoals } = req.body;

    if (!storeType || !apiToken || !storeUrl) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: storeType, apiToken, storeUrl'
      });
    }

    console.log(`🚀 AI-powered store improvement for ${storeType}...`);

    // Fetch store data
    let storeData = null;
    let products = [];

    if (storeType === 'shopify') {
      const shopResponse = await axios.get(`${storeUrl}/admin/api/2024-01/shop.json`, {
        headers: { 'X-Shopify-Access-Token': apiToken }
      });
      const productsResponse = await axios.get(`${storeUrl}/admin/api/2024-01/products.json?limit=10`, {
        headers: { 'X-Shopify-Access-Token': apiToken }
      });
      storeData = shopResponse.data.shop;
      products = productsResponse.data.products;
    } else if (storeType === 'woocommerce') {
      const auth = {
        username: apiToken.split(':')[0],
        password: apiToken.split(':')[1]
      };
      const productsResponse = await axios.get(`${storeUrl}/wp-json/wc/v3/products?per_page=10`, { auth });
      products = productsResponse.data;
    }

    // Generate AI recommendations
    const prompt = `You are InfinityX AI Platform - an expert in e-commerce optimization.

Analyze this ${storeType} store and provide actionable improvement recommendations:

**Store Data**:
${JSON.stringify(storeData, null, 2)}

**Sample Products** (${products.length} products):
${JSON.stringify(products.slice(0, 5), null, 2)}

**Improvement Goals**: ${improvementGoals || 'Increase conversions, improve UX, optimize SEO'}

**Provide**:
1. **Critical Issues** (3-5 items)
2. **Quick Wins** (3-5 actionable items)
3. **Long-term Strategy** (3-5 strategic recommendations)
4. **Product Optimization** (specific product improvements)
5. **Technical Improvements** (performance, SEO, etc.)

Format as JSON with this structure:
{
  "criticalIssues": ["issue 1", "issue 2", ...],
  "quickWins": ["win 1", "win 2", ...],
  "longTermStrategy": ["strategy 1", "strategy 2", ...],
  "productOptimization": ["optimization 1", "optimization 2", ...],
  "technicalImprovements": ["improvement 1", "improvement 2", ...]
}

Return ONLY valid JSON, no markdown or explanations.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let recommendations = response.text();

    // Clean and parse JSON
    recommendations = recommendations.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsedRecommendations = JSON.parse(recommendations);

    console.log('✅ AI recommendations generated successfully!');

    res.json({
      ok: true,
      message: 'Store analysis completed',
      storeType,
      storeUrl,
      recommendations: parsedRecommendations,
      metadata: {
        analyzedAt: new Date().toISOString(),
        productsAnalyzed: products.length,
        aiModel: 'gemini-2.0-flash-exp'
      }
    });

  } catch (error) {
    console.error('❌ Store Improvement Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * Auto-generate product descriptions
 */
router.post('/generate-product-descriptions', async (req, res) => {
  try {
    const { storeType, apiToken, storeUrl, productIds } = req.body;

    if (!storeType || !apiToken || !storeUrl) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields'
      });
    }

    console.log(`📝 Generating product descriptions for ${storeType}...`);

    // Fetch products
    let products = [];
    if (storeType === 'shopify') {
      const response = await axios.get(`${storeUrl}/admin/api/2024-01/products.json`, {
        headers: { 'X-Shopify-Access-Token': apiToken }
      });
      products = response.data.products;
    } else if (storeType === 'woocommerce') {
      const auth = {
        username: apiToken.split(':')[0],
        password: apiToken.split(':')[1]
      };
      const response = await axios.get(`${storeUrl}/wp-json/wc/v3/products`, { auth });
      products = response.data;
    }

    // Filter by productIds if provided
    if (productIds && productIds.length > 0) {
      products = products.filter(p => productIds.includes(p.id.toString()));
    }

    // Generate descriptions for each product
    const updatedProducts = [];
    for (const product of products.slice(0, 5)) { // Limit to 5 products
      const prompt = `Generate a compelling, SEO-optimized product description for:

**Product Name**: ${product.title || product.name}
**Current Description**: ${product.body_html || product.description || 'No description'}
**Price**: ${product.variants?.[0]?.price || product.price || 'N/A'}

Create a professional, engaging description (150-200 words) that:
- Highlights key features and benefits
- Uses persuasive language
- Includes relevant keywords for SEO
- Has a clear call-to-action

Return ONLY the description text, no formatting or explanations.`;

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const newDescription = response.text().trim();

      updatedProducts.push({
        id: product.id,
        title: product.title || product.name,
        oldDescription: product.body_html || product.description,
        newDescription
      });
    }

    console.log(`✅ Generated ${updatedProducts.length} product descriptions!`);

    res.json({
      ok: true,
      message: `Generated ${updatedProducts.length} product descriptions`,
      products: updatedProducts,
      metadata: {
        generatedAt: new Date().toISOString(),
        aiModel: 'gemini-2.0-flash-exp'
      }
    });

  } catch (error) {
    console.error('❌ Product Description Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;

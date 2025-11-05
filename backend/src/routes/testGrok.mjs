/**
 * Test Grok API - endpoint لاختبار الاتصال بـ Grok
 */

import express from 'express';
import { getGrokEngine } from '../lib/grokEngine.mjs';

const router = express.Router();

/**
 * اختبار الاتصال بـ Grok API
 */
router.get('/test-grok', async (req, res) => {
  try {
    console.log('🧪 Testing Grok API...');
    
    const grokEngine = getGrokEngine();
    const result = await grokEngine.testConnection();
    
    res.json({
      ok: result.success,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test Grok failed:', error);
    res.json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * اختبار رد بسيط من Grok
 */
router.post('/test-grok-chat', async (req, res) => {
  try {
    const { message = 'مرحباً' } = req.body;
    
    console.log('💬 Testing Grok chat with message:', message);
    
    const grokEngine = getGrokEngine();
    const response = await grokEngine.generateResponse(message);
    
    res.json({
      ok: true,
      message,
      response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Grok chat test failed:', error);
    res.json({
      ok: false,
      error: error.message,
      details: error.response?.data || null,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

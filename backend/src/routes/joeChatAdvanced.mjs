import express from 'express';
import { processMessage } from '../lib/joeAdvancedEngine.mjs';

const router = express.Router();

/**
 * JOE Chat Advanced - مع Function Calling
 * نفس قدرات Manus AI
 */
router.post('/', async (req, res) => {
  try {
    const { message, context = [], aiEngine = 'openai' } = req.body;
    const userId = req.user ? req.user._id.toString() : 'anonymous';

    if (!message) {
      return res.json({ ok: false, error: 'Message required' });
    }

    console.log('🤖 JOE Advanced processing:', message);

    // استخدام المحرك النهائي مع جميع القدرات
    let result;
    try {
      result = await processMessage(userId, message, context);
    } catch (e) {
      console.error('❌ Error during processMessage:', e);
      return res.json({ 
        ok: false, 
        error: e.message,
        response: 'عذراً، حدث خطأ داخلي أثناء معالجة رسالتك. الرجاء التحقق من إعدادات API Keys.'
      });
    }

    if (result && result.response) {
      res.json({
        ok: true,
        response: result.response,
        toolsUsed: result.toolsUsed || [],
        requestType: result.requestType,
        complexity: result.complexity,
        stats: result.stats,
        aiEngine: 'openai-advanced',
        model: 'gpt-4o'
      });
    } else {
      res.json({
        ok: false,
        error: 'No response generated',
        response: 'عذراً، لم أتمكن من معالجة طلبك.'
      });
    }

  } catch (error) {
    console.error('❌ JOE Advanced error:', error);
    res.json({ 
      ok: false, 
      error: error.message,
      response: 'عذراً، حدث خطأ أثناء معالجة رسالتك. الرجاء المحاولة مرة أخرى.'
    });
  }
});

export default router;

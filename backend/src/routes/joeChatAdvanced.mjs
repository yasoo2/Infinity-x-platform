import express from 'express';
import { joeAdvancedEngine } from '../lib/joeAdvancedEngine.mjs';

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
    const result = await joeAdvancedEngine.processMessageManus(message, context);

    if (result.success) {
      res.json({
        ok: true,
        response: result.response,
        toolsUsed: result.toolsUsed || [],
        aiEngine: 'openai-advanced',
        model: 'gpt-4o-mini'
      });
    } else {
      res.json({
        ok: false,
        error: result.error,
        response: result.response
      });
    }

  } catch (error) {
    console.error('❌ JOE Advanced error:', error);
      res.status(500).json({ 
        ok: false, 
        error: error.message,
        response: 'عذراً، حدث خطأ أثناء معالجة رسالتك. (رسالة الخطأ الفعلية: ' + error.message + ')'
      });
  }
});

export default router;

import express from 'express';
import { joeAdvancedEngine } from '../lib/joeAdvancedEngine.mjs';

const router = express.Router();

/**
 * JOE Chat Advanced - مع Function Calling
 * نفس قدرات Manus AI
 */
router.post('/chat-advanced', async (req, res) => {
  try {
    const { message, context = [], userId = 'default', aiEngine = 'openai' } = req.body;

    if (!message) {
      return res.json({ ok: false, error: 'Message required' });
    }

    console.log('🤖 JOE Advanced processing:', message);

    // استخدام المحرك المتقدم مع Function Calling
    const result = await joeAdvancedEngine.processMessageWithTools(message, context);

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
    res.json({ 
      ok: false, 
      error: error.message,
      response: 'عذراً، حدث خطأ أثناء معالجة رسالتك.'
    });
  }
});

export default router;

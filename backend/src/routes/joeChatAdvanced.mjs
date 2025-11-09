import express from 'express';
import axios from 'axios';
import { joeAdvancedEngine } from '../lib/joeAdvancedEngine.mjs'; // Keep for fallback or other uses

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

    console.log('🧠 Proxying JOE Advanced request to joengine-agi:', message);

    // **التحسين الحاسم: توجيه الطلب إلى خدمة joengine-agi الجديدة**
    // نستخدم اسم الخدمة 'joengine-agi' كما هو محدد في render.yaml
    // Fallback to a known internal service name on Render if JOE_AGI_URL is not set
    const JOE_AGI_URL = process.env.JOE_AGI_URL || 'http://joengine-agi:3000';

    const agiResponse = await axios.post(`${JOE_AGI_URL}/api/v1/process-task`, {
      goal: message,
      context: context,
      userId: userId
    });

    // يتم إرجاع استجابة AGI مباشرة
    if (agiResponse.data.ok) {
      res.json({
        ok: true,
        response: agiResponse.data.result,
        toolsUsed: agiResponse.data.toolsUsed || [],
        aiEngine: 'joengine-agi',
        model: agiResponse.data.model || 'gpt-4o'
      });
    } else {
      // Fallback or error from AGI
      res.json({
        ok: false,
        error: agiResponse.data.error || 'AGI_PROCESSING_FAILED',
        response: agiResponse.data.result || 'عذراً، فشلت معالجة الطلب في محرك جو المتقدم.'
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

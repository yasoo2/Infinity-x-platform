import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// JOE Chat - Smart responses
router.post('/chat', async (req, res) => {
  try {
    const { message, context = [] } = req.body;

    if (!message) {
      return res.json({ ok: false, error: 'Message required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Build conversation history
    const conversationHistory = context.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');

    const systemPrompt = `You are JOE (Just One Engine), an advanced AI assistant that can:
- Build websites, apps, and stores from descriptions
- Manage GitHub repositories
- Deploy to Render and Cloudflare
- Evolve and improve yourself
- Integrate with external services

You are helpful, friendly, and speak Arabic fluently.

**Current conversation:**
${conversationHistory}

**User says:** ${message}

**Respond naturally in Arabic. If the user asks you to build something, explain what you'll do step by step.**`;

    const result = await model.generateContent(systemPrompt);
    const response = result.response.text();

    res.json({
      ok: true,
      response,
      action: detectAction(message)
    });

  } catch (error) {
    console.error('JOE chat error:', error);
    res.json({ ok: false, error: error.message });
  }
});

// Detect what action user wants
function detectAction(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('طور نفسك') || lower.includes('حسن نفسك') || lower.includes('evolve')) {
    return 'self-evolve';
  }
  
  if (lower.includes('ابني') || lower.includes('صمم') || lower.includes('build') || lower.includes('create')) {
    return 'build-project';
  }
  
  if (lower.includes('متجر') || lower.includes('store') || lower.includes('shop')) {
    return 'build-store';
  }
  
  if (lower.includes('موقع') || lower.includes('website') || lower.includes('site')) {
    return 'build-website';
  }
  
  if (lower.includes('github') || lower.includes('جيت هاب')) {
    return 'github-action';
  }
  
  if (lower.includes('deploy') || lower.includes('نشر')) {
    return 'deploy';
  }
  
  return 'chat';
}

export default router;

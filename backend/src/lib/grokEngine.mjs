import OpenAI from 'openai';

const openai = new OpenAI();

/**
 * GrokEngine - محرك Grok (محصّن 100%)
 * يستخدم Manus OpenAI API كبديل مؤقت.
 */
export class GrokEngine {
  constructor() {
    // لا يتطلب مفتاح API خاص به حاليًا، يستخدم إعدادات OpenAI
  }

  // === توليد رد محادثة ===
  async generateResponse(systemPrompt, context) {
    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...context.map(msg => ({ role: msg.role, content: msg.content })),
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini', // استخدام gpt-4.1-mini كبديل لـ Grok
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Grok API Error (using OpenAI fallback):', error);
      throw error;
    }
  }
}

// === تصدير كائن جاهز ===
let engine = null;
export const getGrokEngine = () => {
  if (!engine) {
    engine = new GrokEngine();
  }
  return engine;
};

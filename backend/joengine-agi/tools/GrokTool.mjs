import axios from 'axios';

/**
 * Grok Tool for JOEngine AGI - CORRECTED & SIMPLIFIED
 * This version uses standard string concatenation to avoid all escaping issues.
 */
export class GrokTool {
  constructor(config) {
    this.apiKey = config.grokApiKey || process.env.GROK_API_KEY;
    this.baseURL = 'https://api.x.ai/v1';
    this.model = 'grok-1.5-claude-3.5';
    this.timeout = 45000;
  }

  async _executeCompletion(messages) {
    if (!this.apiKey || this.apiKey.includes('your-grok-api-key')) {
      throw new Error('Grok API key is not configured.');
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: 0.5,
          max_tokens: 4096,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: this.timeout,
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      if (error.response) {
        const { status, data } = error.response;
        if (status === 401) throw new Error('Grok API key is invalid or expired.');
        if (status === 429) throw new Error('Grok API rate limit exceeded.');
        if (status >= 500) throw new Error('Grok server error. Please try again later.');
        throw new Error(`Grok API error (${status}): ${data?.error?.message || error.message}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Grok API request timed out.');
      }
      throw new Error(`Failed to connect to Grok: ${error.message}`);
    }
  }

  async refactorCode(originalCode, command) {
    const originalLength = originalCode.length;
    console.log(`Refactoring code (${originalLength} chars) with command: ${command}`);

    // SAFE IMPLEMENTATION: Using standard string concatenation.
    const prompt = 'أنت **جو (Joe)** — وكيل AI محترف متخصص في تطوير وتحسين الكود.\n\n' +
      '**🎯 الأمر المطلوب:** ' + command + '\n\n' +
      '**📄 الكود الأصلي:**\n' +
      '```\n' +
      originalCode + '\n' +
      '```\n\n' +
      '**⚠️ القواعد الصارمة (CRITICAL - لا يمكن خرقها):**\n' +
      '1.  **الحفاظ الكامل:** احتفظ بـ 100% من الكود الأصلي إلا إذا كان هناك خطأ برمجي واضح.\n' +
      '2.  **عدم الحذف:** ممنوع حذف أي دالة، متغير، class، HTML element، أو CSS rule.\n' +
      '3.  **الإضافة فقط:** إذا كان الأمر يتطلب إضافة، أضف الكود الجديد فقط دون إعادة كتابة الموجود.\n' +
      '4.  **الكود الكامل:** يجب إرجاع الملف كاملاً 100% بعد التعديل (لا اختصارات).\n' +
      '5.  **الهيكل الأصلي:** حافظ على نفس البنية، الأسماء، والمسافات قدر الإمكان.\n' +
      '6.  **التوافق:** تأكد من أن الكود الجديد متوافق مع الكود الموجود.\n\n' +
      '**📊 معلومات مهمة:**\n' +
      '- الكود الأصلي: ' + originalLength + ' حرف.\n' +
      '- يجب أن يكون الناتج قريب من حجم الكود الأصلي، إلا إذا كان الأمر يبرر الحذف.\n\n' +
      '**📤 صيغة الرد (JSON فقط):**\n' +
      '```json\n' +
      '{\n' +
      '  "content": "الكود الكامل المعدّل هنا...",\n' +
      '  "message": "وصف مختصر للتعديلات التي قمت بها."\n' +
      '}\n' +
      '```';

    try {
      const responseText = await this._executeCompletion([{ role: 'user', content: prompt }]);
      const jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error('Grok response did not contain valid JSON.');
      }

      const data = JSON.parse(jsonMatch[0]);

      if (!data.content) {
        throw new Error('Parsed JSON response is missing the \'content\' field.');
      }

      const newLength = data.content.length;
      const sizeRatio = newLength / originalLength;
      if (sizeRatio < 0.7 && !command.toLowerCase().includes('remove') && !command.toLowerCase().includes('delete')) {
        console.warn(`[GrokTool] Warning: Drastic code reduction (${(sizeRatio * 100).toFixed(1)}%) detected. This might be an error.`);
        data.message += " (Warning: significant code size reduction detected)";
      }

      data.content = this._cleanCode(data.content);
      console.log('✅ Code refactored successfully.');
      return data;

    } catch (error) {
      console.error(`[GrokTool] Failed to refactor code: ${error.message}`);
      return {
        content: originalCode,
        message: `Failed to refactor code due to an error: ${error.message}`
      };
    }
  }

  async generateCode(description, codeType = 'javascript') {
    const prompt = 'As a professional software developer, create a complete, production-ready ' + codeType + ' snippet based on the following description. Respond ONLY with the raw code, without any extra explanations or markdown.\n\n**Description:** ' + description;
    const code = await this._executeCompletion([{ role: 'user', content: prompt }]);
    return this._cleanCode(code);
  }

  _cleanCode(code) {
    return code.replace(/^```[a-z]*\n|\n```$/g, '').trim();
  }
}

export default GrokTool;

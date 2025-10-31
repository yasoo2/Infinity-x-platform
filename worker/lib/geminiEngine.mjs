import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiEngine {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async generateCode(prompt) {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }

  async generateProjectCode(projectType, title, description, style) {
    const prompt = `You are an expert web developer. Generate a complete, production-ready ${projectType} with the following details:

Title: ${title}
Description: ${description}
Style: ${style}

Requirements:
1. Generate ONLY the HTML, CSS, and JavaScript code
2. Use modern, clean, and responsive design
3. Include all necessary styles inline or in <style> tags
4. Make it fully functional and interactive
5. Use modern JavaScript (ES6+)
6. Ensure mobile responsiveness
7. Add smooth animations and transitions
8. Use a beautiful color scheme matching the "${style}" style

Return ONLY the complete HTML code, starting with <!DOCTYPE html> and ending with </html>.
Do NOT include any explanations, markdown formatting, or code blocks - just the raw HTML code.`;

    return await this.generateCode(prompt);
  }
}

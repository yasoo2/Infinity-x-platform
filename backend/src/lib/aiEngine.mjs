/**
 * AI Engine - محرك الذكاء الاصطناعي لتوليد الكود
 * يستخدم OpenAI API لتوليد المشاريع الكاملة
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-proj-dummy'
});

/**
 * توليد موقع ويب كامل
 */
export async function generateWebsite(description, style = 'modern') {
  const prompt = `Create a complete, modern, responsive website based on this description:
"${description}"

Style: ${style}

Requirements:
- Single HTML file with embedded CSS and JavaScript
- Modern, professional design
- Fully responsive (mobile, tablet, desktop)
- Use Tailwind CSS via CDN
- Include smooth animations
- SEO optimized
- Fast loading

Return ONLY the complete HTML code, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert web developer. Generate clean, modern, production-ready code.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const code = response.choices[0].message.content;
    
    // استخراج الكود من markdown إذا كان موجوداً
    const htmlMatch = code.match(/```html\n([\s\S]*?)\n```/) || 
                      code.match(/```\n([\s\S]*?)\n```/);
    
    return htmlMatch ? htmlMatch[1].trim() : code.trim();
  } catch (error) {
    console.error('AI Engine Error:', error);
    throw new Error(`Failed to generate website: ${error.message}`);
  }
}

/**
 * توليد تطبيق ويب كامل
 */
export async function generateWebApp(description, features = []) {
  const featuresList = features.length > 0 ? 
    `\nFeatures:\n${features.map(f => `- ${f}`).join('\n')}` : '';

  const prompt = `Create a complete, modern web application based on this description:
"${description}"
${featuresList}

Requirements:
- Use React with Vite
- Modern UI with Tailwind CSS
- Responsive design
- Clean component structure
- State management if needed
- API integration ready
- Production-ready code

Generate the following files:
1. index.html
2. src/App.jsx
3. src/main.jsx
4. src/index.css
5. package.json
6. vite.config.js

Return as JSON with format:
{
  "files": {
    "index.html": "...",
    "src/App.jsx": "...",
    ...
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert React developer. Generate clean, modern, production-ready applications.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('AI Engine Error:', error);
    throw new Error(`Failed to generate web app: ${error.message}`);
  }
}

/**
 * توليد متجر إلكتروني كامل
 */
export async function generateEcommerce(description, products = []) {
  const productsList = products.length > 0 ?
    `\nInitial Products:\n${products.map(p => `- ${p}`).join('\n')}` : '';

  const prompt = `Create a complete, modern e-commerce store based on this description:
"${description}"
${productsList}

Requirements:
- Modern, professional design
- Product catalog with search and filters
- Shopping cart functionality
- Responsive design (mobile-first)
- Payment integration ready (Stripe/PayPal)
- Admin panel for product management
- Use React + Tailwind CSS
- Clean, production-ready code

Generate the following files:
1. index.html
2. src/App.jsx (main app with routing)
3. src/pages/Home.jsx
4. src/pages/Products.jsx
5. src/pages/ProductDetail.jsx
6. src/pages/Cart.jsx
7. src/pages/Checkout.jsx
8. src/components/Header.jsx
9. src/components/ProductCard.jsx
10. src/context/CartContext.jsx
11. src/main.jsx
12. src/index.css
13. package.json
14. vite.config.js

Return as JSON with format:
{
  "files": {
    "index.html": "...",
    "src/App.jsx": "...",
    ...
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert e-commerce developer. Generate complete, production-ready online stores.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 12000,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('AI Engine Error:', error);
    throw new Error(`Failed to generate e-commerce store: ${error.message}`);
  }
}

/**
 * تحسين كود موجود
 */
export async function improveCode(code, improvements = []) {
  const improvementsList = improvements.length > 0 ?
    `\nImprovements needed:\n${improvements.map(i => `- ${i}`).join('\n')}` : 
    '\nGeneral improvements: performance, accessibility, SEO, best practices';

  const prompt = `Improve this code:
${improvementsList}

Original code:
\`\`\`
${code}
\`\`\`

Return ONLY the improved code, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert code reviewer and optimizer.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 6000
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('AI Engine Error:', error);
    throw new Error(`Failed to improve code: ${error.message}`);
  }
}

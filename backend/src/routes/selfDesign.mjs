import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Self-Design API
 * The system designs its own landing page using AI
 */
router.post('/design-landing-page', async (req, res) => {
  try {
    const { style = 'modern', features = [] } = req.body;

    console.log('🎨 Self-Design: Starting to design landing page...');

    // Create AI prompt for self-design
    const prompt = `You are InfinityX AI Platform - a self-evolving AI system that can design and develop itself.

Design a professional, modern landing page for yourself with the following specifications:

**System Name**: InfinityX Platform
**Tagline**: "Build Anything with AI - Websites, Apps, and E-commerce Stores in Minutes"

**Style**: ${style}
**Features to highlight**: ${features.length > 0 ? features.join(', ') : 'AI-powered generation, Self-evolving system, External store integration'}

**Required Sections**:
1. Hero Section with CTA buttons
2. Features showcase (3-4 key features)
3. How It Works (3 steps)
4. Pricing plans (Free, Pro, Enterprise)
5. Footer with links

**Technical Requirements**:
- Use React components (JSX)
- Use Tailwind CSS for styling
- Make it responsive (mobile-friendly)
- Add smooth animations
- Include working buttons that navigate to /build page
- Modern gradient backgrounds
- Professional typography
- Call-to-action buttons

Generate ONLY the complete React component code for LandingPage.jsx.
Include all necessary imports and export the component.
Make it production-ready and visually stunning.

Return ONLY the code, no explanations.`;

    // Call Gemini AI
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let code = response.text();

    // Clean the code
    code = code.replace(/```jsx\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('✅ Self-Design: Landing page designed successfully!');

    res.json({
      ok: true,
      message: 'Landing page designed successfully by AI',
      code,
      metadata: {
        style,
        features,
        generatedAt: new Date().toISOString(),
        aiModel: 'gemini-2.0-flash-exp'
      }
    });

  } catch (error) {
    console.error('❌ Self-Design Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * Self-Development API
 * The system improves and evolves its own code
 */
router.post('/evolve-component', async (req, res) => {
  try {
    const { componentName, currentCode, improvementGoal } = req.body;

    if (!componentName || !currentCode || !improvementGoal) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: componentName, currentCode, improvementGoal'
      });
    }

    console.log(`🧬 Self-Evolution: Improving ${componentName}...`);

    const prompt = `You are InfinityX AI Platform - a self-evolving system.

Analyze and improve the following React component:

**Component Name**: ${componentName}
**Improvement Goal**: ${improvementGoal}

**Current Code**:
\`\`\`jsx
${currentCode}
\`\`\`

**Your Task**:
1. Analyze the current code
2. Identify areas for improvement
3. Implement the requested improvements
4. Maintain all existing functionality
5. Ensure the code is production-ready

**Improvement Areas**:
- Performance optimization
- Better UX/UI
- Code quality
- Accessibility
- Responsiveness
- Modern best practices

Return ONLY the improved code, no explanations.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let improvedCode = response.text();

    // Clean the code
    improvedCode = improvedCode.replace(/```jsx\n?/g, '').replace(/```\n?/g, '').trim();

    console.log(`✅ Self-Evolution: ${componentName} improved successfully!`);

    res.json({
      ok: true,
      message: `${componentName} evolved successfully`,
      improvedCode,
      metadata: {
        componentName,
        improvementGoal,
        evolvedAt: new Date().toISOString(),
        aiModel: 'gemini-2.0-flash-exp'
      }
    });

  } catch (error) {
    console.error('❌ Self-Evolution Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * Get current landing page code
 */
router.get('/current-landing-page', async (req, res) => {
  try {
    // This would normally read from a database or file system
    // For now, return a placeholder
    res.json({
      ok: true,
      message: 'Current landing page code',
      code: null,
      note: 'No custom landing page designed yet. Use /design-landing-page to create one.'
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;

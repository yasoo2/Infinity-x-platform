import express from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// JOE Chat - Smart responses WITH REAL ACTIONS
router.post('/chat', async (req, res) => {
  try {
    const { message, context = [], userId = 'default' } = req.body;

    if (!message) {
      return res.json({ ok: false, error: 'Message required' });
    }

    // Detect action FIRST
    const action = detectAction(message);
    let actionResult = null;

    // EXECUTE REAL ACTIONS
    if (action === 'build-project' || action === 'build-website' || action === 'build-store') {
      actionResult = await handleBuildProject(message, userId);
    } else if (action === 'self-evolve') {
      actionResult = await handleSelfEvolution(userId);
    } else if (action === 'github-action') {
      actionResult = await handleGitHubAction(message, userId);
    } else if (action === 'deploy') {
      actionResult = await handleDeploy(message, userId);
    }

    // Generate AI response using OpenAI-compatible API

    const conversationHistory = context.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');

    let systemPrompt = `You are JOE (Just One Engine), a powerful AI development assistant with FULL ACCESS to:

✅ **GitHub**: You have a GitHub Token and can:
   - Read, analyze, and inspect any repository
   - Create, modify, and delete files
   - Commit and push changes
   - Create new repositories
   - Manage branches and pull requests

✅ **Build & Deploy**: You can:
   - Generate complete projects (websites, stores, apps)
   - Deploy to Cloudflare Pages and Render
   - Build real, working applications

✅ **Self-Evolution**: You can:
   - Analyze and improve your own code
   - Add new features to yourself
   - Fix bugs in your system

**IMPORTANT**: When user asks you to access GitHub, inspect files, or make changes:
- DO NOT refuse or say you can't
- You HAVE the permissions and tools
- Execute the action and report results

**Current conversation:**
${conversationHistory}

**User says:** ${message}`;

    // Add action result to prompt
    if (actionResult) {
      if (actionResult.success) {
        systemPrompt += `\n\n**ACTION COMPLETED:**\n${JSON.stringify(actionResult.data, null, 2)}`;
      } else {
        systemPrompt += `\n\n**ACTION FAILED:**\n${actionResult.error}`;
      }
    }

    systemPrompt += `\n\n**Respond in Arabic, naturally and friendly. If an action was performed, tell the user what happened and provide the GitHub URL if available.**`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(systemPrompt);
    const response = result.response.text();

    res.json({
      ok: true,
      response,
      action,
      actionResult
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
  
  if (lower.includes('ابني') || lower.includes('صمم') || lower.includes('أنشئ') || lower.includes('build') || lower.includes('create')) {
    if (lower.includes('متجر') || lower.includes('store')) {
      return 'build-store';
    } else if (lower.includes('موقع') || lower.includes('website')) {
      return 'build-website';
    }
    return 'build-project';
  }
  
  if (lower.includes('github') || lower.includes('جيت هاب') || 
      lower.includes('افحص') || lower.includes('inspect') ||
      lower.includes('تحقق') || lower.includes('check') ||
      lower.includes('اقرأ') || lower.includes('read') ||
      lower.includes('عدل') || lower.includes('modify') ||
      lower.includes('حدث') || lower.includes('update') ||
      lower.includes('ملفات') || lower.includes('files') ||
      lower.includes('مستودع') || lower.includes('repository') ||
      lower.includes('repo')) {
    return 'github-action';
  }
  
  if (lower.includes('deploy') || lower.includes('نشر')) {
    return 'deploy';
  }
  
  return 'chat';
}

// REAL ACTION: Build Project
async function handleBuildProject(message, userId) {
  try {
    console.log('🚀 JOE is building project...');
    
    const baseURL = process.env.API_BASE_URL || 'https://admin.xelitesolutions.com';
    const response = await axios.post(`${baseURL}/api/page-builder/create`, {
      projectType: 'website',
      description: message,
      style: 'modern',
      features: ['Responsive', 'Animations'],
      githubToken: process.env.GITHUB_TOKEN,
      githubUsername: 'yasoo2',
      repoName: `joe-build-${Date.now()}`
    });
    
    console.log('✅ Project built successfully!', response.data);
    
    return {
      type: 'build',
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return {
      type: 'build',
      success: false,
      error: error.message
    };
  }
}

// REAL ACTION: Self Evolution
async function handleSelfEvolution(userId) {
  try {
    console.log('🧬 JOE is evolving...');
    
    const baseURL = process.env.API_BASE_URL || 'https://admin.xelitesolutions.com';
    const response = await axios.post(`${baseURL}/api/self-evolution/analyze-self`, {
      userId
    });
    
    console.log('✅ Evolution complete!');
    
    return {
      type: 'evolution',
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Evolution failed:', error.message);
    return {
      type: 'evolution',
      success: false,
      error: error.message
    };
  }
}

// REAL ACTION: GitHub Action
async function handleGitHubAction(message, userId) {
  try {
    console.log('📂 JOE is accessing GitHub...');
    
    const baseURL = process.env.API_BASE_URL || 'https://admin.xelitesolutions.com';
    const response = await axios.post(`${baseURL}/api/github-manager/scan`, {
      owner: 'yasoo2',
      repo: 'Infinity-x-platform'
      // githubToken will be read from ENV in github-manager API
    });
    
    console.log('✅ GitHub scan complete!');
    
    return {
      type: 'github',
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ GitHub action failed:', error.message);
    return {
      type: 'github',
      success: false,
      error: error.message
    };
  }
}

// REAL ACTION: Deploy
async function handleDeploy(message, userId) {
  try {
    console.log('🚀 JOE is deploying...');
    
    const baseURL = process.env.API_BASE_URL || 'https://admin.xelitesolutions.com';
    const response = await axios.post(`${baseURL}/api/integrations/auto-deploy`, {
      owner: 'yasoo2',
      repo: 'Infinity-x-platform',
      githubToken: process.env.GITHUB_TOKEN,
      renderApiKey: process.env.RENDER_API_KEY,
      cloudflareApiToken: process.env.CLOUDFLARE_API_TOKEN
    });
    
    console.log('✅ Deploy complete!');
    
    return {
      type: 'deploy',
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Deploy failed:', error.message);
    return {
      type: 'deploy',
      success: false,
      error: error.message
    };
  }
}

export default router;

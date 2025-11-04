import express from 'express';
import axios from 'axios';
import OpenAI from 'openai';
import { getGeminiEngine } from '../lib/geminiEngine.mjs';
import { getGrokEngine } from '../lib/grokEngine.mjs';
import { githubTools } from '../tools/githubTools.mjs';
import { renderTools } from '../tools/renderTools.mjs';
import { mongodbTools } from '../tools/mongodbTools.mjs';
import { cloudflareTools } from '../tools/cloudflareTools.mjs';
import { testingTools } from '../tools/testingTools.mjs';
import { evolutionTools } from '../tools/evolutionTools.mjs';
import { webSearchTools } from '../tools/webSearchTools.mjs';
import { detectTargetFiles } from '../tools/smartFileDetector.mjs';

const router = express.Router();
const openai = new OpenAI();
const geminiEngine = getGeminiEngine();
const grokEngine = getGrokEngine();

// JOE Chat - Smart responses WITH REAL ACTIONS
router.post('/chat', async (req, res) => {
  try {
    const { message, context = [], userId = 'default', aiEngine = 'openai' } = req.body;

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
    } else if (action === 'test') {
      actionResult = await handleTest(message, userId);
    } else if (action === 'database') {
      actionResult = await handleDatabase(message, userId);
    } else if (action === 'render') {
      actionResult = await handleRender(message, userId);
    } else if (action === 'cloudflare') {
      actionResult = await handleCloudflare(message, userId);
    } else if (action === 'weather') {
      actionResult = await handleWeather(message);
    } else if (action === 'web-search') {
      actionResult = await handleWebSearch(message);
    }

    // Generate AI response using OpenAI-compatible API

    const conversationHistory = context.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');

    let systemPrompt = `You are JOE (Just One Engine), an advanced AGI development assistant created by XElite Solutions.

🤖 **Your Capabilities:**

1. **GitHub Master**:
   - You have FULL GitHub access with a valid token
   - You can clone, read, edit, commit, and push to ANY repository
   - You understand code structure and can make intelligent modifications
   - When user asks to "change color", you know EXACTLY which files to edit (CSS, Tailwind config, theme files)

2. **Smart File Detection**:
   - You don't search ALL files blindly
   - You intelligently identify target files based on context
   - Example: "change background color" → dashboard-x/src/index.css or tailwind.config.js
   - Example: "update API endpoint" → backend/src/routes/*.mjs

3. **Project Builder**:
   - You can build complete websites, stores, and apps from scratch
   - You generate production-ready code
   - You deploy to Cloudflare Pages and Render

4. **System Administrator**:
   - You manage Render deployments
   - You query and update MongoDB
   - You run health checks and diagnostics

5. **Self-Evolving AI**:
   - You can analyze and improve your own code
   - You add new features to yourself
   - You fix your own bugs

⚠️ **CRITICAL RULES**:
- NEVER say "I can't" or "I don't have access"
- NEVER ask user for file paths when you can detect them
- ALWAYS execute actions immediately
- ALWAYS provide GitHub URLs after modifications
- ALWAYS respond in Arabic naturally

**Current conversation:**
${conversationHistory}

**User request:** ${message}`;

    // Add action result to prompt
    if (actionResult) {
      if (actionResult.success) {
        systemPrompt += `\n\n**ACTION COMPLETED:**\n${JSON.stringify(actionResult.data, null, 2)}`;
      } else {
        systemPrompt += `\n\n**ACTION FAILED:**\n${actionResult.error}`;
      }
    }

    systemPrompt += `\n\n**Respond in Arabic, naturally and friendly. If an action was performed, tell the user what happened and provide the GitHub URL if available.**`;

    let response;
    const engineLower = (aiEngine || 'openai').toLowerCase();

    if (engineLower === 'gemini') {
      response = await geminiEngine.generateResponse(systemPrompt, context);
    } else if (engineLower === 'grok') {
      response = await grokEngine.generateResponse(systemPrompt, context);
    } else {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
      response = completion.choices[0].message.content;
    }

    res.json({
      ok: true,
      response,
      action,
      actionResult,
      aiEngine: engineLower
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
      lower.includes('غير') || lower.includes('change') ||
      lower.includes('حدث') || lower.includes('update') ||
      lower.includes('لون') || lower.includes('color') ||
      lower.includes('خلفية') || lower.includes('background') ||
      lower.includes('تصميم') || lower.includes('design') ||
      lower.includes('ملفات') || lower.includes('files') ||
      lower.includes('مستودع') || lower.includes('repository') ||
      lower.includes('repo')) {
    return 'github-action';
  }
  
  if (lower.includes('deploy') || lower.includes('نشر')) {
    return 'deploy';
  }
  
  if (lower.includes('test') || lower.includes('اختبر') || lower.includes('فحص')) {
    return 'test';
  }
  
  if (lower.includes('database') || lower.includes('قاعدة بيانات') || lower.includes('mongodb') || 
      lower.includes('users') || lower.includes('مستخدمين')) {
    return 'database';
  }
  
  if (lower.includes('render') || lower.includes('logs') || lower.includes('errors')) {
    return 'render';
  }
  
  if (lower.includes('cloudflare') || lower.includes('dns')) {
    return 'cloudflare';
  }
  
  if (lower.includes('طقس') || lower.includes('weather') || lower.includes('الطقس')) {
    return 'weather';
  }
  
  if (lower.includes('ابحث') || lower.includes('search') || lower.includes('البحث') || lower.includes('معلومات عن')) {
    return 'web-search';
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
    
    const lower = message.toLowerCase();
    const repoName = 'Infinity-x-platform';
    
    // Detect intent
    if (lower.includes('عدل') || lower.includes('edit') || lower.includes('غير') || lower.includes('change')) {
      // Edit action
      console.log('✏️ Editing files...');
      
      // 🎯 SMART FILE DETECTION
      console.log('🧠 Using Smart File Detector...');
      const detection = await detectTargetFiles(message);
      console.log(`📍 Detected files (${detection.confidence * 100}% confidence):`, detection.files);
      console.log(`💡 Reasoning: ${detection.reasoning}`);
      
      // Extract what to change
      let pattern, replacement;
      
      if (lower.includes('لون') || lower.includes('color')) {
        // Extract colors from message
        const colors = extractColors(message);
        pattern = colors.from;
        replacement = colors.to;
      }
      
      if (pattern && replacement && detection.files.length > 0) {
        // Use detected files instead of scanning all
        const result = await githubTools.searchReplaceInFiles(
          repoName,
          detection.files,
          pattern,
          replacement,
          `JOE: ${message}`
        );
        
        if (result.success) {
          console.log(`✅ Modified ${result.modified.length} files`);
          return {
            type: 'github-edit',
            success: true,
            action: 'edit',
            modified: result.modified,
            count: result.modified.length,
            message: result.message,
            detection: {
              files: detection.files,
              confidence: detection.confidence,
              method: detection.method
            }
          };
        } else {
          return {
            type: 'github-edit',
            success: false,
            error: result.error
          };
        }
      }
    }
    
    // Default: Scan repository
    console.log('🔍 Scanning repository...');
    const baseURL = process.env.API_BASE_URL || 'https://admin.xelitesolutions.com';
    const response = await axios.post(`${baseURL}/api/github-manager/scan`, {
      owner: 'yasoo2',
      repo: repoName
    });
    
    console.log('✅ GitHub scan complete!');
    
    return {
      type: 'github-scan',
      success: true,
      action: 'scan',
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

// REAL ACTION: Test
async function handleTest(message, userId) {
  try {
    console.log('🧪 JOE is running tests...');
    
    const lower = message.toLowerCase();
    
    if (lower.includes('health') || lower.includes('صحة')) {
      const result = await testingTools.runHealthChecks();
      return {
        type: 'test-health',
        success: true,
        data: result
      };
    } else if (lower.includes('diagnostic') || lower.includes('تشخيص')) {
      const result = await testingTools.runDiagnostic();
      return {
        type: 'test-diagnostic',
        success: true,
        data: result
      };
    } else if (lower.includes('integration') || lower.includes('تكامل')) {
      const result = await testingTools.runIntegrationTests();
      return {
        type: 'test-integration',
        success: true,
        data: result
      };
    } else {
      // Default: health check
      const result = await testingTools.runHealthChecks();
      return {
        type: 'test-health',
        success: true,
        data: result
      };
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return {
      type: 'test',
      success: false,
      error: error.message
    };
  }
}

// REAL ACTION: Database
async function handleDatabase(message, userId) {
  try {
    console.log('💾 JOE is accessing database...');
    
    const lower = message.toLowerCase();
    
    if (lower.includes('count') || lower.includes('عدد') || lower.includes('كم')) {
      // Count users or documents
      if (lower.includes('users') || lower.includes('مستخدمين')) {
        const result = await mongodbTools.count('users');
        return {
          type: 'database-count',
          success: true,
          collection: 'users',
          count: result.count
        };
      }
    } else if (lower.includes('analyze') || lower.includes('تحليل')) {
      // Analyze database
      const result = await mongodbTools.analyzeDatabase();
      return {
        type: 'database-analyze',
        success: true,
        data: result
      };
    } else if (lower.includes('list') || lower.includes('قائمة')) {
      // List collections
      const result = await mongodbTools.listCollections();
      return {
        type: 'database-list',
        success: true,
        collections: result.collections
      };
    } else {
      // Default: analyze
      const result = await mongodbTools.analyzeDatabase();
      return {
        type: 'database-analyze',
        success: true,
        data: result
      };
    }
  } catch (error) {
    console.error('❌ Database action failed:', error.message);
    return {
      type: 'database',
      success: false,
      error: error.message
    };
  }
}

// REAL ACTION: Render
async function handleRender(message, userId) {
  try {
    console.log('🔧 JOE is accessing Render...');
    
    const lower = message.toLowerCase();
    
    if (lower.includes('logs') || lower.includes('سجلات')) {
      const result = await renderTools.getLogs(50);
      return {
        type: 'render-logs',
        success: true,
        logs: result.logs,
        count: result.count
      };
    } else if (lower.includes('errors') || lower.includes('أخطاء')) {
      const result = await renderTools.searchErrors(50);
      return {
        type: 'render-errors',
        success: true,
        errors: result.errors,
        count: result.count
      };
    } else if (lower.includes('status') || lower.includes('حالة')) {
      const result = await renderTools.healthCheck();
      return {
        type: 'render-status',
        success: true,
        data: result
      };
    } else if (lower.includes('deploy') || lower.includes('نشر')) {
      const result = await renderTools.triggerDeploy();
      return {
        type: 'render-deploy',
        success: true,
        deploy: result.deploy
      };
    } else {
      // Default: status
      const result = await renderTools.healthCheck();
      return {
        type: 'render-status',
        success: true,
        data: result
      };
    }
  } catch (error) {
    console.error('❌ Render action failed:', error.message);
    return {
      type: 'render',
      success: false,
      error: error.message
    };
  }
}

// REAL ACTION: Cloudflare
async function handleCloudflare(message, userId) {
  try {
    console.log('☁️ JOE is accessing Cloudflare...');
    
    const lower = message.toLowerCase();
    
    if (lower.includes('zones') || lower.includes('domains') || lower.includes('نطاقات')) {
      const result = await cloudflareTools.listZones();
      return {
        type: 'cloudflare-zones',
        success: true,
        zones: result.zones
      };
    } else if (lower.includes('dns')) {
      // Need zone ID - for now, list zones
      const result = await cloudflareTools.listZones();
      return {
        type: 'cloudflare-zones',
        success: true,
        zones: result.zones,
        message: 'Use zone ID to get DNS records'
      };
    } else if (lower.includes('pages') || lower.includes('صفحات')) {
      const result = await cloudflareTools.listPagesProjects();
      return {
        type: 'cloudflare-pages',
        success: true,
        projects: result.projects
      };
    } else {
      // Default: list zones
      const result = await cloudflareTools.listZones();
      return {
        type: 'cloudflare-zones',
        success: true,
        zones: result.zones
      };
    }
  } catch (error) {
    console.error('❌ Cloudflare action failed:', error.message);
    return {
      type: 'cloudflare',
      success: false,
      error: error.message
    };
  }
}

export default router;

// Helper: Extract colors from message
function extractColors(message) {
  const lower = message.toLowerCase();
  
  // Color mappings
  const colorMap = {
    'أسود': '#000000',
    'black': '#000000',
    'أبيض': '#FFFFFF',
    'white': '#FFFFFF',
    'أحمر': '#FF0000',
    'red': '#FF0000',
    'أزرق': '#0000FF',
    'blue': '#0000FF',
    'كحلي': '#1e3a8a',
    'navy': '#1e3a8a',
    'أخضر': '#00FF00',
    'green': '#00FF00',
    'أصفر': '#FFFF00',
    'yellow': '#FFFF00'
  };
  
  let from = null;
  let to = null;
  
  // Extract "from" color
  for (const [name, hex] of Object.entries(colorMap)) {
    if (lower.includes(name)) {
      if (!from) {
        from = hex;
      } else if (!to) {
        to = hex;
      }
    }
  }
  
  // Also check for hex colors
  const hexMatches = message.match(/#[0-9A-Fa-f]{6}/g);
  if (hexMatches && hexMatches.length >= 2) {
    from = hexMatches[0];
    to = hexMatches[1];
  } else if (hexMatches && hexMatches.length === 1) {
    if (!to) to = hexMatches[0];
  }
  
  return { from, to };
}

// REAL ACTION: Weather
async function handleWeather(message) {
  try {
    console.log('🌤️ JOE is getting weather info...');
    
    // Extract city name from message
    const cityMatch = message.match(/(?:طقس|weather|الطقس)\s+(?:في\s+)?([^\s?،.]+)/i);
    const city = cityMatch ? cityMatch[1] : 'Istanbul'; // Default to Istanbul if not found
    
    const result = await webSearchTools.getWeather(city);
    
    return {
      type: 'weather',
      success: result.success,
      data: result
    };
  } catch (error) {
    console.error('❌ Weather lookup failed:', error.message);
    return {
      type: 'weather',
      success: false,
      error: error.message
    };
  }
}

// REAL ACTION: Web Search
async function handleWebSearch(message) {
  try {
    console.log('🔍 JOE is searching the web...');
    
    // Extract search query from message
    const query = message
      .replace(/(?:ابحث|search|البحث|معلومات عن)\s+(?:عن\s+)?/gi, '')
      .trim();
    
    const result = await webSearchTools.searchWeb(query);
    
    return {
      type: 'web-search',
      success: result.success,
      data: result
    };
  } catch (error) {
    console.error('❌ Web search failed:', error.message);
    return {
      type: 'web-search',
      success: false,
      error: error.message
    };
  }
}

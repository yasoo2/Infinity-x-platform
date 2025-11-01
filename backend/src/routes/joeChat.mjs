import express from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { githubTools } from '../tools/githubTools.mjs';
import { renderTools } from '../tools/renderTools.mjs';
import { mongodbTools } from '../tools/mongodbTools.mjs';
import { cloudflareTools } from '../tools/cloudflareTools.mjs';
import { testingTools } from '../tools/testingTools.mjs';
import { evolutionTools } from '../tools/evolutionTools.mjs';

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
    } else if (action === 'test') {
      actionResult = await handleTest(message, userId);
    } else if (action === 'database') {
      actionResult = await handleDatabase(message, userId);
    } else if (action === 'render') {
      actionResult = await handleRender(message, userId);
    } else if (action === 'cloudflare') {
      actionResult = await handleCloudflare(message, userId);
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
      
      // Extract what to change
      // Example: "عدل اللون الكحلي إلى أزرق"
      let pattern, replacement;
      
      if (lower.includes('لون') || lower.includes('color')) {
        // Color change
        if (lower.includes('كحلي') || lower.includes('#2196F3')) {
          pattern = '#2196F3|#2196F3';
          
          if (lower.includes('أزرق فاتح') || lower.includes('light blue')) {
            replacement = '#2196F3';
          } else if (lower.includes('أزرق') || lower.includes('blue')) {
            replacement = '#2196F3';
          }
        }
      }
      
      if (pattern && replacement) {
        const result = await githubTools.searchReplaceAndPush(
          repoName,
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
            message: result.message
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

export default router;

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

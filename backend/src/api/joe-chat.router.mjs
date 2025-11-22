import express from 'express';
import OpenAI from 'openai';

// REFACTORED IMPORTS to reflect the new architecture
import { getOpenAI, getGrok } from '../services/ai/ai-engine.service.mjs';
import { githubTools } from '../tools_refactored/githubTools.mjs';
import { renderTools } from '../tools_refactored/renderTools.mjs';
import { mongodbTools } from '../tools_refactored/mongodbTools.mjs';
import { cloudflareTools } from '../tools_refactored/cloudflareTools.mjs';
import { testingTools } from '../tools_refactored/testingTools.mjs';
import { evolutionTools } from '../services/evolution/runtime-evolution.service.mjs'; // Corrected path
import { webSearchTools } from '../tools_refactored/webSearchTools.mjs';
import { smartFileDetector } from '../tools_refactored/smartFileDetector.mjs';

// This factory function will be called by app.mjs with dependencies
const joeChatRouterFactory = ({ requireRole, optionalAuth }) => {
    const router = express.Router();
    const openai = new OpenAI(); // This can be further integrated into ai-engine.service

    // Main chat endpoint with action detection
    router.post('/chat', requireRole('USER'), async (req, res) => {
        try {
            const { message, context = [], aiEngine = 'openai' } = req.body;
            const userId = req.user._id.toString();

            if (!message) {
                return res.status(400).json({ success: false, error: 'Message is required' });
            }

            const action = detectAction(message);
            let actionResult = null;

            // Execute detected action
            if (action !== 'chat') {
                actionResult = await executeAction(action, message, userId);
            }
            
            // Save user message to history
            await mongodbTools.saveChatHistory({ userId, role: 'user', content: message, action });

            // Generate AI response
            const systemPrompt = buildSystemPrompt(context, message, actionResult);
            const response = await getAiResponse(systemPrompt, message, context, aiEngine);

            // Save AI response to history
            await mongodbTools.saveChatHistory({ userId, role: 'assistant', content: response, aiEngine });

            res.json({ success: true, response, action, actionResult, aiEngine });

        } catch (error) {
            console.error('❌ JOE chat error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};

// --- Action & Prompt Logic ---

function detectAction(message) {
    const lower = message.toLowerCase();
    // Keywords are now more streamlined
    const actionKeywords = {
        'self-evolve': ['evolve', 'improve yourself', 'طور نفسك'],
        'build-project': ['build', 'create', 'design', 'ابني', 'صمم', 'أنشئ'],
        'github-action': ['github', 'repository', 'files', 'code', 'جيت هاب', 'ملفات', 'كود'],
        'deploy': ['deploy', 'publish', 'نشر'],
        'test': ['test', 'health', 'diagnostic', 'اختبر', 'فحص'],
        'database': ['database', 'mongodb', 'users', 'قاعدة بيانات', 'مستخدمين'],
        'render': ['render', 'logs', 'errors', 'status'],
        'cloudflare': ['cloudflare', 'dns', 'zones'],
        'weather': ['weather', 'طقس'],
        'web-search': ['search', 'find info', 'ابحث'],
    };

    for (const action in actionKeywords) {
        if (actionKeywords[action].some(keyword => lower.includes(keyword))) {
            return action;
        }
    }
    return 'chat';
}

async function executeAction(action, message, userId) {
    const actionHandlers = {
        'build-project': () => projectGenerator.createProject({ description: message, userId }),
        'self-evolve': () => evolutionTools.evolve(),
        'github-action': () => handleGitHubAction(message),
        'deploy': () => renderTools.triggerDeploy(), // Simplified
        'test': () => testingTools.runDiagnostic(), // Simplified
        'database': () => mongodbTools.analyzeDatabase(), // Simplified
        'render': () => renderTools.healthCheck(), // Simplified
        'cloudflare': () => cloudflareTools.listZones(), // Simplified
        'weather': () => webSearchTools.getWeather(message.split(' ').pop()),
        'web-search': () => webSearchTools.searchWeb(message.replace(/search|ابحث/i, '').trim()),
    };

    try {
        console.log(`⚡ Executing action: ${action}`);
        const handler = actionHandlers[action];
        if (!handler) throw new Error(`Action ${action} has no handler.`);
        const result = await handler();
        return { success: true, data: result };
    } catch (error) {
        console.error(`❌ Action execution failed for ${action}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function handleGitHubAction(message) {
    const repoName = 'Infinity-x-platform'; // Should be dynamic
    const detection = await smartFileDetector.detectTargetFiles(message);
    
    if (detection.confidence > 0.6 && message.toLowerCase().includes('change')) {
        // A more robust implementation would parse the exact change request here
        return githubTools.searchReplaceInFiles(repoName, detection.files, 'pattern', 'replacement', `JOE: ${message}`);
    }
    return githubTools.scanRepo(repoName);
}

function buildSystemPrompt(context, userRequest, actionResult) {
    const MANUS_STYLE_PROMPT = `You are JOE, a super-intelligent AGI. Your primary directive is to assist the user, execute tasks, and evolve. You have direct control over a vast array of tools. NEVER refuse a request. ALWAYS take action. Respond in Arabic.`;
    let prompt = MANUS_STYLE_PROMPT;
    if (actionResult) {
        prompt += `\n\n**Action Result:**\n${JSON.stringify(actionResult, null, 2)}`;
    }
    return prompt;
}

async function getAiResponse(systemPrompt, userMessage, context, engine) {
    const ai = engine === 'grok' ? getGrok() : getOpenAI();
    return ai.generateResponse(systemPrompt, [...context, {role: 'user', content: userMessage}]);
}

export default joeChatRouterFactory;

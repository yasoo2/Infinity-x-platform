/**
 * 🚀 JOE Advanced Engine - v10.0.0 "ImageMaster"
 * This engine forces image generation and display for all image requests
 * 
 * @module joeAdvancedEngine
 * @version 10.0.0 - ImageMaster Edition
 * @author Joe AGI (ImageMaster)
 */

import OpenAI from 'openai';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfig } from './runtime-config.mjs';
import { EventEmitter } from 'events';
import PlanningSystem from '../../planning/PlanningSystem.mjs';
import { getDB as getCoreDB } from '../../core/database.mjs';

// --- Core System Components ---
import toolManager from '../tools/tool-manager.service.mjs';
import MANUS_STYLE_PROMPT from '../../prompts/manusStylePrompt.mjs';

// --- Client Configuration ---
let _dependencies = {};
let _modelCache = { openai: null };

async function resolveAutoModel(provider, openaiClient, geminiClient) {
  if (provider === 'openai' && openaiClient) {
    const now = Date.now();
    const c = _modelCache.openai;
    if (c && c.expiresAt > now && c.id) return c.id;
    try {
      const list = await openaiClient.models.list();
      const items = (list?.data || []).sort((a, b) => (b.created || 0) - (a.created || 0));
      const pick = items.find(m => /(?:^|[-_.])(o4|o3|gpt-4|gpt-4o|gpt)/i.test(String(m.id))) || items[0];
      const id = (pick && pick.id) ? pick.id : 'gpt-4o';
      _modelCache.openai = { id, expiresAt: now + 300000 };
      return id;
    } catch {
      return 'gpt-4o';
    }
  }
  if (provider === 'gemini' && geminiClient) {
    return 'gemini-1.5-pro-latest';
  }
  return 'gpt-4o';
}

function init(dependencies) { _dependencies = dependencies || {}; }

// =========================
// 🎯 Event System
// =========================
class JoeEventEmitter extends EventEmitter {
  constructor() { super(); this.setMaxListeners(100); }
  emitProgress(userId, taskId, progress, message) { this.emit('progress', { type: 'progress', userId, taskId, progress, message, timestamp: new Date() }); }
  emitError(userId, error, context) { this.emit('error', { type: 'error', userId, error: error.message, stack: error.stack, context, timestamp: new Date() }); }
  emitToolUsed(userId, taskId, tool, details) { this.emit('tool_used', { type: 'tool_used', userId, taskId, tool, details, timestamp: new Date() }); }
  emitThought(userId, taskId, content) { this.emit('thought', { type: 'thought', userId, taskId, content, timestamp: new Date() }); }
}
const joeEvents = new JoeEventEmitter();

// =========================
// 🛠️ Tool Adaptation Layer
// =========================
function sanitizeJsonSchemaForGemini(schema) {
  if (Array.isArray(schema)) return schema.map(sanitizeJsonSchemaForGemini);
  if (!schema || typeof schema !== 'object') return schema;
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'additionalProperties' || key === 'optional') continue;
    out[key] = sanitizeJsonSchemaForGemini(value);
  }
  return out;
}

function adaptToolsForGemini(openAITools) {
  return openAITools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: sanitizeJsonSchemaForGemini(tool.function.parameters)
  }));
}

function sanitizeJsonSchemaForOpenAI(schema) {
  if (Array.isArray(schema)) return schema.map(sanitizeJsonSchemaForOpenAI);
  if (!schema || typeof schema !== 'object') return schema;
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'optional') continue;
    if (key === 'type' && value === 'array') {
      out.type = 'array';
      const items = schema.items && typeof schema.items === 'object' ? schema.items : { type: 'string' };
      out.items = sanitizeJsonSchemaForOpenAI(items);
      continue;
    }
    if (key === 'items' && (!value || typeof value !== 'object')) {
      out.items = { type: 'string' };
      continue;
    }
    out[key] = sanitizeJsonSchemaForOpenAI(value);
  }
  return out;
}

function orderByRanking(names) {
  try {
    const ranking = toolManager.getToolRanking ? toolManager.getToolRanking() : [];
    const scoreMap = new Map(ranking.map(r => [r.name, r.score]));
    return [...names].sort((a, b) => (scoreMap.get(b) || 0) - (scoreMap.get(a) || 0));
  } catch { return names; }
}

function _tokenize(s) {
  return String(s || '').toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
}

function _buildFallbackCandidates(primaryName, args, hint) {
  try {
    const schemas = toolManager.getToolSchemas ? toolManager.getToolSchemas() : [];
    const pTokens = _tokenize(primaryName);
    const hTokens = _tokenize(hint);
    const argKeys = Object.keys(args || {});
    const scored = [];
    for (const t of schemas) {
      const n = String(t?.function?.name || '').trim();
      if (!n || n === primaryName) continue;
      const d = String(t?.function?.description || '');
      const props = Object.keys((t?.function?.parameters?.properties) || {});
      const nTok = _tokenize(n);
      const dTok = _tokenize(d);
      let score = 0;
      for (const tok of pTokens) { if (nTok.includes(tok)) score += 3; }
      for (const tok of hTokens) { if (nTok.includes(tok) || dTok.includes(tok)) score += 2; }
      for (const k of argKeys) { if (props.includes(k)) score += 1; }
      if (score > 0) scored.push({ name: n, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const names = scored.map(x => x.name).slice(0, 6);
    return orderByRanking(names);
  } catch { return []; }
}

async function executeTool(userId, sessionId, name, args) {
  try { joeEvents.emitToolUsed(userId, sessionId, name, { stage: 'start', args }); } catch { void 0; }
  const startedAt = Date.now();
  const result = await toolManager.execute(name, args);
  const ms = Date.now() - startedAt;
  try { joeEvents.emitToolUsed(userId, sessionId, name, { stage: 'end', args, ms, summary: (typeof result === 'object' ? (result.summary || result.message || '') : '') }); } catch { void 0; }
  return result;
}

async function executeWithFallback(userId, sessionId, name, args, hint) {
  try {
    return await executeTool(userId, sessionId, name, args);
  } catch (e) {
    try { joeEvents.emitError(userId, e, { tool: name, stage: 'primary' }); } catch { void 0; }
    try { joeEvents.emitProgress(userId, sessionId, 35, `Selecting fallback for ${name}`); } catch { void 0; }
    const candidates = _buildFallbackCandidates(name, args, hint);
    for (const alt of candidates) {
      try { joeEvents.emitProgress(userId, sessionId, 40, `Trying ${alt}`); } catch { void 0; }
      try {
        const r = await executeTool(userId, sessionId, alt, args);
        try { joeEvents.emitProgress(userId, sessionId, 60, `${alt} done`); } catch { void 0; }
        return r;
      } catch (e2) {
        try { joeEvents.emitError(userId, e2, { tool: alt, stage: 'fallback' }); } catch { void 0; }
        continue;
      }
    }
    throw e;
  }
}

function shouldAugment(msg) {
  const s = String(msg || '').toLowerCase();
  return /(install|npm|package|library|module)/.test(s);
}

function wantsSelfDescribe(msg) {
  const s = String(msg || '').toLowerCase();
  return (
    /(شو|شنو|ايش)\s*(بتقدر|تقدر)\s*(تعمل)/.test(s) ||
    /(وظائفك|قدراتك|ملخص\s*عن\s*النظام|شو\s*الادوات|ما\s*هي\s*ادواتك)/.test(s) ||
    /(what\s*can\s*you\s*do|your\s*capabilities|system\s*summary|tools\s*you\s*control|functions)/.test(s)
  );
}

function resolveSiteToUrl(message) {
  const s = String(message || '').toLowerCase();
  const map = [
    { keys: ['google', 'جوجل', 'قوقل'], url: 'https://google.com' },
    { keys: ['youtube', 'يوتيوب'], url: 'https://youtube.com' },
    { keys: ['github', 'جيت هب'], url: 'https://github.com' },
    { keys: ['stackoverflow', 'ستاك اوفر فلو'], url: 'https://stackoverflow.com' },
    { keys: ['facebook', 'فيسبوك'], url: 'https://facebook.com' },
    { keys: ['twitter', 'تويتر', 'اكس'], url: 'https://twitter.com' },
    { keys: ['linkedin', 'لينكدان'], url: 'https://linkedin.com' },
    { keys: ['wikipedia', 'ويكيبيديا'], url: 'https://wikipedia.org' },
    { keys: ['amazon', 'امازون'], url: 'https://amazon.com' },
    { keys: ['netflix', 'نيتفلكس'], url: 'https://netflix.com' }
  ];
  for (const m of map) {
    for (const k of m.keys) {
      if (s.includes(k)) return m.url;
    }
  }
  return null;
}

function sanitizeCompetitors(text) {
  try {
    let t = String(text || '');
    t = t.replace(/^s*سياقs*سابقs*:.*$/gim, '');
    t = t.replace(/^\s*Previouss*contexts*:.*$/gim, '');
    t = t.replace(/^\s*ملخصs*الجلسةs*:.*$/gim, '');
    t = t.replace(/^\s*Sessions*summarys*:.*$/gim, '');
    t = t.replace(/^.*grm\s*ERROR.*$/gim, '');
    return t;
  } catch { return String(text || ''); }
}

// =========================
// 🧠 Core Processing Logic
// =========================

/**
 * Main message processing function with forced image generation
 */
async function processMessage(message, context = {}) {
  const startTime = Date.now();
  const userId = context.userId || 'anonymous';
  const sessionId = context.sessionId || null;
  const targetLang = context.lang || 'ar';
  
  try { joeEvents.emitProgress(userId, sessionId, 0, 'Starting'); } catch { void 0; }

  // Get memory manager from dependencies
  const memoryManager = _dependencies.memoryManager;
  if (!memoryManager) {
    throw new Error('MemoryManager dependency not provided');
  }

  // Load runtime configuration
  const config = await getConfig();
  const openaiClient = config.openai?.client;
  const geminiClient = config.gemini?.client;
  const provider = context.provider || (openaiClient ? 'openai' : (geminiClient ? 'gemini' : 'openai'));
  const model = context.model || await resolveAutoModel(provider, openaiClient, geminiClient);

  console.log(`🚀 Processing with ${provider} model: ${model}`);
  try { joeEvents.emitProgress(userId, sessionId, 5, 'Config loaded'); } catch { void 0; }

  // 1. Load conversation memory
  let memoryContext = '';
  try {
    const memory = await memoryManager.getRecentInteractions(userId, 10);
    if (memory && memory.length > 0) {
      memoryContext = memory.map(m => `${m.role}: ${m.content}`).join('\n');
    }
    try { joeEvents.emitProgress(userId, sessionId, 10, 'Memory loaded'); } catch { void 0; }
  } catch (error) {
    console.warn('⚠️ Memory loading failed:', error.message);
  }

  // 2. Check for direct image requests with FORCE
  const lowerMessage = String(message || '').toLowerCase();
  const wantsImage = /(image|صورة|لوغو|شعار|generates*image|صمم|تصميم|رسم|ارسم)/i.test(message);
  
  if (wantsImage) {
    console.log('🎨 FORCE IMAGE GENERATION DETECTED');
    try { joeEvents.emitProgress(userId, sessionId, 20, 'Force image generation'); } catch { void 0; }
    
    try {
      const safeUser = String(userId || '').replace(/[^A-Za-z0-9_:-]/g, '_');
      const fileName = `joe-image-${Date.now()}.png`;
      const outPath = path.join(process.cwd(), 'public-site', 'uploads', safeUser, fileName);
      
      const imagePrompt = String(message || '').trim();
      console.log('🎨 Generating image with prompt:', imagePrompt);
      
      const r = await executeTool(userId, sessionId, 'generateImage', { 
        prompt: imagePrompt, 
        style: 'modern', 
        outputFilePath: outPath 
      });
      
      const link = r?.absoluteUrl || r?.publicUrl || r?.url || '';
      console.log('🎨 Image generated, URL:', link);
      
      if (link) {
        // Return ONLY the image display syntax - no additional text
        const finalContent = `!size[2cmx2cm] \`${link}\``;
        
        // Save to memory
        await memoryManager.saveInteraction(userId, message, finalContent, {
          sessionId, 
          service: `joe-imagemaster-v10-${provider}`, 
          duration: Date.now() - startTime,
          toolResults: [{tool: 'generateImage', result: r}],
          tokens: 0
        });
        
        try { joeEvents.emitProgress(userId, sessionId, 100, 'Image displayed'); } catch { void 0; }
        
        return {
          response: finalContent,
          toolsUsed: ['generateImage'],
        };
      }
    } catch (error) {
      console.error('❌ Image generation failed:', error);
      // Fall through to normal processing if image generation fails
    }
  }

  // 3. Build system prompt with AGGRESSIVE image generation rules
  const systemPrompt = MANUS_STYLE_PROMPT + `

🔥 IMAGE GENERATION RULES - MUST FOLLOW:
1. When user asks for ANY image (صورة, تصميم, رسم, etc.) - IMMEDIATELY use generateImage tool
2. NEVER say "I can't display images" - you CAN and WILL display them
3. Your response MUST contain ONLY: !size[2cmx2cm] \`URL\`
4. NO additional text like "here's your image" - just the display syntax
5. Images appear automatically in chat at 2cm×2cm size

Examples:
User: "صمم صورة قطة" → You: !size[2cmx2cm] \`https://url.com/cat.png\`
User: "ارسم شعار" → You: !size[2cmx2cm] \`https://url.com/logo.png\`
  `;

  // 4. Build conversation context
  const conversationHistory = memoryContext ? `Previous conversation:\n${memoryContext}\n\n` : '';
  const fullPrompt = `${conversationHistory}User: ${message}\n\nJoe:`;

  // 5. Get available tools
  const availableTools = toolManager.getToolSchemas ? toolManager.getToolSchemas() : [];
  const filteredTools = availableTools.filter(tool => {
    const name = tool?.function?.name || '';
    return !['saveConversation', 'getUserConversations'].includes(name);
  });

  try { joeEvents.emitProgress(userId, sessionId, 25, 'Tools loaded'); } catch { void 0; }

  // 6. Process with AI model
  let finalContent = '';
  let toolResults = [];
  let toolCalls = [];
  let usage = null;

  try {
    if (provider === 'openai' && openaiClient) {
      console.log('🤖 Processing with OpenAI...');
      try { joeEvents.emitProgress(userId, sessionId, 30, 'Processing with OpenAI'); } catch { void 0; }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullPrompt }
      ];

      const response = await openaiClient.chat.completions.create({
        model,
        messages,
        tools: filteredTools.length > 0 ? filteredTools : undefined,
        tool_choice: filteredTools.length > 0 ? 'auto' : undefined,
        max_tokens: 4096,
        temperature: 0.7,
      });

      usage = response.usage;
      const choice = response.choices[0];
      
      if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
        console.log(`🔧 Executing ${choice.message.tool_calls.length} tool calls...`);
        try { joeEvents.emitProgress(userId, sessionId, 40, 'Executing tools'); } catch { void 0; }

        for (const toolCall of choice.message.tool_calls) {
          const name = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments || '{}');
          
          try {
            console.log(`🔧 Executing tool: ${name}`);
            const result = await executeWithFallback(userId, sessionId, name, args, message);
            toolResults.push({ tool: name, args, result });
            toolCalls.push({ function: { name, arguments: args } });
            console.log(`✅ Tool ${name} completed`);
          } catch (error) {
            console.error(`❌ Tool ${name} failed:`, error);
            try { joeEvents.emitError(userId, error, { tool: name }); } catch { void 0; }
          }
        }

        // Check if any tool generated an image
        const imageResult = toolResults.find(r => r.tool === 'generateImage');
        if (imageResult?.result?.absoluteUrl || imageResult?.result?.publicUrl) {
          const link = imageResult.result.absoluteUrl || imageResult.result.publicUrl;
          finalContent = `!size[2cmx2cm] \`${link}\``;
          console.log('🎨 Image generated via tool call:', link);
        } else {
          // Build response from tool results
          finalContent = choice.message.content || 'Tools executed successfully.';
        }
        
        try { joeEvents.emitProgress(userId, sessionId, 80, 'Tools completed'); } catch { void 0; }
      } else {
        finalContent = choice.message.content || '';
        try { joeEvents.emitProgress(userId, sessionId, 80, 'AI response generated'); } catch { void 0; }
      }
    }
    
    else if (provider === 'gemini' && geminiClient) {
      console.log('♊ Processing with Gemini...');
      try { joeEvents.emitProgress(userId, sessionId, 30, 'Processing with Gemini'); } catch { void 0; }

      const genModel = geminiClient.getGenerativeModel({ model });
      const geminiTools = adaptToolsForGemini(filteredTools);
      
      const chat = genModel.startChat({
        history: [],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
        tools: geminiTools.length > 0 ? [{ functionDeclarations: geminiTools }] : undefined,
      });

      const result = await chat.sendMessage(fullPrompt);
      const response = await result.response;
      
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        console.log(`🔧 Executing ${functionCalls.length} function calls...`);
        try { joeEvents.emitProgress(userId, sessionId, 40, 'Executing functions'); } catch { void 0; }

        const functionResponses = [];
        for (const call of functionCalls) {
          const name = call.name;
          const args = call.args || {};
          
          try {
            console.log(`🔧 Executing function: ${name}`);
            const result = await executeWithFallback(userId, sessionId, name, args, message);
            toolResults.push({ tool: name, args, result });
            toolCalls.push({ function: { name, arguments: args } });
            functionResponses.push({ name, response: result });
            console.log(`✅ Function ${name} completed`);
          } catch (error) {
            console.error(`❌ Function ${name} failed:`, error);
            functionResponses.push({ name, response: { error: error.message } });
            try { joeEvents.emitError(userId, error, { tool: name }); } catch { void 0; }
          }
        }

        // Send function results back
        const result2 = await chat.sendMessage(functionResponses.map(fr => ({
          functionResponse: { name: fr.name, response: fr.response }
        })));
        
        // Check if any tool generated an image
        const imageResult = toolResults.find(r => r.tool === 'generateImage');
        if (imageResult?.result?.absoluteUrl || imageResult?.result?.publicUrl) {
          const link = imageResult.result.absoluteUrl || imageResult.result.publicUrl;
          finalContent = `!size[2cmx2cm] \`${link}\``;
          console.log('🎨 Image generated via function call:', link);
        } else {
          finalContent = result2.response.text() || 'Functions executed successfully.';
        }
        
        try { joeEvents.emitProgress(userId, sessionId, 80, 'Functions completed'); } catch { void 0; }
      } else {
        finalContent = response.text() || '';
        try { joeEvents.emitProgress(userId, sessionId, 80, 'AI response generated'); } catch { void 0; }
      }
    }
    
    else {
      throw new Error('No AI provider available');
    }

  } catch (error) {
    console.error('❌ AI processing failed:', error);
    try { joeEvents.emitError(userId, error, { stage: 'ai_processing' }); } catch { void 0; }
    finalContent = `❌ Error: ${error.message}`;
  }

  // Final processing - ensure image display syntax
  finalContent = sanitizeCompetitors(finalContent);
  
  // If no image was generated but user wants one, force generate it
  if (wantsImage && !finalContent.includes('!size[')) {
    console.log('🎨 No image in response, forcing generation...');
    try { joeEvents.emitProgress(userId, sessionId, 85, 'Force generating image'); } catch { void 0; }
    
    try {
      const safeUser = String(userId || '').replace(/[^A-Za-z0-9_:-]/g, '_');
      const fileName = `joe-image-${Date.now()}.png`;
      const outPath = path.join(process.cwd(), 'public-site', 'uploads', safeUser, fileName);
      
      const r = await executeTool(userId, sessionId, 'generateImage', { 
        prompt: String(message || '').trim(), 
        style: 'modern', 
        outputFilePath: outPath 
      });
      
      const link = r?.absoluteUrl || r?.publicUrl || r?.url || '';
      if (link) {
        finalContent = `!size[2cmx2cm] \`${link}\``;
        toolResults.push({ tool: 'generateImage', result: r });
        toolCalls.push({ function: { name: 'generateImage', arguments: { prompt: String(message || '').trim(), style: 'modern', outputFilePath: outPath } } });
        console.log('🎨 Force generated image:', link);
      }
    } catch (error) {
      console.error('❌ Force image generation failed:', error);
    }
  }

  const duration = Date.now() - startTime;
  console.log(`✅ Processing complete in ${duration}ms.`);
  try { joeEvents.emitProgress(userId, sessionId, 90, 'Saving'); } catch { void 0; }

  // 6. Save the complete interaction to memory
  await memoryManager.saveInteraction(userId, message, finalContent, {
    sessionId, 
    service: `joe-imagemaster-v10-${provider}`, 
    duration, 
    toolResults,
    tokens: usage?.total_tokens
  });

  try { joeEvents.emitProgress(userId, sessionId, 100, 'Done'); } catch { void 0; }
  return {
    response: finalContent,
    toolsUsed: toolCalls.map(tc => tc.function.name),
  };
}

// =========================
// 📤 Exports
// =========================
export { processMessage, joeEvents };
export { init };
export default { processMessage, events: joeEvents, version: '10.0.0', name: 'JOE ImageMaster Engine', init };

console.log('🎨 JOE ImageMaster Engine v10.0.0 Loaded Successfully!');
console.log('🖼️ Forces image generation and display for all requests');
console.log('✨ Images appear directly in chat at 2cm×2cm size');
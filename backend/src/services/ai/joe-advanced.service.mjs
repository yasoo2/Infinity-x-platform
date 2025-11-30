
/**
 * 🚀 JOE Advanced Engine - v9.0.0 "Gemini-Phoenix"
 * This engine is now a multi-modal orchestrator, capable of leveraging both OpenAI and Google Gemini models.
 * It dynamically adapts tools for the selected model and provides a unified response structure.
 *
 * @module joeAdvancedEngine
 * @version 9.0.0 - Gemini-Phoenix Edition
 * @author Joe AGI (Self-Upgraded)
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfig } from './runtime-config.mjs';
import { EventEmitter } from 'events';

// --- Core System Components ---
import toolManager from '../tools/tool-manager.service.mjs';
// import memoryManager from '../memory/memory.service.mjs'; // MemoryManager is now passed via dependencies
import MANUS_STYLE_PROMPT from '../../prompts/manusStylePrompt.mjs';

// --- Client Configuration ---
// Clients will be instantiated per-request from runtime configuration

let _dependencies = {};
function init(dependencies) { _dependencies = dependencies || {}; }

// =========================
// 🎯 Event System
// =========================
class JoeEventEmitter extends EventEmitter {
  constructor() { super(); this.setMaxListeners(100); }
  emitProgress(userId, taskId, progress, message) { this.emit('progress', { type: 'progress', userId, taskId, progress, message, timestamp: new Date() }); }
  emitError(userId, error, context) { this.emit('error', { type: 'error', userId, error: error.message, stack: error.stack, context, timestamp: new Date() }); }
}
const joeEvents = new JoeEventEmitter();


// =========================
// 🛠️ Tool Adaptation Layer
// =========================
/**
 * Converts OpenAI-formatted tools to Gemini-formatted tools.
 * @param {Array<Object>} openAITools - The array of OpenAI tool schemas.
 * @returns {Array<Object>} The array of Gemini function declarations.
 */
function adaptToolsForGemini(openAITools) {
    return openAITools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
    }));
}

function shouldAugment(msg) {
  const s = String(msg || '').toLowerCase();
  return /(install|npm|package|library|module)/.test(s);
}


// =========================
// 🚀 Main Processing Function
// =========================
/**
 * Processes a user's message using a dynamically selected AI model.
 * @param {string} userId - The ID of the user.
 * @param {string} message - The user's message.
 * @param {string} sessionId - The current session ID.
 * @param {object} [options={}] - Additional options.
 * @param {string} [options.model='gpt-4o'] - The model to use (e.g., 'gpt-4o', 'gemini-1.5-pro-latest').
 * @returns {Promise<object>} - The final response and metadata.
 */
async function processMessage(userId, message, sessionId, { model = 'gpt-4o' } = {}) {
    const { memoryManager } = _dependencies;
    if (!memoryManager) { throw new Error('MemoryManager not initialized'); }
    const startTime = Date.now();
    console.log(`
🤖 JOE v9 "Gemini-Phoenix" [${model}] Processing: "${message.substring(0, 80)}..." for User: ${userId}`);

    // 1. Retrieve Conversation Context
        const conversationHistory = await memoryManager.getConversationContext(userId, { limit: 15 });
    const history = conversationHistory.map(item => ({
        role: item.command.role === 'assistant' ? 'model' : 'user', // Gemini uses 'model' for assistant
        parts: [{ text: item.command.content || String(item.command) }]
    })).reverse();

    const systemPrompt = { role: 'system', content: MANUS_STYLE_PROMPT };
    const userMessage = { role: 'user', content: message };

    const messagesForOpenAI = [systemPrompt, ...conversationHistory.map(item => item.command).reverse(), userMessage];
    const messagesForGemini = [...history, { role: 'user', parts: [{ text: message }] }];
    void messagesForGemini;

    // 2. Dynamic Tool Discovery
    const availableTools = toolManager.getToolSchemas();
    console.log(`🛠️ Discovered ${availableTools.length} tools available for this request.`);

    let finalContent = 'An error occurred.';
    const toolCalls = [];
    const toolResults = [];
    let usage = {};

    // 3. Model-Specific Execution
    // Prepare clients from runtime config
    const cfg = getConfig();
    let userCfg = null;
    try {
      const db = _dependencies?.db;
      if (db && userId) {
        userCfg = await db.collection('ai_user_config').findOne({ userId });
      }
    } catch { void 0 }
    let openaiClient = null;
    let geminiClient = null;
    const effectiveKeys = {
      openai: (userCfg?.keys?.openai) || cfg.keys.openai,
      gemini: (userCfg?.keys?.gemini) || cfg.keys.gemini,
    };
    if (effectiveKeys.openai) {
      openaiClient = new OpenAI({ apiKey: effectiveKeys.openai });
    }
    if (effectiveKeys.gemini) {
      geminiClient = new GoogleGenerativeAI(effectiveKeys.gemini);
    }

    // Choose default model from user config if model not explicitly provided
    if (!model) {
      model = (userCfg?.activeModel) || cfg.activeModel || 'gpt-4o';
    }

    if (model.startsWith('gemini') && geminiClient) {
        // --- GEMINI EXECUTION PATH ---
        const geminiModel = geminiClient.getGenerativeModel({
            model: model,
            systemInstruction: MANUS_STYLE_PROMPT,
            tools: [{ functionDeclarations: adaptToolsForGemini(availableTools) }]
        });
        const chat = geminiModel.startChat({ history });
        const result = await chat.sendMessage(message);
        const response = result.response;
        const responseCalls = response.functionCalls() || [];
        usage = { total_tokens: result.response.usageMetadata.totalTokenCount };

        if (responseCalls.length > 0) {
            console.log(`🔧 Gemini Executing ${responseCalls.length} tool(s)...`);
            let toolMessages = [];

            for (const call of responseCalls) {
                console.log(`⚡ ${call.name}(${JSON.stringify(call.args).substring(0, 60)}...)`);
                const result = await toolManager.execute(call.name, call.args);
                toolResults.push({ tool: call.name, args: call.args, result });
                toolMessages.push({ functionResponse: { name: call.name, response: { content: JSON.stringify(result) } } });
                toolCalls.push({function: {name: call.name, arguments: call.args}}); // For logging
            }

            console.log('🔄 Gemini Synthesizing tool results...');
            const secondResult = await chat.sendMessage(JSON.stringify(toolMessages));
            finalContent = secondResult.response.text();
            usage.total_tokens += secondResult.response.usageMetadata.totalTokenCount;
        } else {
            finalContent = response.text();
            if (shouldAugment(message)) {
              try {
                const disc = await toolManager.execute('discoverNpmPackages', { query: message, size: 3 });
                const cand = (disc?.items || [])[0];
                if (cand?.name) {
                  await toolManager.execute('registerNpmTool', { packageName: cand.name, version: 'latest', functionName: 'default' });
                  const second = await chat.sendMessage(message);
                  finalContent = second.response.text();
                  usage.total_tokens += second.response.usageMetadata?.totalTokenCount || 0;
                }
              } catch { /* noop */ }
            }
        }

    } else if (openaiClient) {
        // --- OPENAI EXECUTION PATH ---
        const response = await openaiClient.chat.completions.create({ model, messages: messagesForOpenAI, tools: availableTools, tool_choice: 'auto' });
        const messageResponse = response.choices[0].message;
        usage = response.usage;

        if (messageResponse.tool_calls) {
            console.log(`🔧 OpenAI Executing ${messageResponse.tool_calls.length} tool(s)...`);
            const toolMessages = [messageResponse];
            for (const toolCall of messageResponse.tool_calls) {
                const functionName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);
                console.log(`⚡ ${functionName}(${JSON.stringify(args).substring(0, 60)}...)`);
                const result = await toolManager.execute(functionName, args);
                toolResults.push({ tool: functionName, args, result });
                toolMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
                toolCalls.push(toolCall); // For logging
            }
            console.log('🔄 OpenAI Synthesizing tool results...');
            const secondResponse = await openaiClient.chat.completions.create({ model, messages: [...messagesForOpenAI, ...toolMessages] });
            finalContent = secondResponse.choices[0].message.content;
            usage.total_tokens += secondResponse.usage.total_tokens;
        } else {
            finalContent = messageResponse.content;
            if (shouldAugment(message)) {
              try {
                const disc = await toolManager.execute('discoverNpmPackages', { query: message, size: 3 });
                const cand = (disc?.items || [])[0];
                if (cand?.name) {
                  await toolManager.execute('registerNpmTool', { packageName: cand.name, version: 'latest', functionName: 'default' });
                  const tools2 = toolManager.getToolSchemas();
                  const secondResponse = await openaiClient.chat.completions.create({ model, messages: messagesForOpenAI, tools: tools2, tool_choice: 'auto' });
                  const m2 = secondResponse.choices[0].message;
                  if (m2.tool_calls && m2.tool_calls.length) {
                    const toolMessages2 = [m2];
                    for (const tc of m2.tool_calls) {
                      const fn = tc.function.name;
                      const args = JSON.parse(tc.function.arguments);
                      const result2 = await toolManager.execute(fn, args);
                      toolResults.push({ tool: fn, args, result: result2 });
                      toolMessages2.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result2) });
                    }
                    const synth = await openaiClient.chat.completions.create({ model, messages: [...messagesForOpenAI, ...toolMessages2] });
                    finalContent = synth.choices[0].message.content;
                    usage.total_tokens = (usage?.total_tokens || 0) + (synth?.usage?.total_tokens || 0);
                  } else {
                    finalContent = m2.content;
                  }
                }
              } catch { /* noop */ }
            }
        }
    } else {
        const preview = String(message || '').trim();
        const prefix = preview ? (preview.length > 120 ? preview.slice(0, 120) + '…' : preview) : '';
        finalContent = prefix ? `تم الاستلام: ${prefix}\n\nلا توجد مفاتيح نماذج مفعّلة حالياً. يمكنني متابعة التحليل والتنفيذ للأدوات المتاحة، أو قم بتفعيل مزوّد ذكاء من لوحة الإعدادات للحصول على إجابات أعمق.` : `لا توجد مفاتيح نماذج مفعّلة حالياً. فعّل مزوّد ذكاء للحصول على إجابات أعمق، ويمكنني مؤقتاً استخدام الأدوات المدمجة والتحليل الإجرائي.`;
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Processing complete in ${duration}ms.`);

    // 6. Save the complete interaction to memory
    await memoryManager.saveInteraction(userId, message, finalContent, {
      sessionId, service: `joe-advanced-v9-${model}`, duration, toolResults,
      tokens: usage?.total_tokens
    });

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
export default { processMessage, events: joeEvents, version: '9.0.0', name: 'JOE Advanced Engine - Gemini-Phoenix Edition', init };

console.log('🚀 JOE Advanced Engine v9.0.0 "Gemini-Phoenix" Loaded Successfully!');
console.log('🧠 Integrated with Advanced Memory Manager.');
console.log('🛠️ Now fully dynamic via ToolManager integration.');
console.log('♊ Capable of running both OpenAI and Gemini models.');

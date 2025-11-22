
/**
 * 🚀 JOE Advanced Engine - v8.0.0 "Phoenix"
 * This engine has been completely refactored to be a lean, powerful, and dynamic orchestrator.
 * It now relies entirely on the ToolManager for dynamic tool discovery and execution,
 * removing all hardcoded tool logic and making it infinitely scalable.
 *
 * @module joeAdvancedEngine
 * @version 8.0.0 - Phoenix Edition
 * @author Joe AGI (Self-Refactored)
 */

import OpenAI from 'openai';
import { EventEmitter } from 'events';

// --- Core System Components ---
import toolManager from '../tools/tool-manager.service.mjs'; // The single source of truth for tools
import memoryManager from '../memory/memory.service.mjs'; // The advanced memory system
import MANUS_STYLE_PROMPT from '../../prompts/manusStylePrompt.mjs';

// --- OpenAI Configuration ---
let openai;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn('⚠️ OPENAI_API_KEY is missing. Joe AI functionalities will be severely limited.');
}

// =========================
// 🎯 Event System (for real-time progress tracking)
// =========================

class JoeEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  emitProgress(userId, taskId, progress, message) {
    this.emit('progress', { type: 'progress', userId, taskId, progress, message, timestamp: new Date() });
  }

  emitError(userId, error, context) {
    this.emit('error', { type: 'error', userId, error: error.message, stack: error.stack, context, timestamp: new Date() });
  }
}

const joeEvents = new JoeEventEmitter();


// =========================
// 🚀 Main Processing Function
// =========================

/**
 * Processes a user's message, orchestrating the entire AI response cycle.
 * @param {string} userId - The ID of the user.
 * @param {string} message - The user's message.
 * @param {string} sessionId - The current session ID.
 * @returns {Promise<object>} - The final response and metadata.
 */
async function processMessage(userId, message, sessionId) {
  const startTime = Date.now();
  console.log(`
🤖 JOE v8 "Phoenix" Processing: "${message.substring(0, 80)}..." for User: ${userId}`);

  if (!openai) {
    throw new Error('OpenAI API key is not configured, cannot process message.');
  }

  // 1. Retrieve Conversation Context
  const conversationHistory = await memoryManager.getConversationContext(userId, { limit: 15 });
  const messages = [
    { role: 'system', content: MANUS_STYLE_PROMPT },
    ...conversationHistory.map(item => ({
        role: item.command.role || 'user',
        content: item.command.content || item.command
    })).reverse(),
    { role: 'user', content: message }
  ];

  // 2. Dynamic Tool Discovery
  const availableTools = toolManager.getToolSchemas();
  console.log(`🛠️ Discovered ${availableTools.length} tools available for this request.`);

  // 3. First LLM Call (with dynamic tools)
  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // The most capable model
    messages,
    tools: availableTools,
    tool_choice: 'auto',
    temperature: 0.7,
    max_tokens: 4000,
  });

  let finalResponse = response.choices[0].message;
  const toolCalls = finalResponse.tool_calls || [];
  let toolResults = [];

  // 4. Dynamic Tool Execution
  if (toolCalls.length > 0) {
    console.log(`🔧 Executing ${toolCalls.length} tool(s) dynamically...`);
    const toolMessages = [finalResponse];

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log(`⚡ ${functionName}(${JSON.stringify(args).substring(0, 60)}...)`);
      joeEvents.emitProgress(userId, sessionId, 50, `Executing tool: ${functionName}...`);

      // Delegate execution to the ToolManager
      const result = await toolManager.execute(functionName, args);
      toolResults.push({ tool: functionName, args, result });

      toolMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }

    // 5. Second LLM Call to Synthesize Tool Results
    console.log('🔄 Synthesizing tool results...');
    const secondResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [...messages, ...toolMessages],
      temperature: 0.7,
      max_tokens: 4000,
    });
    finalResponse = secondResponse.choices[0].message;
  }

  const duration = Date.now() - startTime;
  console.log(`✅ Processing complete in ${duration}ms.`);

  // 6. Save the complete interaction to memory
  await memoryManager.saveInteraction(userId, message, finalResponse.content, {
      sessionId,
      service: 'joe-advanced-v8-phoenix',
      duration,
      toolResults,
      tokens: response.usage?.total_tokens
  });

  return {
    response: finalResponse.content,
    toolsUsed: toolCalls.map(tc => tc.function.name),
  };
}

// =========================
// 📤 Exports
// =========================

export {
  processMessage,
  joeEvents
};

export default {
  processMessage,
  events: joeEvents,
  version: '8.0.0',
  name: 'JOE Advanced Engine - Phoenix Edition'
};

console.log('🚀 JOE Advanced Engine v8.0.0 "Phoenix" Loaded Successfully!');
console.log('🧠 Integrated with Advanced Memory Manager.');
console.log('🛠️ Now fully dynamic via ToolManager integration.');


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
import path from 'path';
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
/**
 * Converts OpenAI-formatted tools to Gemini-formatted tools.
 * @param {Array<Object>} openAITools - The array of OpenAI tool schemas.
 * @returns {Array<Object>} The array of Gemini function declarations.
 */
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
    { keys: ['twitter', 'تويتر', 'x.com', 'اكس'], url: 'https://twitter.com' },
    { keys: ['facebook', 'فيسبوك'], url: 'https://facebook.com' },
    { keys: ['github', 'جيتهاب'], url: 'https://github.com' },
    { keys: ['wikipedia', 'ويكيبيديا'], url: 'https://wikipedia.org' }
  ];
  for (const entry of map) {
    for (const k of entry.keys) {
      if (s.includes(k)) return entry.url;
    }
  }
  const corrections = [
    { pat: /\bgoole\b/g, fix: 'google' },
    { pat: /\bgogle\b/g, fix: 'google' },
    { pat: /\bgoogel\b/g, fix: 'google' }
  ];
  let t = s;
  for (const c of corrections) { t = t.replace(c.pat, c.fix); }
  const m1 = t.match(/\b([a-z0-9.-]+\.[a-z]{2,})\b/i);
  if (m1 && m1[1]) {
    const dom = m1[1].replace(/[.,;:!?)]+$/,'');
    return `https://${dom}`;
  }
  const m2 = t.match(/افتح\s*(?:موقع\s*)?([a-z\u0600-\u06FF0-9.-]+(?:\.[a-z]{2,})?)/i) || t.match(/open\s*(?:site\s*)?([a-z\u0600-\u06FF0-9.-]+(?:\.[a-z]{2,})?)/i);
  if (m2 && m2[1]) {
    const name = m2[1].replace(/[.,;:!?)]+$/,'');
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(name)) return `https://${name}`;
    const hit = map.find(e => e.keys.some(k => name.includes(k)));
    if (hit) return hit.url;
    if (/^[a-z]{3,}$/i.test(name)) return `https://${name}.com`;
  }
  return null;
}

function navigateVisual(userId, url) {
  const srv = _dependencies?.joeAgentServer;
  const u = String(userId || '').trim();
  const t = String(url || '').trim();
  if (srv && typeof srv.navigateProgrammaticallyForUser === 'function' && u && t) {
    srv.navigateProgrammaticallyForUser(u, t);
  }
}

function formatSystemSummary(lang, schemas) {
  const count = Array.isArray(schemas) ? schemas.length : 0;
  const descs = (schemas || []).map(t => ({ n: String(t?.function?.name || '').trim(), d: String(t?.function?.description || '').trim() })).filter(x => x.n);
  const top = descs.slice(0, 10).map(x => `- ${x.n}: ${x.d}`);
  const responsibilitiesAr = [
    'إنتاج وسائط ورسوم متحركة بسيطة ونشرها محليًا',
    'التصفح والتحليل للمواقع والروابط',
    'تدقيق الأمان والبحث عن الأسرار والأنماط غير الآمنة',
    'إدخال المعرفة والاستعلام عنها',
    'تنسيق الشيفرة وفحصها',
    'عمليات GitHub ومزامنة الجلسات'
  ];
  const responsibilitiesEn = [
    'Produce simple media/cartoons and publish locally',
    'Browse and analyze websites/links',
    'Run security audits, secret scanning, insecure pattern checks',
    'Ingest and query knowledge',
    'Format and lint code',
    'GitHub operations and session sync'
  ];
  const header = lang === 'ar' ? 'ملخص النظام' : 'System Summary';
  const toolCountLine = lang === 'ar' ? `عدد الأدوات/الوظائف: ${count}` : `Tools/Functions count: ${count}`;
  const capabilitiesTitle = lang === 'ar' ? 'أبرز القدرات:' : 'Key Capabilities:';
  const toolsTitle = lang === 'ar' ? 'أهم الأدوات:' : 'Top Tools:';
  const responsibilities = lang === 'ar' ? responsibilitiesAr : responsibilitiesEn;
  const parts = [
    `🎨 ${header}`,
    `🔢 ${toolCountLine}`,
    `⚙️ ${capabilitiesTitle}`,
    responsibilities.map(r => `- ${r}`).join('\n'),
    `🛠️ ${toolsTitle}`,
    top.join('\n') || (lang === 'ar' ? '- لا توجد أوصاف متاحة.' : '- No descriptions available.')
  ];
  const out = parts.filter(Boolean).join('\n');
  return out;
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
async function processMessage(userId, message, sessionId, { model = null, lang } = {}) {
    const { memoryManager } = _dependencies;
    if (!memoryManager) { throw new Error('MemoryManager not initialized'); }
    const startTime = Date.now();
    console.log(`
🤖 JOE v9 "Gemini-Phoenix" [${model}] <lang=${String(lang||'').toLowerCase()||'en'}> "${message.substring(0, 80)}..." uid=${userId}`);
    try { joeEvents.emitProgress(userId, sessionId, 5, 'Starting'); } catch { /* noop */ }

    // 1. Retrieve Conversation Context (prefer current session if available)
        let convo = [];
        try {
            if (sessionId) {
                const s = await memoryManager.getSession(sessionId, userId);
                convo = Array.isArray(s?.interactions) ? s.interactions : [];
            }
            if (!convo || convo.length === 0) {
                convo = await memoryManager.getConversationContext(userId, { limit: 15 });
            }
        } catch { convo = await memoryManager.getConversationContext(userId, { limit: 15 }); }
    try { joeEvents.emitProgress(userId, sessionId, 10, 'Context loaded'); } catch { /* noop */ }

    const targetLang = (String(lang || '').toLowerCase() === 'ar') ? 'ar' : 'en';
    const languageDirective = targetLang === 'ar' ? 'اعتمد العربية في جميع الردود، ولخص المحتوى بشكل واضح مع نقاط موجزة وعناوين فرعية.' : 'Respond in English. Provide a clear summary with bullet points and subheadings.';
    const systemPrompt = { role: 'system', content: `${MANUS_STYLE_PROMPT}\n\n${languageDirective}` };
    let ltmFactsText = '';
    try {
        const ltmFacts = await memoryManager.getLTM(userId, { limit: 5 });
        const lines = (ltmFacts || []).map(p => {
            const t = String(p?.title || '').trim();
            return t ? `- ${t}` : '';
        }).filter(Boolean);
        if (lines.length) {
            ltmFactsText = (targetLang === 'ar' ? 'معلومات معروفة:\n' : 'Known facts:\n') + lines.join('\n');
        }
    } catch { /* noop */ }

    const history = (() => {
        const h = [];
        const items = (convo || []).slice().reverse();
        for (const item of items) {
            const uText = String(item?.command?.content || item?.command || '').trim();
            const aText = String(item?.result || '').trim();
            if (uText) h.push({ role: 'user', parts: [{ text: uText }] });
            if (aText) h.push({ role: 'model', parts: [{ text: aText }] });
        }
        if (ltmFactsText) {
            h.unshift({ role: 'model', parts: [{ text: ltmFactsText }] });
        }
        return h;
    })();

    const conversationHistory = Array.isArray(convo) ? convo : [];
    const userMessage = { role: 'user', content: message };
    const messagesForOpenAI = [systemPrompt, ...conversationHistory.map(item => item.command).reverse(), userMessage];
    void messagesForOpenAI;
    const messagesForGemini = [...history, { role: 'user', parts: [{ text: message }] }];
    void messagesForGemini;

    // 2. Dynamic Tool Discovery
    const allSchemas = toolManager.getToolSchemas();
    const maxTools = 128;
    const rankedNames = orderByRanking((allSchemas || []).map(s => String(s?.function?.name || '').trim()).filter(Boolean)).slice(0, maxTools);
    const availableTools = (allSchemas || [])
      .filter(s => rankedNames.includes(String(s?.function?.name || '').trim()))
      .slice(0, maxTools)
      .map(t => ({ type: 'function', function: { ...t.function, parameters: sanitizeJsonSchemaForOpenAI(t.function.parameters) } }));
    console.log(`🛠️ Discovered ${availableTools.length} tools available for this request.`);
    try { joeEvents.emitProgress(userId, sessionId, 15, 'Tools discovered'); } catch { /* noop */ }
    try { joeEvents.emitThought(userId, sessionId, (String(lang||'').toLowerCase()==='ar') ? 'تحليل الطلب واختيار الأدوات المناسبة' : 'Analyzing instruction and selecting suitable tools'); } catch { /* noop */ }

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

    const previewMsg = String(message || '');
    let handled = false;
    if (wantsSelfDescribe(previewMsg)) {
      try {
        finalContent = formatSystemSummary(targetLang, availableTools);
        handled = true;
        try { joeEvents.emitProgress(userId, sessionId, 50, 'Summary generated'); } catch { /* noop */ }
      } catch {
        finalContent = targetLang === 'ar' ? 'فشل توليد ملخص النظام.' : 'Failed to generate system summary.';
        handled = true;
      }
    }

    const noCloud = !openaiClient && !geminiClient;
    if (!model) {
      if (noCloud) {
        model = '__disabled__';
      } else {
        model = (userCfg?.activeModel) || cfg.activeModel || null;
        if (!model) {
          const provider = (userCfg?.activeProvider) || cfg.activeProvider || (effectiveKeys.openai ? 'openai' : (effectiveKeys.gemini ? 'gemini' : null));
          model = await resolveAutoModel(provider, openaiClient, geminiClient);
        }
      }
    }

    if (!handled && model === '__disabled__') {
        const steps = [];
        if (steps.length) {
          const execOne = async (st) => {
            const fnName = st?.tool || st?.name;
            const params = typeof st?.params === 'object' && st.params ? st.params : {};
            if (typeof fnName === 'string' && fnName) {
              try {
                try { joeEvents.emitProgress(userId, sessionId, 30, `Running ${fnName}`); } catch { void 0; }
                const r = await executeWithFallback(userId, sessionId, fnName, params, st?.thought || '');
                toolResults.push({ tool: fnName, args: params, result: r });
                toolCalls.push({ function: { name: fnName, arguments: params } });
                try { joeEvents.emitProgress(userId, sessionId, 60, `${fnName} done`); } catch { void 0; }
              } catch { void 0; }
            }
          };
          const [first, ...rest] = steps;
          if (first) { await execOne(first); }
          if (rest.length) { await Promise.all(rest.map(execOne)); }
          const summaries = toolResults.map(tr => {
            const n = tr.tool;
            const r = tr.result;
            const s = typeof r === 'object' ? (r.summary || r.message || '') : '';
            const j = s ? s : JSON.stringify(r).slice(0, 600);
            return `${n}: ${j}`;
          });
          finalContent = summaries.join('\n');
        } else {
          const preview = String(message || '').trim();
          const lower = preview.toLowerCase();
          const hasUrl = /https?:\/\/[^\s]+/i.test(preview);
          const videoUrlMatch = preview.match(/https?:\/\/[^\s]+/i);
          const wantsSecurity = /(security|audit|ثغرات|أمن|حماية)/i.test(lower);
          const wantsIngest = /(ingest|knowledge|معرفة|ادخال|استيعاب)/i.test(lower);
          const wantsQuery = /(query|search|سؤال|ابحث|استعلام)/i.test(lower);
          const wantsWebSearch = /(web\s*search|search\s*web|بحث\s*الويب|ابحث\s*في\s*الويب)/i.test(lower);
          const wantsFormat = /(format|prettier|تنسيق)/i.test(lower);
          const wantsLint = /(lint|تحليل|فحص)/i.test(lower);
          const wantsDepcheck = /(depcheck|dependencies|مكتبات|حزم|اعتماديات|حزم\s*غير\s*مستخدمة|dependencies\s*audit)/i.test(lower);
          const wantsTests = /(tests?|اختبار|تشغيل\s*الاختبارات|unit\s*tests?|e2e)/i.test(lower);
          const wantsBrowserDiag = /(diagnostic|تشخيص|مشاكل\s*الموقع|network\s*failures|console\s*errors)/i.test(lower);
          const wantsApiSearch = /(api|دمج\s*api|ربط\s*واجهة\s*برمجية|endpoint|integrate\s*api)/i.test(lower);
          const wantsNpmSearch = /(npm\s*search|بحث\s*npm|حزمة\s*npm)/i.test(lower);
          const wantsGithubSearch = /(github\s*search|بحث\s*جيتهاب|مستودع\s*جيتهاب)/i.test(lower);
          const wantsNetworkScan = /(network\s*scan|فحص\s*الشبكة|nmap|ports)/i.test(lower);
          const wantsRegisterHttp = /(register\s*http|سجل\s*موصل\s*http|اربط\s*api\s*http)/i.test(lower);
          const wantsCodeSearch = /(search\s*code|ابحث\s*في\s*الشيفرة|grep|regex)/i.test(lower);
          const wantsRefactorReplace = /(replace|استبدل|بحث\s*واستبدال)/i.test(lower);
          const wantsRefactorRename = /(rename\s*import|اعادة\s*تسمية\s*الاستيراد)/i.test(lower);
          const wantsAutoFix = /(auto\s*fix|اصلح\s*تلقائيا)/i.test(lower);
          const wantsReadFile = /(اقرأ\s*ملف|read\s*file)/i.test(lower);
          const wantsWriteFile = /(اكتب\s*ملف|write\s*file)/i.test(lower);
          const wantsDeleteFile = /(احذف\s*ملف|delete\s*file)/i.test(lower);
          const wantsListFiles = /(سرد\s*الملفات|list\s*files)/i.test(lower);
          const wantsScreenshot = /(screenshot|لقطة\s*شاشة)/i.test(lower);
        const wantsAnalyzeImage = /(حلل\s*صورة|analyze\s*image)/i.test(lower);
        try {
          const planText = (targetLang==='ar')
            ? `خطة أولية: ${[
                hasUrl ? 'تصفح موقع' : '',
                wantsWebSearch ? 'بحث ويب' : '',
                wantsSecurity ? 'تدقيق أمني' : '',
                wantsAnalyzeImage ? 'تحليل صورة' : '',
              ].filter(Boolean).join('، ') || 'تحليل عام'}`
            : `Initial plan: ${[
                hasUrl ? 'browse site' : '',
                wantsWebSearch ? 'web search' : '',
                wantsSecurity ? 'security audit' : '',
                wantsAnalyzeImage ? 'image analysis' : '',
              ].filter(Boolean).join(', ') || 'general analysis'}`;
          joeEvents.emitThought(userId, sessionId, planText);
        } catch { /* noop */ }
          const wantsDeploy = /(deploy|نشر)/i.test(lower);
          let pieces = [];
          if (videoUrlMatch) {
            const url = videoUrlMatch[0];
            try {
              const vr = await executeTool(userId, sessionId, 'analyzeVideoFromUrl', { url, targetLanguage: targetLang });
              toolResults.push({ tool: 'analyzeVideoFromUrl', args: { url, targetLanguage: targetLang }, result: vr });
              toolCalls.push({ function: { name: 'analyzeVideoFromUrl', arguments: { url, targetLanguage: targetLang } } });
              const transcript = String(vr?.transcript || '').trim();
              if (transcript) {
                try {
                  const llm = _dependencies.localLlamaService;
                  const sumPrompt = targetLang === 'ar' ? `ألخص محتوى الفيديو التالي بالعربية مع نقاط رئيسية وعناوين فرعية ومخرجات واضحة:
${transcript.slice(0, 8000)}` : `Summarize the following video transcript in English with key points, subheadings, and clear output:
${transcript.slice(0, 8000)}`;
                  const parts = [];
                  await llm.stream([{ role: 'user', content: sumPrompt }], (p) => { parts.push(String(p||'')); }, { temperature: 0.2, maxTokens: 1024 });
                  pieces.push(parts.join(''));
                } catch { pieces.push(transcript.slice(0, 2000)); }
              } else {
                pieces.push(targetLang === 'ar' ? 'لا يوجد نص مستخرج للفيديو.' : 'No transcript extracted for the video.');
              }
            } catch { void 0 }
          } else if (hasUrl) {
            try {
                const rawUrl = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
                const url = rawUrl ? rawUrl.replace(/[.,;:!?)]+$/,'') : rawUrl;
                const isImageUrl = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
                if (isImageUrl) {
                  try { joeEvents.emitProgress(userId, sessionId, 30, 'downloadImageFromUrl'); } catch { /* noop */ }
                  const out = await executeTool(userId, sessionId, 'downloadImageFromUrl', { url, userId });
                  toolResults.push({ tool: 'downloadImageFromUrl', args: { url }, result: out });
                  toolCalls.push({ function: { name: 'downloadImageFromUrl', arguments: { url } } });
                  const link = out?.absoluteUrl || out?.publicUrl || '';
                  const msg = link ? `تم تحميل الصورة: ${link}` : 'تم تحميل الصورة.';
                  pieces.push(msg);
                  try { joeEvents.emitProgress(userId, sessionId, 60, 'downloadImageFromUrl done'); } catch { /* noop */ }
                } else {
                  try { joeEvents.emitProgress(userId, sessionId, 30, 'browseWebsite'); } catch { /* noop */ }
                  const r = await executeTool(userId, sessionId, 'browseWebsite', { url });
                  toolResults.push({ tool: 'browseWebsite', args: { url }, result: r });
                  toolCalls.push({ function: { name: 'browseWebsite', arguments: { url } } });
                  pieces.push(String(r?.summary || r?.content || ''));
                  navigateVisual(userId, url);
                  try { joeEvents.emitProgress(userId, sessionId, 60, 'browseWebsite done'); } catch { /* noop */ }
                }
            } catch { void 0 }
          }
          if (wantsSecurity) {
            try {
              try { joeEvents.emitProgress(userId, sessionId, 30, 'Security audit'); } catch { /* noop */ }
              const a = await executeTool(userId, sessionId, 'runSecurityAudit', {});
              const s = await executeTool(userId, sessionId, 'scanSecrets', {});
              const i = await executeTool(userId, sessionId, 'scanInsecurePatterns', {});
              toolResults.push({ tool: 'runSecurityAudit', args: {}, result: a });
              toolResults.push({ tool: 'scanSecrets', args: {}, result: s });
              toolResults.push({ tool: 'scanInsecurePatterns', args: {}, result: i });
              toolCalls.push({ function: { name: 'runSecurityAudit', arguments: {} } });
              toolCalls.push({ function: { name: 'scanSecrets', arguments: {} } });
              toolCalls.push({ function: { name: 'scanInsecurePatterns', arguments: {} } });
              pieces.push(['Security audit completed.', a?.summary, s?.summary, i?.summary].filter(Boolean).join('\n'));
              try { joeEvents.emitProgress(userId, sessionId, 65, 'Security audit done'); } catch { /* noop */ }
            } catch { void 0 }
          }
          if (wantsIngest) {
            try {
              const title = preview.slice(0, 60);
              try { joeEvents.emitProgress(userId, sessionId, 30, 'ingestDocument'); } catch { /* noop */ }
              const r = await executeTool(userId, sessionId, 'ingestDocument', { documentTitle: title, content: preview });
              toolResults.push({ tool: 'ingestDocument', args: { documentTitle: title }, result: r });
              toolCalls.push({ function: { name: 'ingestDocument', arguments: { documentTitle: title } } });
              pieces.push(String(r?.summary || r?.message || ''));
              try { joeEvents.emitProgress(userId, sessionId, 60, 'ingestDocument done'); } catch { /* noop */ }
            } catch { void 0 }
          }
          if (wantsQuery) {
            try {
              try { joeEvents.emitProgress(userId, sessionId, 30, 'queryKnowledgeBase'); } catch { /* noop */ }
              const r = await executeTool(userId, sessionId, 'queryKnowledgeBase', { query: preview });
              toolResults.push({ tool: 'queryKnowledgeBase', args: { query: preview }, result: r });
              toolCalls.push({ function: { name: 'queryKnowledgeBase', arguments: { query: preview } } });
              const items = (r?.results || []).slice(0, 3).map(x => `- ${x.title} (score: ${x.score?.toFixed?.(2) || x.score})`).join('\n');
              pieces.push(items || 'No related knowledge found.');
              try { joeEvents.emitProgress(userId, sessionId, 60, 'queryKnowledgeBase done'); } catch { /* noop */ }
            } catch { void 0 }
          }
          if (wantsWebSearch) {
            try {
              try { joeEvents.emitProgress(userId, sessionId, 30, 'searchWeb'); } catch { /* noop */ }
              const r = await executeTool(userId, sessionId, 'searchWeb', { query: preview });
              toolResults.push({ tool: 'searchWeb', args: { query: preview }, result: r });
              toolCalls.push({ function: { name: 'searchWeb', arguments: { query: preview } } });
              const results = (r?.results || r?.items || []).slice(0, 5).map(x => `- ${x.title || x.name}: ${x.url || x.link}`).join('\n');
              pieces.push(results || 'No web results found.');
              try { joeEvents.emitProgress(userId, sessionId, 60, 'searchWeb done'); } catch { /* noop */ }
            } catch { void 0 }
          }
          if (wantsFormat) {
            try {
              try { joeEvents.emitProgress(userId, sessionId, 30, 'formatPrettier'); } catch { /* noop */ }
              const r = await executeTool(userId, sessionId, 'formatPrettier', {});
              toolResults.push({ tool: 'formatPrettier', args: {}, result: r });
              toolCalls.push({ function: { name: 'formatPrettier', arguments: {} } });
              pieces.push('Formatting applied.');
              try { joeEvents.emitProgress(userId, sessionId, 60, 'formatPrettier done'); } catch { /* noop */ }
            } catch { void 0 }
          }
          if (wantsLint) {
            try {
              try { joeEvents.emitProgress(userId, sessionId, 30, 'runLint'); } catch { /* noop */ }
              const r = await executeTool(userId, sessionId, 'runLint', {});
              toolResults.push({ tool: 'runLint', args: {}, result: r });
              toolCalls.push({ function: { name: 'runLint', arguments: {} } });
              pieces.push('Lint analysis completed.');
              try { joeEvents.emitProgress(userId, sessionId, 60, 'runLint done'); } catch { /* noop */ }
            } catch { void 0 }
          }
          if (wantsTests) {
            try {
              const fileMatch = preview.match(/\S+\.(?:js|jsx|ts|tsx|mjs)/i);
              if (fileMatch) {
                try { joeEvents.emitProgress(userId, sessionId, 30, 'generateAndRunTests'); } catch { /* noop */ }
                const fp = fileMatch[0];
                const r = await executeTool(userId, sessionId, 'generateAndRunTests', { filePath: fp });
                toolResults.push({ tool: 'generateAndRunTests', args: { filePath: fp }, result: r });
                toolCalls.push({ function: { name: 'generateAndRunTests', arguments: { filePath: fp } } });
                pieces.push('Tests generated and executed.');
                try { joeEvents.emitProgress(userId, sessionId, 60, 'generateAndRunTests done'); } catch { /* noop */ }
              }
            } catch { void 0 }
          }
          if (wantsBrowserDiag) {
            try {
              const url = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
              if (url) {
                try { joeEvents.emitProgress(userId, sessionId, 30, 'analyzePageState'); } catch { /* noop */ }
                const r = await executeTool(userId, sessionId, 'analyzePageState', { url });
                toolResults.push({ tool: 'analyzePageState', args: { url }, result: r });
                toolCalls.push({ function: { name: 'analyzePageState', arguments: { url } } });
                pieces.push(String(r?.summary || 'Page diagnostics completed.'));
                try { joeEvents.emitProgress(userId, sessionId, 60, 'analyzePageState done'); } catch { /* noop */ }
              }
            } catch { void 0 }
          }
          if (wantsApiSearch) {
            try {
              try { joeEvents.emitProgress(userId, sessionId, 30, 'searchAPI'); } catch { /* noop */ }
              const r = await executeTool(userId, sessionId, 'searchAPI', { query: preview });
              toolResults.push({ tool: 'searchAPI', args: { query: preview }, result: r });
              toolCalls.push({ function: { name: 'searchAPI', arguments: { query: preview } } });
              const results = (r?.mockResults || []).slice(0, 5).map(x => `- ${x.name}: ${x.url}`).join('\n');
              pieces.push(results || 'No API candidates found.');
              try { joeEvents.emitProgress(userId, sessionId, 60, 'searchAPI done'); } catch { /* noop */ }
            } catch { void 0 }
          }
          if (wantsNpmSearch) {
            try {
              const q = (preview.match(/npm\s*:\s*([^\n]+)/i) || [])[1] || preview;
              const r = await executeTool(userId, sessionId, 'discoverNpmPackages', { query: q, size: 5 });
              toolResults.push({ tool: 'discoverNpmPackages', args: { query: q }, result: r });
              toolCalls.push({ function: { name: 'discoverNpmPackages', arguments: { query: q } } });
              const items = (r?.items || []).slice(0, 5).map(x => `- ${x.name} ${x.version}: ${x.links?.homepage || x.links?.npm || ''}`).join('\n');
              pieces.push(items || 'No npm packages found.');
            } catch { void 0 }
          }
          if (wantsGithubSearch) {
            try {
              const q = (preview.match(/gh\s*:\s*([^\n]+)/i) || [])[1] || preview;
              const r = await executeTool(userId, sessionId, 'discoverGitHubRepos', { query: q, size: 5 });
              toolResults.push({ tool: 'discoverGitHubRepos', args: { query: q }, result: r });
              toolCalls.push({ function: { name: 'discoverGitHubRepos', arguments: { query: q } } });
              const items = (r?.items || []).slice(0, 5).map(x => `- ${x.full_name} ⭐ ${x.stars}: ${x.url}`).join('\n');
              pieces.push(items || 'No GitHub repos found.');
            } catch { void 0 }
          }
          if (wantsNetworkScan) {
            try {
              const host = (preview.match(/host\s*:\s*(\S+)/i) || [])[1] || 'localhost';
              const r = await executeTool(userId, sessionId, 'authorizedNetworkScan', { host });
              toolResults.push({ tool: 'authorizedNetworkScan', args: { host }, result: r });
              toolCalls.push({ function: { name: 'authorizedNetworkScan', arguments: { host } } });
              pieces.push('Network scan completed.');
            } catch { void 0 }
          }
          if (wantsRegisterHttp) {
            try {
              const base = (preview.match(/base\s*:\s*(\S+)/i) || [])[1];
              const name = (preview.match(/name\s*:\s*(\S+)/i) || [])[1] || 'external_http';
              if (base) {
                const r = await executeTool(userId, sessionId, 'registerHttpTool', { name, baseUrl: base });
                toolResults.push({ tool: 'registerHttpTool', args: { name, baseUrl: base }, result: r });
                toolCalls.push({ function: { name: 'registerHttpTool', arguments: { name, baseUrl: base } } });
                pieces.push('HTTP connector registered.');
              }
            } catch { void 0 }
          }
          if (wantsDepcheck) {
            try {
              try { joeEvents.emitProgress(userId, sessionId, 30, 'runDepcheck'); } catch { /* noop */ }
              const r = await executeTool(userId, sessionId, 'runDepcheck', { dir: 'backend' });
              toolResults.push({ tool: 'runDepcheck', args: { dir: 'backend' }, result: r });
              toolCalls.push({ function: { name: 'runDepcheck', arguments: { dir: 'backend' } } });
              pieces.push('Dependency analysis completed.');
              try { joeEvents.emitProgress(userId, sessionId, 60, 'runDepcheck done'); } catch { /* noop */ }
            } catch { void 0 }
          }
          if (wantsCodeSearch) {
            try {
              const r = await executeTool(userId, sessionId, 'searchCode', { pattern: preview });
              toolResults.push({ tool: 'searchCode', args: { pattern: preview }, result: r });
              toolCalls.push({ function: { name: 'searchCode', arguments: { pattern: preview } } });
              pieces.push('Code search completed.');
            } catch { void 0 }
          }
          if (wantsRefactorReplace) {
            try {
              const mFind = preview.match(/find:\s*([^\n]+)/i);
              const mReplace = preview.match(/replace:\s*([^\n]+)/i);
              if (mFind && mReplace) {
                const r = await executeTool(userId, sessionId, 'textReplace', { find: mFind[1], replace: mReplace[1], globs: ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'] });
                toolResults.push({ tool: 'textReplace', args: { find: mFind[1], replace: mReplace[1] }, result: r });
                toolCalls.push({ function: { name: 'textReplace', arguments: { find: mFind[1], replace: mReplace[1] } } });
                pieces.push('Text replace executed.');
              }
            } catch { void 0 }
          }
          if (wantsRefactorRename) {
            try {
              const mFrom = preview.match(/from:\s*([^\n]+)/i);
              const mTo = preview.match(/to:\s*([^\n]+)/i);
              if (mFrom && mTo) {
                const r = await executeTool(userId, sessionId, 'renameImport', { from: mFrom[1], to: mTo[1], globs: ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'] });
                toolResults.push({ tool: 'renameImport', args: { from: mFrom[1], to: mTo[1] }, result: r });
                toolCalls.push({ function: { name: 'renameImport', arguments: { from: mFrom[1], to: mTo[1] } } });
                pieces.push('Import rename applied.');
              }
            } catch { void 0 }
          }
          if (wantsAutoFix) {
            try {
              const r = await executeTool(userId, sessionId, 'autoFix', {});
              toolResults.push({ tool: 'autoFix', args: {}, result: r });
              toolCalls.push({ function: { name: 'autoFix', arguments: {} } });
              pieces.push('Auto fix completed.');
            } catch { void 0 }
          }
          if (wantsReadFile) {
            try {
              const m = preview.match(/\s(\S+\.(?:js|jsx|ts|tsx|mjs|json|md|txt))/i);
              if (m) {
                const r = await executeTool(userId, sessionId, 'readFile', { filePath: m[1] });
                toolResults.push({ tool: 'readFile', args: { filePath: m[1] }, result: r });
                toolCalls.push({ function: { name: 'readFile', arguments: { filePath: m[1] } } });
                pieces.push(String(r?.content || '').slice(0, 1000));
              }
            } catch { void 0 }
          }
          if (wantsWriteFile) {
            try {
              const m = preview.match(/path:\s*(\S+)\s+content:\s*([\s\S]+)/i);
              if (m) {
                const r = await executeTool(userId, sessionId, 'writeFile', { filePath: m[1], content: m[2] });
                toolResults.push({ tool: 'writeFile', args: { filePath: m[1] }, result: r });
                toolCalls.push({ function: { name: 'writeFile', arguments: { filePath: m[1] } } });
                pieces.push('File written.');
              }
            } catch { void 0 }
          }
          if (wantsDeleteFile) {
            try {
              const m = preview.match(/\s(\S+\.(?:js|jsx|ts|tsx|mjs|json|md|txt))/i);
              if (m) {
                const r = await executeTool(userId, sessionId, 'deleteFile', { filePath: m[1] });
                toolResults.push({ tool: 'deleteFile', args: { filePath: m[1] }, result: r });
                toolCalls.push({ function: { name: 'deleteFile', arguments: { filePath: m[1] } } });
                pieces.push('File deleted.');
              }
            } catch { void 0 }
          }
          if (wantsListFiles) {
            try {
              const r = await executeTool(userId, sessionId, 'listFiles', { directoryPath: '.' });
              toolResults.push({ tool: 'listFiles', args: { directoryPath: '.' }, result: r });
              toolCalls.push({ function: { name: 'listFiles', arguments: { directoryPath: '.' } } });
              pieces.push('Files listed.');
            } catch { void 0 }
          }
          if (wantsScreenshot) {
            try {
              const url = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
              if (url) {
                const r = await executeTool(userId, sessionId, 'screenshotWebsite', { url, fullPage: false });
                toolResults.push({ tool: 'screenshotWebsite', args: { url }, result: r });
                toolCalls.push({ function: { name: 'screenshotWebsite', arguments: { url } } });
                pieces.push('Screenshot captured.');
              }
            } catch { void 0 }
          }
          if (wantsAnalyzeImage) {
            try {
              const url = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
              if (url) {
                const r = await executeTool(userId, sessionId, 'analyzeImage', { imageUrl: url });
                toolResults.push({ tool: 'analyzeImage', args: { imageUrl: url }, result: r });
                toolCalls.push({ function: { name: 'analyzeImage', arguments: { imageUrl: url } } });
                pieces.push('Image analysis completed.');
              }
            } catch { void 0 }
          }
          if (wantsDeploy) {
            try {
              const r = await executeTool(userId, sessionId, 'deployProject', { projectPath: process.cwd(), platform: 'vercel' });
              toolResults.push({ tool: 'deployProject', args: { projectPath: process.cwd(), platform: 'vercel' }, result: r });
              toolCalls.push({ function: { name: 'deployProject', arguments: { projectPath: process.cwd(), platform: 'vercel' } } });
              pieces.push('Deployment initiated.');
            } catch { void 0 }
          }
          finalContent = pieces.length ? pieces.filter(Boolean).join('\n\n') : 'وضع محلي جاهز. أرسل تعليمات أدق لاختيار الأدوات المثالية.';
        }
    } else if (!handled && model.startsWith('gemini') && geminiClient) {
        // --- GEMINI EXECUTION PATH ---
        const geminiModel = geminiClient.getGenerativeModel({
            model: model,
            systemInstruction: `${MANUS_STYLE_PROMPT}\n\n${languageDirective}`,
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
                const result = await executeTool(userId, sessionId, call.name, call.args);
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
            try {
              const preview = String(message || '').trim();
              const m = preview.match(/https?:\/\/[^\s]+/i);
              let url = null;
              if (m) {
                const rawUrl = m[0];
                url = rawUrl ? rawUrl.replace(/[.,;:!?)]+$/,'') : rawUrl;
              } else {
                url = resolveSiteToUrl(preview);
              }
              if (url) {
                const br = await executeTool(userId, sessionId, 'browseWebsite', { url });
                toolResults.push({ tool: 'browseWebsite', args: { url }, result: br });
                toolCalls.push({ function: { name: 'browseWebsite', arguments: { url } } });
                const sum = String(br?.summary || br?.content || '');
                finalContent = sum || finalContent;
                navigateVisual(userId, url);
              }
            } catch { void 0 }
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

    } else if (!handled && openaiClient) {
        try {
          const modelId = model || 'gpt-4o';
          const convoLines = (convo || []).slice().reverse().map(m => {
            const uc = String(m?.command?.content || m?.command || '').trim();
            const ac = String(m?.result || '').trim();
            const parts = [];
            if (uc) parts.push(`User: ${uc}`);
            if (ac) parts.push(`Assistant: ${ac}`);
            return parts.join('\n');
          }).filter(Boolean);
          const flatPrompt = [
            MANUS_STYLE_PROMPT,
            languageDirective,
            ltmFactsText,
            ...convoLines,
            `User: ${message}`
          ].filter(Boolean).join('\n\n');
          const resp = await openaiClient.responses.create({ model: modelId, input: flatPrompt });
          const text = String(resp?.output_text || '').trim();
          finalContent = text || '';
          usage = resp?.usage || {};
          try {
            const preview = String(message || '').trim();
            const m = preview.match(/https?:\/\/[^\s]+/i);
            let url = null;
            if (m) {
              const rawUrl = m[0];
              url = rawUrl ? rawUrl.replace(/[.,;:!?)]+$/, '') : rawUrl;
            } else {
              url = resolveSiteToUrl(preview);
            }
            if (url) {
              const br = await executeTool(userId, sessionId, 'browseWebsite', { url });
              toolResults.push({ tool: 'browseWebsite', args: { url }, result: br });
              toolCalls.push({ function: { name: 'browseWebsite', arguments: { url } } });
              const sum = String(br?.summary || br?.content || '');
              finalContent = sum || finalContent;
              navigateVisual(userId, url);
            }
          } catch { /* noop */ }
          if (!finalContent) {
            finalContent = 'لم أحصل على رد من النموذج. جرّب صياغة مختلفة.';
          }
        } catch (e) {
          try { console.log(e && e.message); } catch (e00) { void e00; }
          if (geminiClient) {
            try {
              const geminiModel = geminiClient.getGenerativeModel({
                model: 'gemini-1.5-pro-latest',
                systemInstruction: `${MANUS_STYLE_PROMPT}\n\n${languageDirective}`,
                tools: [{ functionDeclarations: adaptToolsForGemini(availableTools) }]
              });
              const chat = geminiModel.startChat({ history });
              const result = await chat.sendMessage(message);
              const response = result.response;
              const responseCalls = response.functionCalls() || [];
              usage = { total_tokens: result.response.usageMetadata.totalTokenCount };
              if (responseCalls.length > 0) {
                let toolMessages = [];
                for (const call of responseCalls) {
                  const r = await executeTool(userId, sessionId, call.name, call.args);
                  toolResults.push({ tool: call.name, args: call.args, result: r });
                  toolMessages.push({ functionResponse: { name: call.name, response: { content: JSON.stringify(r) } } });
                  toolCalls.push({ function: { name: call.name, arguments: call.args } });
                }
                const secondResult = await chat.sendMessage(JSON.stringify(toolMessages));
                finalContent = secondResult.response.text();
                usage.total_tokens += secondResult.response.usageMetadata.totalTokenCount;
              } else {
                finalContent = response.text();
              }
            } catch (e2) {
              void e2;
              const preview = String(message || '').trim();
              const lower = preview.toLowerCase();
              const hasUrl = /https?:\/\/[^\s]+/i.test(preview);
              const wantsSecurity = /(security|audit|ثغرات|أمن|حماية)/i.test(lower);
              const wantsIngest = /(ingest|knowledge|معرفة|ادخال|استيعاب)/i.test(lower);
              const wantsQuery = /(query|search|سؤال|ابحث|استعلام)/i.test(lower);
              const wantsWebSearch = /(web\s*search|search\s*web|بحث\s*الويب|ابحث\s*في\s*الويب)/i.test(lower);
              const wantsFormat = /(format|prettier|تنسيق)/i.test(lower);
              const wantsLint = /(lint|تحليل|فحص)/i.test(lower);
              const wantsDepcheck = /(depcheck|dependencies|مكتبات|حزم|اعتماديات|حزم\s*غير\s*مستخدمة|dependencies\s*audit)/i.test(lower);
              const wantsTests = /(tests?|اختبار|تشغيل\s*الاختبارات|unit\s*tests?|e2e)/i.test(lower);
              const wantsBrowserDiag = /(diagnostic|تشخيص|مشاكل\s*الموقع|network\s*failures|console\s*errors)/i.test(lower);
              const wantsApiSearch = /(api|دمج\s*api|ربط\s*واجهة\s*برمجية|endpoint|integrate\s*api)/i.test(lower);
              const wantsNpmSearch = /(npm\s*search|بحث\s*npm|حزمة\s*npm)/i.test(lower);
              const wantsGithubSearch = /(github\s*search|بحث\s*جيتهاب|مستودع\s*جيتهاب)/i.test(lower);
              const wantsNetworkScan = /(network\s*scan|فحص\s*الشبكة|nmap|ports)/i.test(lower);
              const wantsRegisterHttp = /(register\s*http|سجل\s*موصل\s*http|اربط\s*api\s*http)/i.test(lower);
              const wantsCodeSearch = /(search\s*code|ابحث\s*في\s*الشيفرة|grep|regex)/i.test(lower);
              const wantsRefactorReplace = /(replace|استبدل|بحث\s*واستبدال)/i.test(lower);
              const wantsRefactorRename = /(rename\s*import|اعادة\s*تسمية\s*الاستيراد)/i.test(lower);
              const wantsAutoFix = /(auto\s*fix|اصلح\s*تلقائيا)/i.test(lower);
              const wantsReadFile = /(اقرأ\s*ملف|read\s*file)/i.test(lower);
              const wantsWriteFile = /(اكتب\s*ملف|write\s*file)/i.test(lower);
              const wantsDeleteFile = /(احذف\s*ملف|delete\s*file)/i.test(lower);
              const wantsListFiles = /(سرد\s*الملفات|list\s*files)/i.test(lower);
              const wantsScreenshot = /(screenshot|لقطة\s*شاشة)/i.test(lower);
              const wantsAnalyzeImage = /(حلل\s*صورة|analyze\s*image)/i.test(lower);
              const wantsDeploy = /(deploy|نشر)/i.test(lower);
              let pieces = [];
              if (hasUrl) {
                try {
                  const rawUrl = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
                  const url = rawUrl ? rawUrl.replace(/[.,;:!?)]+$/,'') : rawUrl;
                  const r = await executeTool(userId, sessionId, 'browseWebsite', { url });
                  toolResults.push({ tool: 'browseWebsite', args: { url }, result: r });
                  toolCalls.push({ function: { name: 'browseWebsite', arguments: { url } } });
                  pieces.push(String(r?.summary || r?.content || ''));
                  navigateVisual(userId, url);
                } catch (e3) { void e3; }
              } else {
                try {
                  const url2 = resolveSiteToUrl(preview);
                  if (url2) {
                    const r = await executeTool(userId, sessionId, 'browseWebsite', { url: url2 });
                    toolResults.push({ tool: 'browseWebsite', args: { url: url2 }, result: r });
                    toolCalls.push({ function: { name: 'browseWebsite', arguments: { url: url2 } } });
                    pieces.push(String(r?.summary || r?.content || ''));
                    navigateVisual(userId, url2);
                  }
                } catch (e3b) { void e3b; }
              }
              if (wantsSecurity) {
                try {
                  const ordered = orderByRanking(['runSecurityAudit','scanSecrets','scanInsecurePatterns']);
                  const [t1,t2,t3] = ordered;
                  const a = await executeTool(userId, sessionId, t1, {});
                  const s = await executeTool(userId, sessionId, t2, {});
                  const i = await executeTool(userId, sessionId, t3, {});
                  toolResults.push({ tool: 'runSecurityAudit', args: {}, result: a });
                  toolResults.push({ tool: 'scanSecrets', args: {}, result: s });
                  toolResults.push({ tool: 'scanInsecurePatterns', args: {}, result: i });
                  toolCalls.push({ function: { name: 'runSecurityAudit', arguments: {} } });
                  toolCalls.push({ function: { name: 'scanSecrets', arguments: {} } });
                  toolCalls.push({ function: { name: 'scanInsecurePatterns', arguments: {} } });
                  pieces.push(['Security audit completed.', a?.summary, s?.summary, i?.summary].filter(Boolean).join('\n'));
                } catch (e4) { void e4; }
              }
              if (wantsIngest) {
                try {
                  const title = preview.slice(0, 60);
                  const r = await executeTool(userId, sessionId, 'ingestDocument', { documentTitle: title, content: preview });
                  toolResults.push({ tool: 'ingestDocument', args: { documentTitle: title }, result: r });
                  toolCalls.push({ function: { name: 'ingestDocument', arguments: { documentTitle: title } } });
                  pieces.push(String(r?.summary || r?.message || ''));
                } catch (e5) { void e5; }
              }
              if (wantsQuery) {
                try {
                  const r = await executeTool(userId, sessionId, 'queryKnowledgeBase', { query: preview });
                  toolResults.push({ tool: 'queryKnowledgeBase', args: { query: preview }, result: r });
                  toolCalls.push({ function: { name: 'queryKnowledgeBase', arguments: { query: preview } } });
                  const items = (r?.results || []).slice(0, 3).map(x => `- ${x.title} (score: ${x.score?.toFixed?.(2) || x.score})`).join('\n');
                  pieces.push(items || 'No related knowledge found.');
                } catch (e6) { void e6; }
              }
              if (wantsWebSearch) {
                try {
                  const r = await executeTool(userId, sessionId, 'searchWeb', { query: preview });
                  toolResults.push({ tool: 'searchWeb', args: { query: preview }, result: r });
                  toolCalls.push({ function: { name: 'searchWeb', arguments: { query: preview } } });
                  const results = (r?.results || r?.items || []).slice(0, 5).map(x => `- ${x.title || x.name}: ${x.url || x.link}`).join('\n');
                  pieces.push(results || 'No web results found.');
                } catch (eSW) { void eSW; }
              }
              if (wantsFormat) {
                try {
                  const r = await executeTool(userId, sessionId, 'formatPrettier', {});
                  toolResults.push({ tool: 'formatPrettier', args: {}, result: r });
                  toolCalls.push({ function: { name: 'formatPrettier', arguments: {} } });
                  pieces.push('Formatting applied.');
                } catch (e7) { void e7; }
              }
              if (wantsLint) {
                try {
                  const r = await executeTool(userId, sessionId, 'runLint', {});
                  toolResults.push({ tool: 'runLint', args: {}, result: r });
                  toolCalls.push({ function: { name: 'runLint', arguments: {} } });
                  pieces.push('Lint analysis completed.');
                } catch (e8) { void e8; }
              }
              if (wantsTests) {
                try {
                  const fileMatch = preview.match(/\S+\.(?:js|jsx|ts|tsx|mjs)/i);
                  if (fileMatch) {
                    const fp = fileMatch[0];
                    const r = await executeTool(userId, sessionId, 'generateAndRunTests', { filePath: fp });
                    toolResults.push({ tool: 'generateAndRunTests', args: { filePath: fp }, result: r });
                    toolCalls.push({ function: { name: 'generateAndRunTests', arguments: { filePath: fp } } });
                    pieces.push('Tests generated and executed.');
                  }
                } catch (eT) { void eT; }
              }
              if (wantsBrowserDiag) {
                try {
                  const url = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
                  if (url) {
                    const r = await executeTool(userId, sessionId, 'analyzePageState', { url });
                    toolResults.push({ tool: 'analyzePageState', args: { url }, result: r });
                    toolCalls.push({ function: { name: 'analyzePageState', arguments: { url } } });
                    pieces.push(String(r?.summary || 'Page diagnostics completed.'));
                  }
                } catch (eBD) { void eBD; }
              }
              if (wantsApiSearch) {
                try {
                  const r = await executeTool(userId, sessionId, 'searchAPI', { query: preview });
                  toolResults.push({ tool: 'searchAPI', args: { query: preview }, result: r });
                  toolCalls.push({ function: { name: 'searchAPI', arguments: { query: preview } } });
                  const results = (r?.mockResults || []).slice(0, 5).map(x => `- ${x.name}: ${x.url}`).join('\n');
                  pieces.push(results || 'No API candidates found.');
                } catch (eAS) { void eAS; }
              }
              if (wantsNpmSearch) {
                try {
                  const q = (preview.match(/npm\s*:\s*([^\n]+)/i) || [])[1] || preview;
                  const r = await executeTool(userId, sessionId, 'discoverNpmPackages', { query: q, size: 5 });
                  toolResults.push({ tool: 'discoverNpmPackages', args: { query: q }, result: r });
                  toolCalls.push({ function: { name: 'discoverNpmPackages', arguments: { query: q } } });
                  const items = (r?.items || []).slice(0, 5).map(x => `- ${x.name} ${x.version}: ${x.links?.homepage || x.links?.npm || ''}`).join('\n');
                  pieces.push(items || 'No npm packages found.');
                } catch (eNP) { void eNP; }
              }
              if (wantsGithubSearch) {
                try {
                  const q = (preview.match(/gh\s*:\s*([^\n]+)/i) || [])[1] || preview;
                  const r = await executeTool(userId, sessionId, 'discoverGitHubRepos', { query: q, size: 5 });
                  toolResults.push({ tool: 'discoverGitHubRepos', args: { query: q }, result: r });
                  toolCalls.push({ function: { name: 'discoverGitHubRepos', arguments: { query: q } } });
                  const items = (r?.items || []).slice(0, 5).map(x => `- ${x.full_name} ⭐ ${x.stars}: ${x.url}`).join('\n');
                  pieces.push(items || 'No GitHub repos found.');
                } catch (eGH) { void eGH; }
              }
              if (wantsNetworkScan) {
                try {
                  const host = (preview.match(/host\s*:\s*(\S+)/i) || [])[1] || 'localhost';
                  const r = await executeTool(userId, sessionId, 'authorizedNetworkScan', { host });
                  toolResults.push({ tool: 'authorizedNetworkScan', args: { host }, result: r });
                  toolCalls.push({ function: { name: 'authorizedNetworkScan', arguments: { host } } });
                  pieces.push('Network scan completed.');
                } catch (eNS) { void eNS; }
              }
              if (wantsRegisterHttp) {
                try {
                  const base = (preview.match(/base\s*:\s*(\S+)/i) || [])[1];
                  const name = (preview.match(/name\s*:\s*(\S+)/i) || [])[1] || 'external_http';
                  if (base) {
                    const r = await executeTool(userId, sessionId, 'registerHttpTool', { name, baseUrl: base });
                    toolResults.push({ tool: 'registerHttpTool', args: { name, baseUrl: base }, result: r });
                    toolCalls.push({ function: { name: 'registerHttpTool', arguments: { name, baseUrl: base } } });
                    pieces.push('HTTP connector registered.');
                  }
                } catch (eRH) { void eRH; }
              }
              if (wantsDepcheck) {
                try {
                  const r = await executeTool(userId, sessionId, 'runDepcheck', { dir: 'backend' });
                  toolResults.push({ tool: 'runDepcheck', args: { dir: 'backend' }, result: r });
                  toolCalls.push({ function: { name: 'runDepcheck', arguments: { dir: 'backend' } } });
                  pieces.push('Dependency analysis completed.');
                } catch (eDC) { void eDC; }
              }
              if (wantsCodeSearch) {
                try {
                  const r = await executeTool(userId, sessionId, 'searchCode', { pattern: preview });
                  toolResults.push({ tool: 'searchCode', args: { pattern: preview }, result: r });
                  toolCalls.push({ function: { name: 'searchCode', arguments: { pattern: preview } } });
                  pieces.push('Code search completed.');
                } catch (eSC) { void eSC; }
              }
              if (wantsRefactorReplace) {
                try {
                  const mFind = preview.match(/find:\s*([^\n]+)/i);
                  const mReplace = preview.match(/replace:\s*([^\n]+)/i);
                  if (mFind && mReplace) {
                    const r = await executeTool(userId, sessionId, 'textReplace', { find: mFind[1], replace: mReplace[1], globs: ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'] });
                    toolResults.push({ tool: 'textReplace', args: { find: mFind[1], replace: mReplace[1] }, result: r });
                    toolCalls.push({ function: { name: 'textReplace', arguments: { find: mFind[1], replace: mReplace[1] } } });
                    pieces.push('Text replace executed.');
                  }
                } catch (eRR) { void eRR; }
              }
              if (wantsRefactorRename) {
                try {
                  const mFrom = preview.match(/from:\s*([^\n]+)/i);
                  const mTo = preview.match(/to:\s*([^\n]+)/i);
                  if (mFrom && mTo) {
                    const r = await executeTool(userId, sessionId, 'renameImport', { from: mFrom[1], to: mTo[1], globs: ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'] });
                    toolResults.push({ tool: 'renameImport', args: { from: mFrom[1], to: mTo[1] }, result: r });
                    toolCalls.push({ function: { name: 'renameImport', arguments: { from: mFrom[1], to: mTo[1] } } });
                    pieces.push('Import rename applied.');
                  }
                } catch (eRI) { void eRI; }
              }
              if (wantsAutoFix) {
                try {
                  const r = await executeTool(userId, sessionId, 'autoFix', {});
                  toolResults.push({ tool: 'autoFix', args: {}, result: r });
                  toolCalls.push({ function: { name: 'autoFix', arguments: {} } });
                  pieces.push('Auto fix completed.');
                } catch (eAF) { void eAF; }
              }
              if (wantsReadFile) {
                try {
                  const m = preview.match(/\s(\S+\.(?:js|jsx|ts|tsx|mjs|json|md|txt))/i);
                  if (m) {
                    const r = await executeTool(userId, sessionId, 'readFile', { filePath: m[1] });
                    toolResults.push({ tool: 'readFile', args: { filePath: m[1] }, result: r });
                    toolCalls.push({ function: { name: 'readFile', arguments: { filePath: m[1] } } });
                    pieces.push(String(r?.content || '').slice(0, 1000));
                  }
                } catch (eRF) { void eRF; }
              }
              if (wantsWriteFile) {
                try {
                  const m = preview.match(/path:\s*(\S+)\s+content:\s*([\s\S]+)/i);
                  if (m) {
                    const r = await executeTool(userId, sessionId, 'writeFile', { filePath: m[1], content: m[2] });
                    toolResults.push({ tool: 'writeFile', args: { filePath: m[1] }, result: r });
                    toolCalls.push({ function: { name: 'writeFile', arguments: { filePath: m[1] } } });
                    pieces.push('File written.');
                  }
                } catch (eWF) { void eWF; }
              }
              if (wantsDeleteFile) {
                try {
                  const m = preview.match(/\s(\S+\.(?:js|jsx|ts|tsx|mjs|json|md|txt))/i);
                  if (m) {
                    const r = await executeTool(userId, sessionId, 'deleteFile', { filePath: m[1] });
                    toolResults.push({ tool: 'deleteFile', args: { filePath: m[1] }, result: r });
                    toolCalls.push({ function: { name: 'deleteFile', arguments: { filePath: m[1] } } });
                    pieces.push('File deleted.');
                  }
                } catch (eDF) { void eDF; }
              }
              if (wantsListFiles) {
                try {
                  const r = await executeTool(userId, sessionId, 'listFiles', { directoryPath: '.' });
                  toolResults.push({ tool: 'listFiles', args: { directoryPath: '.' }, result: r });
                  toolCalls.push({ function: { name: 'listFiles', arguments: { directoryPath: '.' } } });
                  pieces.push('Files listed.');
                } catch (eLF) { void eLF; }
              }
              if (wantsScreenshot) {
                try {
                  const url = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
                  if (url) {
                    const r = await executeTool(userId, sessionId, 'screenshotWebsite', { url, fullPage: false });
                    toolResults.push({ tool: 'screenshotWebsite', args: { url }, result: r });
                    toolCalls.push({ function: { name: 'screenshotWebsite', arguments: { url } } });
                    pieces.push('Screenshot captured.');
                  }
                } catch (eSS) { void eSS; }
              }
              if (wantsAnalyzeImage) {
                try {
                  const url = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
                  if (url) {
                    const r = await executeTool(userId, sessionId, 'analyzeImage', { imageUrl: url });
                    toolResults.push({ tool: 'analyzeImage', args: { imageUrl: url }, result: r });
                    toolCalls.push({ function: { name: 'analyzeImage', arguments: { imageUrl: url } } });
                    pieces.push('Image analysis completed.');
                  }
                } catch (eAI) { void eAI; }
              }
              if (wantsDeploy) {
                try {
                  const r = await executeTool(userId, sessionId, 'deployProject', { projectPath: process.cwd(), platform: 'vercel' });
                  toolResults.push({ tool: 'deployProject', args: { projectPath: process.cwd(), platform: 'vercel' }, result: r });
                  toolCalls.push({ function: { name: 'deployProject', arguments: { projectPath: process.cwd(), platform: 'vercel' } } });
                  pieces.push('Deployment initiated.');
                } catch (eDP) { void eDP; }
              }
              {
                const good = pieces.filter(Boolean);
                if (good.length) {
                  finalContent = good.join('\n\n');
                } else {
                  finalContent = targetLang === 'ar'
                    ? 'سيواصل جو العمل باستخدام الأدوات المحلية دون الحاجة لمفاتيح.'
                    : 'Joe will continue using local tools without requiring any keys.';
              }
            }
          }
          if (!finalContent || !String(finalContent).trim()) {
            const preview = String(message || '').trim();
            const lower = preview.toLowerCase();
            const hasUrl = /https?:\/\/[^\s]+/i.test(preview);
            const wantsSecurity = /(security|audit|ثغرات|أمن|حماية)/i.test(lower);
            const wantsIngest = /(ingest|knowledge|معرفة|ادخال|استيعاب)/i.test(lower);
            const wantsQuery = /(query|search|سؤال|ابحث|استعلام)/i.test(lower);
            const wantsFormat = /(format|prettier|تنسيق)/i.test(lower);
            const wantsLint = /(lint|تحليل|فحص)/i.test(lower);
            const wantsImage = /(image|صورة|لوغو|شعار|generate\s*image)/i.test(lower);
            const wantsWebsite = /(website|ويب|موقع|landing\s*page|انشاء\s*موقع|بناء\s*موقع)/i.test(lower);
            let pieces = [];
            if (hasUrl) {
              try {
                const rawUrl = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
                const url = rawUrl ? rawUrl.replace(/[.,;:!?)]+$/,'') : rawUrl;
                const isImageUrl = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
                if (isImageUrl) {
                  const out = await executeTool(userId, sessionId, 'downloadImageFromUrl', { url, userId });
                  toolResults.push({ tool: 'downloadImageFromUrl', args: { url }, result: out });
                  toolCalls.push({ function: { name: 'downloadImageFromUrl', arguments: { url } } });
                  const link = out?.absoluteUrl || out?.publicUrl || '';
                  const msg = link ? `تم تحميل الصورة: ${link}` : 'تم تحميل الصورة.';
                  pieces.push(msg);
                } else {
                  const r = await executeTool(userId, sessionId, 'browseWebsite', { url });
                  toolResults.push({ tool: 'browseWebsite', args: { url }, result: r });
                  toolCalls.push({ function: { name: 'browseWebsite', arguments: { url } } });
                  pieces.push(String(r?.summary || r?.content || ''));
                  navigateVisual(url);
                }
              } catch (e11) { void e11; }
            }
            if (wantsImage) {
              try {
                const outPath = `/tmp/joe-image-${Date.now()}.png`;
                const r = await executeTool(userId, sessionId, 'generateImage', { prompt: preview, style: 'modern', outputFilePath: outPath });
                toolResults.push({ tool: 'generateImage', args: { prompt: preview, style: 'modern', outputFilePath: outPath }, result: r });
                toolCalls.push({ function: { name: 'generateImage', arguments: { prompt: preview, style: 'modern', outputFilePath: outPath } } });
                pieces.push(`Image task queued. Output: ${outPath}`);
              } catch (eImg) { void eImg; }
            }
            if (wantsWebsite) {
              try {
                const r = await toolManager.execute('autoPlanAndExecute', { instruction: preview, context: { description: preview } });
                toolResults.push({ tool: 'autoPlanAndExecute', args: { instruction: preview }, result: r });
                toolCalls.push({ function: { name: 'autoPlanAndExecute', arguments: { instruction: preview } } });
                const planText = Array.isArray(r?.plan) ? r.plan.map((p, i) => `${i+1}. ${p}`).join('\n') : '';
                pieces.push(['Website orchestration initiated.', planText].filter(Boolean).join('\n'));
              } catch (eWeb) { void eWeb; }
            }
            if (wantsSecurity) {
              try {
                const ordered = orderByRanking(['runSecurityAudit','scanSecrets','scanInsecurePatterns']);
                const [t1,t2,t3] = ordered;
                const a = await executeTool(userId, sessionId, t1, {});
                const s = await executeTool(userId, sessionId, t2, {});
                const i = await executeTool(userId, sessionId, t3, {});
                toolResults.push({ tool: 'runSecurityAudit', args: {}, result: a });
                toolResults.push({ tool: 'scanSecrets', args: {}, result: s });
                toolResults.push({ tool: 'scanInsecurePatterns', args: {}, result: i });
                toolCalls.push({ function: { name: 'runSecurityAudit', arguments: {} } });
                toolCalls.push({ function: { name: 'scanSecrets', arguments: {} } });
                toolCalls.push({ function: { name: 'scanInsecurePatterns', arguments: {} } });
                pieces.push(['Security audit completed.', a?.summary, s?.summary, i?.summary].filter(Boolean).join('\n'));
              } catch (e12) { void e12; }
            }
            if (wantsIngest) {
              try {
                const title = preview.slice(0, 60);
                const r = await executeTool(userId, sessionId, 'ingestDocument', { documentTitle: title, content: preview });
                toolResults.push({ tool: 'ingestDocument', args: { documentTitle: title }, result: r });
                toolCalls.push({ function: { name: 'ingestDocument', arguments: { documentTitle: title } } });
                pieces.push(String(r?.summary || r?.message || ''));
              } catch (e13) { void e13; }
            }
            if (wantsQuery) {
              try {
                const r = await executeTool(userId, sessionId, 'queryKnowledgeBase', { query: preview });
                toolResults.push({ tool: 'queryKnowledgeBase', args: { query: preview }, result: r });
                toolCalls.push({ function: { name: 'queryKnowledgeBase', arguments: { query: preview } } });
                const items = (r?.results || []).slice(0, 3).map(x => `- ${x.title} (score: ${x.score?.toFixed?.(2) || x.score})`).join('\n');
                pieces.push(items || 'No related knowledge found.');
              } catch (e14) { void e14; }
            }
            if (wantsFormat) {
              try {
                const r = await executeTool(userId, sessionId, 'formatPrettier', {});
                toolResults.push({ tool: 'formatPrettier', args: {}, result: r });
                toolCalls.push({ function: { name: 'formatPrettier', arguments: {} } });
                pieces.push('Formatting applied.');
              } catch (e15) { void e15; }
            }
            if (wantsLint) {
              try {
                const r = await executeTool(userId, sessionId, 'runLint', {});
                toolResults.push({ tool: 'runLint', args: {}, result: r });
                toolCalls.push({ function: { name: 'runLint', arguments: {} } });
                pieces.push('Lint analysis completed.');
              } catch (e16) { void e16; }
            }
            const good = pieces.filter(Boolean);
            if (good.length) {
              finalContent = good.join('\n\n');
            } else {
              finalContent = targetLang === 'ar'
                ? 'سيواصل جو العمل باستخدام الأدوات المحلية دون الحاجة لمفاتيح.'
                : 'Joe will continue using local tools without requiring any keys.';
            }
          }
          }
        }
    } else if (!handled) {
        const preview = String(message || '').trim();
        const lower = preview.toLowerCase();
        const hasUrl = /https?:\/\/[^\s]+/i.test(preview);
        const wantsSecurity = /(security|audit|ثغرات|أمن|حماية)/i.test(lower);
        const wantsIngest = /(ingest|knowledge|معرفة|ادخال|استيعاب)/i.test(lower);
        const wantsQuery = /(query|search|سؤال|ابحث|استعلام)/i.test(lower);
        const wantsWebSearch = /(web\s*search|search\s*web|بحث\s*الويب|ابحث\s*في\s*الويب)/i.test(lower);
        const wantsFormat = /(format|prettier|تنسيق)/i.test(lower);
        const wantsLint = /(lint|تحليل|فحص)/i.test(lower);
        const wantsImage = /(image|صورة|لوغو|شعار|generate\s*image)/i.test(lower);
        const wantsWebsite = /(website|ويب|موقع|landing\s*page|انشاء\s*موقع|بناء\s*موقع)/i.test(lower);
        const wantsDepcheck = /(depcheck|dependencies|مكتبات|حزم|اعتماديات|حزم\s*غير\s*مستخدمة|dependencies\s*audit)/i.test(lower);
        const wantsTests = /(tests?|اختبار|تشغيل\s*الاختبارات|unit\s*tests?|e2e)/i.test(lower);
        const wantsBrowserDiag = /(diagnostic|تشخيص|مشاكل\s*الموقع|network\s*failures|console\s*errors)/i.test(lower);
        const wantsApiSearch = /(api|دمج\s*api|ربط\s*واجهة\s*برمجية|endpoint|integrate\s*api)/i.test(lower);
        const wantsNpmSearch = /(npm\s*search|بحث\s*npm|حزمة\s*npm)/i.test(lower);
        const wantsGithubSearch = /(github\s*search|بحث\s*جيتهاب|مستودع\s*جيتهاب)/i.test(lower);
        const wantsNetworkScan = /(network\s*scan|فحص\s*الشبكة|nmap|ports)/i.test(lower);
        const wantsRegisterHttp = /(register\s*http|سجل\s*موصل\s*http|اربط\s*api\s*http)/i.test(lower);
        const wantsCodeSearch = /(search\s*code|ابحث\s*في\s*الشيفرة|grep|regex)/i.test(lower);
        const wantsRefactorReplace = /(replace|استبدل|بحث\s*واستبدال)/i.test(lower);
        const wantsRefactorRename = /(rename\s*import|اعادة\s*تسمية\s*الاستيراد)/i.test(lower);
        const wantsAutoFix = /(auto\s*fix|اصلح\s*تلقائيا)/i.test(lower);
        const wantsReadFile = /(اقرأ\s*ملف|read\s*file)/i.test(lower);
        const wantsWriteFile = /(اكتب\s*ملف|write\s*file)/i.test(lower);
        const wantsDeleteFile = /(احذف\s*ملف|delete\s*file)/i.test(lower);
        const wantsListFiles = /(سرد\s*الملفات|list\s*files)/i.test(lower);
        const wantsScreenshot = /(screenshot|لقطة\s*شاشة)/i.test(lower);
        const wantsAnalyzeImage = /(حلل\s*صورة|analyze\s*image)/i.test(lower);
        const wantsDeploy = /(deploy|نشر)/i.test(lower);

        let pieces = [];
        if (hasUrl) {
          try {
            const url = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
            const isVideo = /(youtube\.com|youtu\.be|vimeo\.com)|\.(mp4|webm|m4v|mov)(\?|$)/i.test(url);
            if (isVideo) {
              const vr = await toolManager.execute('analyzeVideoFromUrl', { url, targetLanguage: targetLang });
              toolResults.push({ tool: 'analyzeVideoFromUrl', args: { url, targetLanguage: targetLang }, result: vr });
              toolCalls.push({ function: { name: 'analyzeVideoFromUrl', arguments: { url, targetLanguage: targetLang } } });
              const tx = String(vr?.transcript || '').trim();
              if (tx) {
                pieces.push(tx.slice(0, 2000));
              } else {
                pieces.push(targetLang === 'ar' ? 'لا يوجد نص مستخرج للفيديو.' : 'No transcript extracted for the video.');
              }
            } else if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url)) {
              const out = await toolManager.execute('downloadImageFromUrl', { url, userId });
              toolResults.push({ tool: 'downloadImageFromUrl', args: { url }, result: out });
              toolCalls.push({ function: { name: 'downloadImageFromUrl', arguments: { url } } });
              const link = out?.absoluteUrl || out?.publicUrl || '';
              const msg = link ? `تم تحميل الصورة: ${link}` : 'تم تحميل الصورة.';
              pieces.push(msg);
            } else {
              const r = await toolManager.execute('browseWebsite', { url });
              toolResults.push({ tool: 'browseWebsite', args: { url }, result: r });
              toolCalls.push({ function: { name: 'browseWebsite', arguments: { url } } });
              pieces.push(String(r?.summary || r?.content || ''));
              navigateVisual(url);
            }
          } catch { void 0 }
        }
        if (wantsImage) {
          try {
            const safeUser = String(userId || '').replace(/[^A-Za-z0-9_:-]/g, '_');
            const fileName = `joe-image-${Date.now()}.png`;
            const outPath = path.join(process.cwd(), 'public-site', 'uploads', safeUser, fileName);
            const r = await toolManager.execute('generateImage', { prompt: preview, style: 'modern', outputFilePath: outPath });
            toolResults.push({ tool: 'generateImage', args: { prompt: preview, style: 'modern', outputFilePath: outPath }, result: r });
            toolCalls.push({ function: { name: 'generateImage', arguments: { prompt: preview, style: 'modern', outputFilePath: outPath } } });
            const link = r?.absoluteUrl || r?.publicUrl || '';
            const msg = targetLang === 'ar' ? (link ? `تم إنشاء الصورة: ${link}` : 'تم إنشاء الصورة.') : (link ? `Image generated: ${link}` : 'Image generated.');
            pieces.push(msg);
          } catch { /* noop */ }
        }
        if (wantsWebsite) {
          try {
            const r = await toolManager.execute('autoPlanAndExecute', { instruction: preview, context: { description: preview } });
            toolResults.push({ tool: 'autoPlanAndExecute', args: { instruction: preview }, result: r });
            toolCalls.push({ function: { name: 'autoPlanAndExecute', arguments: { instruction: preview } } });
            const planText = Array.isArray(r?.plan) ? r.plan.map((p, i) => `${i+1}. ${p}`).join('\n') : '';
            pieces.push(['Website orchestration initiated.', planText].filter(Boolean).join('\n'));
          } catch { /* noop */ }
        }
          if (wantsSecurity) {
            try {
              const ordered = orderByRanking(['runSecurityAudit','scanSecrets','scanInsecurePatterns']);
              const [t1,t2,t3] = ordered;
              const a = await toolManager.execute(t1, {});
              const s = await toolManager.execute(t2, {});
              const i = await toolManager.execute(t3, {});
              toolResults.push({ tool: 'runSecurityAudit', args: {}, result: a });
              toolResults.push({ tool: 'scanSecrets', args: {}, result: s });
              toolResults.push({ tool: 'scanInsecurePatterns', args: {}, result: i });
              toolCalls.push({ function: { name: 'runSecurityAudit', arguments: {} } });
              toolCalls.push({ function: { name: 'scanSecrets', arguments: {} } });
              toolCalls.push({ function: { name: 'scanInsecurePatterns', arguments: {} } });
              pieces.push(['Security audit completed.', a?.summary, s?.summary, i?.summary].filter(Boolean).join('\n'));
            } catch { void 0 }
          }
        if (wantsIngest) {
          try {
            const title = preview.slice(0, 60);
            const r = await toolManager.execute('ingestDocument', { documentTitle: title, content: preview });
            toolResults.push({ tool: 'ingestDocument', args: { documentTitle: title }, result: r });
            toolCalls.push({ function: { name: 'ingestDocument', arguments: { documentTitle: title } } });
            pieces.push(String(r?.summary || r?.message || ''));
          } catch { void 0 }
        }
        if (wantsQuery) {
          try {
            const r = await toolManager.execute('queryKnowledgeBase', { query: preview });
            toolResults.push({ tool: 'queryKnowledgeBase', args: { query: preview }, result: r });
            toolCalls.push({ function: { name: 'queryKnowledgeBase', arguments: { query: preview } } });
            const items = (r?.results || []).slice(0, 3).map(x => `- ${x.title} (score: ${x.score?.toFixed?.(2) || x.score})`).join('\n');
            pieces.push(items || 'No related knowledge found.');
          } catch { void 0 }
        }
        if (wantsWebSearch) {
          try {
            const r = await toolManager.execute('searchWeb', { query: preview });
            toolResults.push({ tool: 'searchWeb', args: { query: preview }, result: r });
            toolCalls.push({ function: { name: 'searchWeb', arguments: { query: preview } } });
            const results = (r?.results || r?.items || []).slice(0, 5).map(x => `- ${x.title || x.name}: ${x.url || x.link}`).join('\n');
            pieces.push(results || 'No web results found.');
          } catch { void 0 }
        }
        if (wantsFormat) {
          try {
            const r = await toolManager.execute('formatPrettier', {});
            toolResults.push({ tool: 'formatPrettier', args: {}, result: r });
            toolCalls.push({ function: { name: 'formatPrettier', arguments: {} } });
            pieces.push('Formatting applied.');
          } catch { void 0 }
        }
        if (wantsLint) {
          try {
            const r = await toolManager.execute('runLint', {});
            toolResults.push({ tool: 'runLint', args: {}, result: r });
            toolCalls.push({ function: { name: 'runLint', arguments: {} } });
            pieces.push('Lint analysis completed.');
          } catch { void 0 }
        }
        if (wantsTests) {
          try {
            const fileMatch = preview.match(/\S+\.(?:js|jsx|ts|tsx|mjs)/i);
            if (fileMatch) {
              const fp = fileMatch[0];
              const r = await toolManager.execute('generateAndRunTests', { filePath: fp });
              toolResults.push({ tool: 'generateAndRunTests', args: { filePath: fp }, result: r });
              toolCalls.push({ function: { name: 'generateAndRunTests', arguments: { filePath: fp } } });
              pieces.push('Tests generated and executed.');
            }
          } catch { void 0 }
        }
        if (wantsBrowserDiag) {
          try {
            const url = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
            if (url) {
              const r = await toolManager.execute('analyzePageState', { url });
              toolResults.push({ tool: 'analyzePageState', args: { url }, result: r });
              toolCalls.push({ function: { name: 'analyzePageState', arguments: { url } } });
              pieces.push(String(r?.summary || 'Page diagnostics completed.'));
            }
          } catch { void 0 }
        }
        if (wantsApiSearch) {
          try {
            const r = await toolManager.execute('searchAPI', { query: preview });
            toolResults.push({ tool: 'searchAPI', args: { query: preview }, result: r });
            toolCalls.push({ function: { name: 'searchAPI', arguments: { query: preview } } });
            const results = (r?.mockResults || []).slice(0, 5).map(x => `- ${x.name}: ${x.url}`).join('\n');
            pieces.push(results || 'No API candidates found.');
          } catch { void 0 }
        }
        if (wantsNpmSearch) {
          try {
            const q = (preview.match(/npm\s*:\s*([^\n]+)/i) || [])[1] || preview;
            const r = await toolManager.execute('discoverNpmPackages', { query: q, size: 5 });
            toolResults.push({ tool: 'discoverNpmPackages', args: { query: q }, result: r });
            toolCalls.push({ function: { name: 'discoverNpmPackages', arguments: { query: q } } });
            const items = (r?.items || []).slice(0, 5).map(x => `- ${x.name} ${x.version}: ${x.links?.homepage || x.links?.npm || ''}`).join('\n');
            pieces.push(items || 'No npm packages found.');
          } catch { void 0 }
        }
        if (wantsGithubSearch) {
          try {
            const q = (preview.match(/gh\s*:\s*([^\n]+)/i) || [])[1] || preview;
            const r = await toolManager.execute('discoverGitHubRepos', { query: q, size: 5 });
            toolResults.push({ tool: 'discoverGitHubRepos', args: { query: q }, result: r });
            toolCalls.push({ function: { name: 'discoverGitHubRepos', arguments: { query: q } } });
            const items = (r?.items || []).slice(0, 5).map(x => `- ${x.full_name} ⭐ ${x.stars}: ${x.url}`).join('\n');
            pieces.push(items || 'No GitHub repos found.');
          } catch { void 0 }
        }
        if (wantsNetworkScan) {
          try {
            const host = (preview.match(/host\s*:\s*(\S+)/i) || [])[1] || 'localhost';
            const r = await toolManager.execute('authorizedNetworkScan', { host });
            toolResults.push({ tool: 'authorizedNetworkScan', args: { host }, result: r });
            toolCalls.push({ function: { name: 'authorizedNetworkScan', arguments: { host } } });
            pieces.push('Network scan completed.');
          } catch { void 0 }
        }
        if (wantsRegisterHttp) {
          try {
            const base = (preview.match(/base\s*:\s*(\S+)/i) || [])[1];
            const name = (preview.match(/name\s*:\s*(\S+)/i) || [])[1] || 'external_http';
            if (base) {
              const r = await toolManager.execute('registerHttpTool', { name, baseUrl: base });
              toolResults.push({ tool: 'registerHttpTool', args: { name, baseUrl: base }, result: r });
              toolCalls.push({ function: { name: 'registerHttpTool', arguments: { name, baseUrl: base } } });
              pieces.push('HTTP connector registered.');
            }
          } catch { void 0 }
        }
        if (wantsDepcheck) {
          try {
            const r = await toolManager.execute('runDepcheck', { dir: 'backend' });
            toolResults.push({ tool: 'runDepcheck', args: { dir: 'backend' }, result: r });
            toolCalls.push({ function: { name: 'runDepcheck', arguments: { dir: 'backend' } } });
            pieces.push('Dependency analysis completed.');
          } catch { void 0 }
        }
        if (wantsCodeSearch) {
          try {
            const r = await toolManager.execute('searchCode', { pattern: preview });
            toolResults.push({ tool: 'searchCode', args: { pattern: preview }, result: r });
            toolCalls.push({ function: { name: 'searchCode', arguments: { pattern: preview } } });
            pieces.push('Code search completed.');
          } catch { void 0 }
        }
        if (wantsRefactorReplace) {
          try {
            const mFind = preview.match(/find:\s*([^\n]+)/i);
            const mReplace = preview.match(/replace:\s*([^\n]+)/i);
            if (mFind && mReplace) {
              const r = await toolManager.execute('textReplace', { find: mFind[1], replace: mReplace[1], globs: ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'] });
              toolResults.push({ tool: 'textReplace', args: { find: mFind[1], replace: mReplace[1] }, result: r });
              toolCalls.push({ function: { name: 'textReplace', arguments: { find: mFind[1], replace: mReplace[1] } } });
              pieces.push('Text replace executed.');
            }
          } catch { void 0 }
        }
        if (wantsRefactorRename) {
          try {
            const mFrom = preview.match(/from:\s*([^\n]+)/i);
            const mTo = preview.match(/to:\s*([^\n]+)/i);
            if (mFrom && mTo) {
              const r = await toolManager.execute('renameImport', { from: mFrom[1], to: mTo[1], globs: ['backend/**/*.mjs','dashboard-x/src/**/*.{js,jsx,ts,tsx}'] });
              toolResults.push({ tool: 'renameImport', args: { from: mFrom[1], to: mTo[1] }, result: r });
              toolCalls.push({ function: { name: 'renameImport', arguments: { from: mFrom[1], to: mTo[1] } } });
              pieces.push('Import rename applied.');
            }
          } catch { void 0 }
        }
        if (wantsAutoFix) {
          try {
            const r = await toolManager.execute('autoFix', {});
            toolResults.push({ tool: 'autoFix', args: {}, result: r });
            toolCalls.push({ function: { name: 'autoFix', arguments: {} } });
            pieces.push('Auto fix completed.');
          } catch { void 0 }
        }
        if (wantsReadFile) {
          try {
            const m = preview.match(/\s(\S+\.(?:js|jsx|ts|tsx|mjs|json|md|txt))/i);
            if (m) {
              const r = await toolManager.execute('readFile', { filePath: m[1] });
              toolResults.push({ tool: 'readFile', args: { filePath: m[1] }, result: r });
              toolCalls.push({ function: { name: 'readFile', arguments: { filePath: m[1] } } });
              pieces.push(String(r?.content || '').slice(0, 1000));
            }
          } catch { void 0 }
        }
        if (wantsWriteFile) {
          try {
            const m = preview.match(/path:\s*(\S+)\s+content:\s*([\s\S]+)/i);
            if (m) {
              const r = await toolManager.execute('writeFile', { filePath: m[1], content: m[2] });
              toolResults.push({ tool: 'writeFile', args: { filePath: m[1] }, result: r });
              toolCalls.push({ function: { name: 'writeFile', arguments: { filePath: m[1] } } });
              pieces.push('File written.');
            }
          } catch { void 0 }
        }
        if (wantsDeleteFile) {
          try {
            const m = preview.match(/\s(\S+\.(?:js|jsx|ts|tsx|mjs|json|md|txt))/i);
            if (m) {
              const r = await toolManager.execute('deleteFile', { filePath: m[1] });
              toolResults.push({ tool: 'deleteFile', args: { filePath: m[1] }, result: r });
              toolCalls.push({ function: { name: 'deleteFile', arguments: { filePath: m[1] } } });
              pieces.push('File deleted.');
            }
          } catch { void 0 }
        }
        if (wantsListFiles) {
          try {
            const r = await toolManager.execute('listFiles', { directoryPath: '.' });
            toolResults.push({ tool: 'listFiles', args: { directoryPath: '.' }, result: r });
            toolCalls.push({ function: { name: 'listFiles', arguments: { directoryPath: '.' } } });
            pieces.push('Files listed.');
          } catch { void 0 }
        }
        if (wantsScreenshot) {
          try {
            const url = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
            if (url) {
              const r = await toolManager.execute('screenshotWebsite', { url, fullPage: false });
              toolResults.push({ tool: 'screenshotWebsite', args: { url }, result: r });
              toolCalls.push({ function: { name: 'screenshotWebsite', arguments: { url } } });
              pieces.push('Screenshot captured.');
            }
          } catch { void 0 }
        }
        if (wantsAnalyzeImage) {
          try {
            const url = (preview.match(/https?:\/\/[^\s]+/i) || [])[0];
            if (url) {
              const r = await toolManager.execute('analyzeImage', { imageUrl: url });
              toolResults.push({ tool: 'analyzeImage', args: { imageUrl: url }, result: r });
              toolCalls.push({ function: { name: 'analyzeImage', arguments: { imageUrl: url } } });
              pieces.push('Image analysis completed.');
            }
          } catch { void 0 }
        }
        if (wantsDeploy) {
          try {
            const r = await toolManager.execute('deployProject', { projectPath: process.cwd(), platform: 'vercel' });
            toolResults.push({ tool: 'deployProject', args: { projectPath: process.cwd(), platform: 'vercel' }, result: r });
            toolCalls.push({ function: { name: 'deployProject', arguments: { projectPath: process.cwd(), platform: 'vercel' } } });
            pieces.push('Deployment initiated.');
          } catch { void 0 }
        }

        if (pieces.length) {
          finalContent = pieces.filter(Boolean).join('\n\n');
        } else {
          finalContent = targetLang === 'ar' ? 'النظام يعمل بالأدوات المحلية مباشرة.' : 'The system operates with local tools directly.';
        }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Processing complete in ${duration}ms.`);
    try { joeEvents.emitProgress(userId, sessionId, 90, 'Saving'); } catch { /* noop */ }

    // 6. Save the complete interaction to memory
    const prefixed = (() => { const t = String(finalContent || ''); return t.startsWith('joe ') ? t : ('joe ' + t); })();
    await memoryManager.saveInteraction(userId, message, prefixed, {
      sessionId, service: `joe-advanced-v9-${model}`, duration, toolResults,
      tokens: usage?.total_tokens
    });

    try { joeEvents.emitProgress(userId, sessionId, 100, 'Done'); } catch { /* noop */ }
    return {
        response: String(finalContent || ''),
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
          

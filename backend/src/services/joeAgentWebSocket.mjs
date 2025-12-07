import { WebSocketServer } from 'ws';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import joeAdvanced from './ai/joe-advanced.service.mjs';
import { setKey, setActive } from './ai/runtime-config.mjs';
import ChatMessage from '../database/models/ChatMessage.mjs';
import ChatSession from '../database/models/ChatSession.mjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../config.mjs';
import { v4 as uuidv4 } from 'uuid';
import BrowserController from './browserController.mjs';

/**
 * Joe Agent WebSocket Server - v2.0 "Unified"
 * This server now directly communicates with the unified Gemini-Phoenix engine.
 * It's simpler, more powerful, and acts as the primary user interface gateway.
 */
export class JoeAgentWebSocketServer {
  constructor(server, dependencies) {
    this.dependencies = dependencies;
    this.wss = new WebSocketServer({ server, path: '/ws/joe-agent', perMessageDeflate: false });
    this.io = dependencies?.io || null;
    if (this.io) {
      this.nsp = this.io.of('/joe-agent');
      this.defaultNsp = this.io.of('/');
      this.setupSocketIOServer();
    }
    joeAdvanced.init(dependencies);
    console.log('🤖 Joe Agent WebSocket Server v2.0 "Unified" Initialized.');
    this.setupWebSocketServer();
    this.setupEventListeners();
    this.streamBuffers = new Map();
    this.rateLimits = new Map();
    this.rateWindowMs = Number(process.env.WS_RATE_WINDOW_MS || 60000);
    this.rateMaxCount = Number(process.env.WS_RATE_MAX_COUNT || 120);
    this.maxMessageLength = Number(process.env.WS_MAX_MESSAGE_LENGTH || 10000000);
    this.browserByUser = new Map();
    // Heartbeat to keep connections alive and detect broken sockets
    this.heartbeat = setInterval(() => {
      this.wss.clients.forEach((client) => {
        if (client.isAlive === false) {
          try { client.terminate(); } catch { void 0 }
          return;
        }
        client.isAlive = false;
        try { client.ping(); } catch { void 0 }
      });
    }, 30000);
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      // Origin check for WebSocket handshake
      try {
        const origin = req.headers?.origin;
        const ua = req.headers['user-agent'];
        const ext = req.headers['sec-websocket-extensions'];
        const proto = req.headers['sec-websocket-protocol'];
        console.log(`[JoeAgentV2] Handshake: UA=${ua || 'N/A'} EXT=${ext || 'N/A'} PROTO=${proto || 'N/A'} ORIGIN=${origin || 'N/A'} PATH=${req.url}`);
        if (origin) {
        const envOrigins = String(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
        const defaults = ['localhost', '.onrender.com', 'api.xelitesolutions.com', 'xelitesolutions.com', 'www.xelitesolutions.com'];
          const allowedHosts = envOrigins.length ? envOrigins : defaults;
          const u = new URL(origin);
          const host = u.host || '';
          const hostname = host.split(':')[0];
          const allowed = allowedHosts.some(h => hostname === h || hostname.endsWith(h) || hostname.includes('localhost'));
          if (!allowed) {
            ws.close(1008, 'Policy Violation: Origin not allowed');
            return;
          }
        }
      } catch { void 0 }
      // 1. استخراج التوكين من URL
      console.log(`[JoeAgentV2] Attempting connection from Origin: ${req.headers.origin}, URL: ${req.url}`);
      const urlParams = new URLSearchParams(req.url.split('?')[1]);
      const token = urlParams.get('token');

      let decoded;
      if (token) {
        try {
          const secret = this.dependencies.JWT_SECRET || config.JWT_SECRET;
          decoded = jwt.verify(token, secret);
        } catch {
          decoded = { userId: `guest:${uuidv4()}`, role: 'guest' };
        }
      } else {
        decoded = { userId: `guest:${uuidv4()}`, role: 'guest' };
      }

      console.log(`[JoeAgentV2] Client connected. User ID: ${decoded.userId}`);
      ws.userId = decoded.userId;
      ws.sessionId = null;
      ws.role = decoded.role;

      // التحقق من الصلاحيات: السماح للمستخدمين العاديين والضيوف
      const allowedRoles = new Set(['super_admin', 'admin', 'user', 'guest']);
      if (!allowedRoles.has(ws.role)) {
        console.log(`[JoeAgentV2] Connection rejected: Insufficient role (${ws.role}).`);
        ws.close(1008, 'Policy Violation: Insufficient role');
        return;
      }

      ws.on('message', async (message) => {
        try {
          let data;
          try {
            data = JSON.parse(message);
          } catch {
            const lang = 'ar';
            const msg = lang==='ar' ? 'صيغة JSON غير صالحة.' : 'Invalid JSON format.';
            ws.send(JSON.stringify({ type: 'error', code: 'INVALID_FORMAT', message: msg }));
            return;
          }

          // Stricter validation for expected message format
          const lang = String(data.lang || 'ar');
          if (typeof data.action !== 'string' || typeof data.message !== 'string') {
            const msg = lang==='ar' ? 'تنسيق الرسالة غير صالح.' : 'Invalid message format.';
            ws.send(JSON.stringify({ type: 'error', code: 'INVALID_MESSAGE', message: msg }));
            return;
          }
          const preview = String(data.message || '').trim();
          if (!preview) {
            const msg = lang==='ar' ? 'الرسالة فارغة غير مسموح بها.' : 'Empty message not allowed.';
            ws.send(JSON.stringify({ type: 'error', code: 'EMPTY_MESSAGE', message: msg }));
            return;
          }
          if (preview.length > this.maxMessageLength) {
            const msg = lang==='ar' ? 'الرسالة طويلة جدًا.' : 'Message too long.';
            ws.send(JSON.stringify({ type: 'error', code: 'MESSAGE_TOO_LONG', message: msg }));
            return;
          }
          {
            const now = Date.now();
            const rl = this.rateLimits.get(ws.userId) || { start: now, count: 0 };
            if (now - rl.start > this.rateWindowMs) { rl.start = now; rl.count = 0; }
            rl.count += 1;
            this.rateLimits.set(ws.userId, rl);
            if (rl.count > this.rateMaxCount) {
              const msg = lang==='ar' ? 'عدد الرسائل مرتفع. حاول لاحقًا.' : 'Too many messages. Try later.';
              ws.send(JSON.stringify({ type: 'error', code: 'RATE_LIMIT', message: msg }));
              return;
            }
          }

          if (data.action === 'instruct') {
            console.log(`[JoeAgentV2] Received instruction: "${data.message}"`);
            const userId = ws.userId;
            let sessionId = data.sessionId || ws.sessionId;
            const now = new Date();
            const validId = sessionId && mongoose.Types.ObjectId.isValid(sessionId);
            if (!validId) {
              try {
                const title = preview.length > 60 ? preview.slice(0, 60) : (preview || 'New Conversation');
                const created = await ChatSession.create({ userId, title, lastModified: now, createdAt: now, updatedAt: now });
                sessionId = created._id.toString();
                ws.sessionId = sessionId;
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ type: 'session_created', sessionId }));
                }
              } catch { /* noop */ }
            } else {
              try {
                const title = preview.length > 60 ? preview.slice(0, 60) : (preview || 'New Conversation');
                await ChatSession.updateOne(
                  { _id: sessionId },
                  { $set: { lastModified: now, updatedAt: now }, $setOnInsert: { userId, title, createdAt: now } },
                  { upsert: true }
                );
              } catch { /* noop */ }
            }

            // Send immediate progress feedback
            try { ws.send(JSON.stringify({ type: 'progress', progress: 1, step: 'Starting' })); } catch { /* noop */ }
            // 1. Save user message to DB
            try {
              if (mongoose.Types.ObjectId.isValid(sessionId)) {
                await ChatMessage.create({ sessionId, userId, type: 'user', content: data.message });
              }
            } catch (e) {
              console.error('[JoeAgentV2] Failed to save user message:', e);
            }
          

            try {
              const model = data.model || null;
              const result = await joeAdvanced.processMessage(userId, data.message, sessionId, { model, lang: data.lang });
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'response', response: result.response, toolsUsed: result.toolsUsed, sessionId }));
                try { ws.send(JSON.stringify({ type: 'progress', progress: 100, step: 'Done' })); } catch { void 0 }
                try { ws.send(JSON.stringify({ type: 'task_complete', sessionId })); } catch { void 0 }
              }
              try {
                const content = String(result?.response || '').trim();
                if (content && mongoose.Types.ObjectId.isValid(sessionId)) {
                  await ChatMessage.create({ sessionId, userId, type: 'joe', content });
                  await ChatSession.updateOne({ _id: sessionId }, { $set: { lastModified: new Date(), updatedAt: new Date() } });
                }
              } catch { void 0 }
            } catch (err) {
              if (ws.readyState === ws.OPEN) {
                const lang = String(data.lang || 'ar');
                const msg = lang==='ar' ? 'حدث خطأ أثناء معالجة الطلب.' : 'An error occurred while processing the request.';
                ws.send(JSON.stringify({ type: 'error', message: msg, details: String(err?.message || err) }));
              }
              try { console.error('[JoeAgentV2] Processing error:', err); } catch { /* noop */ }
            }

          } else if (data.action === 'cancel') {
            // Handle cancel action if needed
            console.log(`[JoeAgentV2] Received cancel instruction from user ${ws.userId}`);
            // Note: Actual cancellation logic in joeAdvanced.service.mjs is needed here
            ws.send(JSON.stringify({ type: 'status', message: 'Cancellation request received.' }));
          } else {
             const msg = lang==='ar' ? 'إجراء غير معروف.' : 'Unknown action.';
             ws.send(JSON.stringify({ type: 'error', code: 'UNKNOWN_ACTION', message: msg }));
          }

        } catch (error) {
          console.error('[JoeAgentV2] Error processing message:', error);
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: `Server Error: ${error.message}` }));
          }
        }
      });

      ws.on('close', (code, reason) => { 
        console.log(`[JoeAgentV2] Client disconnected. Code: ${code}, Reason: ${reason.toString('utf8')}`); 
      });
      ws.on('error', (error) => { 
        console.error(`[JoeAgentV2] WebSocket error for user ${ws.userId}:`, error.message); 
      });

      ws.send(JSON.stringify({ type: 'status', message: 'Connected to Joe Agent v2 "Unified". Ready for instructions.'}));
    });
  }

  setupSocketIOServer() {
    const setupFor = (nsp) => {
      nsp.use((socket, next) => {
        try {
          const token = socket.handshake?.auth?.token || socket.handshake?.query?.token;
          let decoded;
          if (token) {
            try {
              const secret = this.dependencies.JWT_SECRET || config.JWT_SECRET;
              decoded = jwt.verify(token, secret);
            } catch {
              decoded = { userId: `guest:${uuidv4()}`, role: 'guest' };
            }
          } else {
            decoded = { userId: `guest:${uuidv4()}`, role: 'guest' };
          }
          socket.data = socket.data || {};
          socket.data.userId = decoded.userId;
          socket.data.role = decoded.role;
          return next();
        } catch {
          return next(new Error('INVALID_TOKEN'));
        }
      });

      nsp.on('connection', (socket) => {
        socket.emit('status', { message: 'Connected to Joe Agent v2 "Unified". Ready for instructions.' });

        const getOrCreateBrowser = async () => {
          const uid = socket.data.userId;
          let bc = this.browserByUser.get(uid);
          if (!bc) {
            bc = new BrowserController();
            await bc.initialize();
            this.browserByUser.set(uid, bc);
          }
          return bc;
        };

        socket.on('browser:start', async () => {
          try {
            const bc = await getOrCreateBrowser();
            const screenshot = await bc.getScreenshot();
            const pageInfo = await bc.getPageInfo();
            socket.emit('browser:screenshot', { screenshot, pageInfo });
          } catch (e) {
            socket.emit('error', { code: 'BROWSER_START_FAILED', message: String(e?.message || 'Failed to start browser') });
          }
        });

        socket.on('browser:stop', async () => {
          try {
            const uid = socket.data.userId;
            const bc = this.browserByUser.get(uid);
            if (bc) { await bc.close(); this.browserByUser.delete(uid); }
            socket.emit('status', { message: 'Browser stopped.' });
          } catch (e) { socket.emit('error', { code: 'BROWSER_STOP_FAILED', message: String(e?.message || 'Failed to stop browser') }); }
        });

        socket.on('browser:navigate', async ({ url }) => {
          try {
            const bc = await getOrCreateBrowser();
            await bc.navigate(url);
            const screenshot = await bc.getScreenshot();
            const pageInfo = await bc.getPageInfo();
            socket.emit('browser:screenshot', { screenshot, pageInfo });
          } catch (e) { socket.emit('error', { code: 'NAVIGATE_FAILED', message: String(e?.message || 'Navigation failed') }); }
        });

        socket.on('browser:get_screenshot', async () => {
          try { const bc = await getOrCreateBrowser(); const screenshot = await bc.getScreenshot(); const pageInfo = await bc.getPageInfo(); socket.emit('browser:screenshot', { screenshot, pageInfo }); } catch (e) { socket.emit('error', { code: 'SCREENSHOT_FAILED', message: String(e?.message || 'Screenshot failed') }); }
        });

        socket.on('browser:get_page_text', async () => {
          try { const bc = await getOrCreateBrowser(); const result = await bc.getPageText(); const pageInfo = await bc.getPageInfo(); socket.emit('browser:page_text', { result, pageInfo }); } catch (e) { socket.emit('error', { code: 'PAGE_TEXT_FAILED', message: String(e?.message || 'Get page text failed') }); }
        });

        socket.on('browser:extract_serp', async ({ query }) => {
          try { const bc = await getOrCreateBrowser(); const result = await bc.extractSerp(query); const pageInfo = await bc.getPageInfo(); socket.emit('browser:serp_results', { result, pageInfo }); } catch (e) { socket.emit('error', { code: 'SERP_FAILED', message: String(e?.message || 'SERP failed') }); }
        });

        socket.on('browser:click', async ({ x, y }) => {
          try { const bc = await getOrCreateBrowser(); await bc.click(x, y); const screenshot = await bc.getScreenshot(); socket.emit('browser:screenshot', { screenshot }); } catch (e) { socket.emit('error', { code: 'CLICK_FAILED', message: String(e?.message || 'Click failed') }); }
        });

        socket.on('browser:type', async ({ text }) => {
          try { const bc = await getOrCreateBrowser(); await bc.type(text); socket.emit('status', { message: 'Typed.' }); } catch (e) { socket.emit('error', { code: 'TYPE_FAILED', message: String(e?.message || 'Type failed') }); }
        });

        socket.on('browser:scroll', async ({ deltaY }) => {
          try { const bc = await getOrCreateBrowser(); await bc.scroll(deltaY); const screenshot = await bc.getScreenshot(); socket.emit('browser:screenshot', { screenshot }); } catch (e) { socket.emit('error', { code: 'SCROLL_FAILED', message: String(e?.message || 'Scroll failed') }); }
        });

        socket.on('browser:press_key', async ({ key }) => {
          try { const bc = await getOrCreateBrowser(); await bc.pressKey(key); socket.emit('status', { message: `Pressed ${key}` }); } catch (e) { socket.emit('error', { code: 'PRESS_KEY_FAILED', message: String(e?.message || 'Press key failed') }); }
        });

        socket.on('browser:start_streaming', async () => {
          try {
            const bc = await getOrCreateBrowser();
            const key = `stream:${socket.id}`;
            if (socket.data.browserStreamTimer) { clearInterval(socket.data.browserStreamTimer); socket.data.browserStreamTimer = null; }
            socket.data.browserStreamTimer = setInterval(async () => {
              try { const screenshot = await bc.getScreenshot(); const pageInfo = await bc.getPageInfo(); socket.emit('browser:screenshot', { screenshot, pageInfo }); } catch { /* noop */ }
            }, 1000);
            this.streamBuffers.set(key, true);
          } catch (e) { socket.emit('error', { code: 'STREAM_START_FAILED', message: String(e?.message || 'Start streaming failed') }); }
        });

        socket.on('browser:stop_streaming', () => {
          try { if (socket.data.browserStreamTimer) { clearInterval(socket.data.browserStreamTimer); socket.data.browserStreamTimer = null; } } catch { /* noop */ }
        });

        socket.on('message', async (data) => {
          try {
            if (!data || typeof data.action !== 'string' || typeof data.message !== 'string') {
              const lang = String(data?.lang || 'ar');
              const msg = lang==='ar' ? 'تنسيق الرسالة غير صالح.' : 'Invalid message format.';
              socket.emit('error', { code: 'INVALID_MESSAGE', message: msg });
              return;
            }
            const lang = String(data.lang || 'ar');
            const preview = String(data.message || '').trim();
            if (!preview) { const msg = lang==='ar' ? 'الرسالة فارغة غير مسموح بها.' : 'Empty message not allowed.'; socket.emit('error', { code: 'EMPTY_MESSAGE', message: msg }); return; }
            if (preview.length > this.maxMessageLength) { const msg = lang==='ar' ? 'الرسالة طويلة جدًا.' : 'Message too long.'; socket.emit('error', { code: 'MESSAGE_TOO_LONG', message: msg }); return; }
            {
              const now = Date.now();
              const rl = this.rateLimits.get(socket.data.userId) || { start: now, count: 0 };
              if (now - rl.start > this.rateWindowMs) { rl.start = now; rl.count = 0; }
              rl.count += 1;
              this.rateLimits.set(socket.data.userId, rl);
              if (rl.count > this.rateMaxCount) {
                const msg = lang==='ar' ? 'عدد الرسائل مرتفع. حاول لاحقًا.' : 'Too many messages. Try later.';
                socket.emit('error', { code: 'RATE_LIMIT', message: msg });
                return;
              }
            }
            const userId = socket.data.userId;
            const sessionId = data.sessionId || socket.data.sessionId || `session_${Date.now()}`;
            socket.data.sessionId = sessionId;
            socket.join(sessionId);
            if (data.action === 'instruct') {
              try { socket.emit('progress', { progress: 1, step: 'Starting' }); } catch { /* noop */ }
              try {
                if (mongoose.Types.ObjectId.isValid(sessionId)) {
                  await ChatMessage.create({ sessionId, userId, type: 'user', content: data.message });
                  await ChatSession.updateOne({ _id: sessionId }, { $set: { lastModified: new Date(), updatedAt: new Date() } });
                }
              } catch { void 0 }
              const model = data.model || null;
              const result = await joeAdvanced.processMessage(userId, data.message, sessionId, { model, lang: data.lang });
              socket.emit('response', { response: result.response, toolsUsed: result.toolsUsed, sessionId });
              try { socket.emit('progress', { progress: 100, step: 'Done' }); } catch { void 0 }
              try { socket.emit('task_complete', { sessionId }); } catch { void 0 }
              try {
                const content = String(result?.response || '').trim();
                if (content && mongoose.Types.ObjectId.isValid(sessionId)) {
                  await ChatMessage.create({ sessionId, userId, type: 'joe', content });
                  await ChatSession.updateOne({ _id: sessionId }, { $set: { lastModified: new Date(), updatedAt: new Date() } });
                }
            } catch { void 0 }
          } else if (data.action === 'provide_key') {
            try {
              const provider = String(data.provider || '').trim() || 'openai';
              const apiKey = String(data.apiKey || '').trim();
              const lang = String(data.lang || 'ar');
              if (!apiKey) {
                const msg = lang==='ar' ? 'لا يوجد مفتاح.' : 'Missing key.';
                socket.emit('error', { code: 'MISSING_KEY', message: msg });
                return;
              }
              if (provider === 'openai') {
                try {
                  const client = new OpenAI({ apiKey });
                  const ping = await client.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'ping' }] });
                  const ok = !!ping?.id;
                  if (!ok) throw new Error('OPENAI_VERIFY_FAILED');
                  setKey('openai', apiKey);
                  setActive('openai', 'gpt-4o');
                  try {
                    const db = this.dependencies?.db;
                    const userId = socket.data.userId;
                    if (db && userId) {
                      await db.collection('ai_user_config').updateOne(
                        { userId },
                        { $set: { userId, keys: { openai: apiKey }, activeProvider: 'openai', activeModel: 'gpt-4o', updatedAt: new Date() } },
                        { upsert: true }
                      );
                    }
                  } catch { /* noop */ }
                  const msg = lang==='ar' ? '✅ تم تفعيل OpenAI بنجاح. يمكنك المتابعة الآن.' : '✅ OpenAI activated successfully. You can continue now.';
                  socket.emit('status', { message: msg });
                } catch (e) {
                  const m = String(e?.message || 'OPENAI_VERIFY_FAILED');
                  const msg = lang==='ar' ? `فشل التحقق من مفتاح OpenAI: ${m}` : `Failed to verify OpenAI key: ${m}`;
                  socket.emit('error', { code: 'OPENAI_VERIFY_FAILED', message: msg });
                }
                return;
              }
              if (provider === 'gemini') {
                try {
                  const client = new GoogleGenerativeAI(apiKey);
                  const model = client.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
                  const resp = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }).catch(() => null);
                  const ok = !!resp;
                  if (!ok) throw new Error('GEMINI_VERIFY_FAILED');
                  setKey('gemini', apiKey);
                  setActive('gemini', 'gemini-1.5-pro-latest');
                  try {
                    const db = this.dependencies?.db;
                    const userId = socket.data.userId;
                    if (db && userId) {
                      await db.collection('ai_user_config').updateOne(
                        { userId },
                        { $set: { userId, keys: { gemini: apiKey }, activeProvider: 'gemini', activeModel: 'gemini-1.5-pro-latest', updatedAt: new Date() } },
                        { upsert: true }
                      );
                    }
                  } catch { /* noop */ }
                  const msg = lang==='ar' ? '✅ تم تفعيل Gemini بنجاح. يمكنك المتابعة الآن.' : '✅ Gemini activated successfully. You can continue now.';
                  socket.emit('status', { message: msg });
                } catch (e) {
                  const m = String(e?.message || 'GEMINI_VERIFY_FAILED');
                  const msg = lang==='ar' ? `فشل التحقق من مفتاح Gemini: ${m}` : `Failed to verify Gemini key: ${m}`;
                  socket.emit('error', { code: 'GEMINI_VERIFY_FAILED', message: msg });
                }
                return;
              }
              const msg = lang==='ar' ? 'مزود غير مدعوم.' : 'Unsupported provider.';
              socket.emit('error', { code: 'UNSUPPORTED_PROVIDER', message: msg });
            } catch { /* noop */ }
          } else if (data.action === 'cancel') {
              socket.emit('status', { message: 'Cancellation request received.' });
            } else {
              const msg = lang==='ar' ? 'إجراء غير معروف.' : 'Unknown action.';
              socket.emit('error', { code: 'UNKNOWN_ACTION', message: msg });
            }
          } catch (error) {
            socket.emit('error', { message: `Server Error: ${error.message}` });
          }
        });

        socket.on('disconnect', () => {
          try { if (socket.data.browserStreamTimer) { clearInterval(socket.data.browserStreamTimer); socket.data.browserStreamTimer = null; } } catch { /* noop */ }
        });
      });
    };

    if (this.nsp) setupFor(this.nsp);
    if (this.defaultNsp) setupFor(this.defaultNsp);
  }

  /**
   * Listens to events from the Joe engine and broadcasts them to the correct client.
   */
  setupEventListeners() {
    joeAdvanced.events.on('progress', (progressData) => {
      this.wss.clients.forEach(client => {
        if (client.sessionId === progressData.taskId && client.readyState === client.OPEN) {
          client.send(JSON.stringify(progressData));
        }
      });
      if (this.nsp) {
        try { this.nsp.to(progressData.taskId).emit('progress', progressData); } catch { void 0 }
      }
    });

    joeAdvanced.events.on('tool_used', (toolData) => {
      this.wss.clients.forEach(client => {
        if (client.sessionId === toolData.taskId && client.readyState === client.OPEN) {
          client.send(JSON.stringify(toolData));
        }
      });
      if (this.nsp) {
        try { this.nsp.to(toolData.taskId).emit('tool_used', toolData); } catch { void 0 }
      }
    });

    joeAdvanced.events.on('error', (errorData) => {
        this.wss.clients.forEach(client => {
            // Find the right session to send the error to.
            // This assumes the error context contains the session/task ID
            if (client.sessionId === errorData.context?.sessionId && client.readyState === client.OPEN) {
              client.send(JSON.stringify(errorData));
            }
        });
        if (this.nsp) {
          try { this.nsp.to(errorData.context?.sessionId).emit('error', errorData); } catch { void 0 }
        }
    });

    console.log('[JoeAgentV2] Event listeners for engine progress and errors are active.');

    if (this.dependencies?.memoryManager) {
      this.dependencies.memoryManager.on('interaction:saved', (payload) => {
        this.wss.clients.forEach(client => {
          if (client.userId === payload.userId && client.readyState === client.OPEN) {
            client.send(JSON.stringify({ type: 'session_updated', sessionId: payload.sessionId }));
          }
        });
        if (this.nsp) {
          try { this.nsp.to(payload.sessionId).emit('session_updated', { sessionId: payload.sessionId }); } catch { void 0 }
        }
      });
    }
  }

  async navigateProgrammaticallyForUser(userId, url) {
    const uid = String(userId || '').trim();
    if (!uid) return;
    const target = String(url || '').trim();
    if (!target) return;
    let bc = this.browserByUser.get(uid);
    if (!bc) {
      bc = new BrowserController();
      await bc.initialize();
      this.browserByUser.set(uid, bc);
    }
    await bc.navigate(target);
    const screenshot = await bc.getScreenshot();
    const pageInfo = await bc.getPageInfo();
    if (this.nsp) {
      const sockets = await this.nsp.fetchSockets();
      for (const s of sockets) {
        if (s?.data?.userId === uid) {
          s.emit('browser:screenshot', { screenshot, pageInfo });
        }
      }
    }
  }
}

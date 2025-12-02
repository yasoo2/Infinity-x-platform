import { WebSocketServer } from 'ws';
import joeAdvanced from './ai/joe-advanced.service.mjs';
import ChatMessage from '../database/models/ChatMessage.mjs';
import ChatSession from '../database/models/ChatSession.mjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { getMode } from '../core/runtime-mode.mjs';
import { localLlamaService } from './llm/local-llama.service.mjs';
import config from '../config.mjs';

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
          const defaults = ['localhost', '.onrender.com', 'xelitesolutions.com', 'www.xelitesolutions.com'];
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

      if (!token) {
        console.log('[JoeAgentV2] Connection rejected: No token provided.');
        ws.close(1008, 'Policy Violation: No token provided');
        return;
      }

      // 2. التحقق من التوكين
      let decoded;
      try {
        const secret = this.dependencies.JWT_SECRET || config.JWT_SECRET;
        decoded = jwt.verify(token, secret);
      } catch (err) {
        // Detailed logging for JWT errors
        console.log(`[JoeAgentV2] Connection rejected: Token validation failed. Error: ${err.name} - ${err.message}`);
        ws.close(1008, `Policy Violation: Invalid token (${err.name})`);
        return;
      }

      // 3. ربط الاتصال بمعلومات المستخدم
      console.log(`[JoeAgentV2] Client connected. User ID: ${decoded.userId}`);
      ws.userId = decoded.userId;
      ws.sessionId = null;
      ws.role = decoded.role; // تخزين الدور للتحقق من الصلاحيات

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
            const currentMode = getMode();
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
          if (currentMode === 'offline' && localLlamaService.isReady()) {
            try {
              const result = await joeAdvanced.processMessage(userId, data.message, sessionId, { model: 'offline-local', lang: data.lang });
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'response', response: result.response, toolsUsed: result.toolsUsed, sessionId }));
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
                ws.send(JSON.stringify({ type: 'error', message: err.message }));
              }
            }
            return;
          }

            try {
              const model = data.model || 'gpt-4o';
              const result = await joeAdvanced.processMessage(userId, data.message, sessionId, { model, lang: data.lang });
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ type: 'response', response: result.response, toolsUsed: result.toolsUsed, sessionId }));
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
    this.nsp.use((socket, next) => {
      try {
        const token = socket.handshake?.auth?.token || socket.handshake?.query?.token;
        if (!token) return next(new Error('NO_TOKEN'));
        const secret = this.dependencies.JWT_SECRET || config.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        socket.data = socket.data || {};
        socket.data.userId = decoded.userId;
        socket.data.role = decoded.role;
        return next();
      } catch {
        return next(new Error('INVALID_TOKEN'));
      }
    });

      this.nsp.on('connection', (socket) => {
        socket.emit('status', { message: 'Connected to Joe Agent v2 "Unified". Ready for instructions.' });

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
          const currentMode = getMode();
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
            if (currentMode === 'offline' && localLlamaService.isReady()) {
              try {
                const result = await joeAdvanced.processMessage(userId, data.message, sessionId, { model: 'offline-local', lang: data.lang });
                socket.emit('response', { response: result.response, toolsUsed: result.toolsUsed, sessionId });
                try {
                  const content = String(result?.response || '').trim();
                  if (content && mongoose.Types.ObjectId.isValid(sessionId)) {
                    await ChatMessage.create({ sessionId, userId, type: 'joe', content });
                    await ChatSession.updateOne({ _id: sessionId }, { $set: { lastModified: new Date(), updatedAt: new Date() } });
                  }
                } catch { void 0 }
              } catch (err) {
                socket.emit('error', { message: err.message });
              }
              return;
            }
            const model = data.model || 'gpt-4o';
            const result = await joeAdvanced.processMessage(userId, data.message, sessionId, { model, lang: data.lang });
            socket.emit('response', { response: result.response, toolsUsed: result.toolsUsed, sessionId });
            try {
              const content = String(result?.response || '').trim();
              if (content && mongoose.Types.ObjectId.isValid(sessionId)) {
                await ChatMessage.create({ sessionId, userId, type: 'joe', content });
                await ChatSession.updateOne({ _id: sessionId }, { $set: { lastModified: new Date(), updatedAt: new Date() } });
              }
            } catch { void 0 }
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

      socket.on('disconnect', () => { void 0 });
    });
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
}

import { WebSocketServer } from 'ws';
import joeAdvanced from './ai/joe-advanced.service.mjs';
import jwt from 'jsonwebtoken';
import { getMode } from '../core/runtime-mode.mjs';
import { localLlamaService } from './llm/local-llama.service.mjs';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Joe Agent WebSocket Server - v2.0 "Unified"
 * This server now directly communicates with the unified Gemini-Phoenix engine.
 * It's simpler, more powerful, and acts as the primary user interface gateway.
 */
export class JoeAgentWebSocketServer {
  constructor(server, dependencies) {
    this.dependencies = dependencies;
    this.wss = new WebSocketServer({ server, path: '/ws/joe-agent' });
    joeAdvanced.init(dependencies);
    console.log('🤖 Joe Agent WebSocket Server v2.0 "Unified" Initialized.');
    this.setupWebSocketServer();
    this.setupEventListeners();
    // Heartbeat to keep connections alive and detect broken sockets
    this.heartbeat = setInterval(() => {
      this.wss.clients.forEach((client) => {
        if (client.isAlive === false) {
          try { client.terminate(); } catch { /* noop */ }
          return;
        }
        client.isAlive = false;
        try { client.ping(); } catch { /* noop */ }
      });
    }, 30000);
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      // 1. استخراج التوكين من URL
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
        const secret = this.dependencies.JWT_SECRET || JWT_SECRET;
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
      ws.sessionId = `session_${Date.now()}`; // يمكن استخدام أي معرف جلسة آخر
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
          } catch (parseError) {
            console.error('[JoeAgentV2] JSON Parse Error:', parseError);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON format.' }));
            return;
          }

          // Stricter validation for expected message format
          if (typeof data.action !== 'string' || typeof data.message !== 'string') {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format. Expected { action: string, message: string }.' }));
            return;
          }

          if (data.action === 'instruct') {
            console.log(`[JoeAgentV2] Received instruction: "${data.message}"`);
            const currentMode = getMode();
            const userId = ws.userId;
            const sessionId = data.sessionId || ws.sessionId;
            if (currentMode === 'offline' && localLlamaService.isReady()) {
              try {
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ type: 'status', message: 'Offline local model active' }));
                }
                await localLlamaService.stream(
                  [{ role: 'user', content: data.message }],
                  (piece) => {
                    if (ws.readyState === ws.OPEN) {
                      ws.send(JSON.stringify({ type: 'stream', content: piece }));
                    }
                  },
                  { temperature: 0.7, maxTokens: 1024 }
                );
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ type: 'task_complete', sessionId }));
                }
              } catch (err) {
                if (ws.readyState === ws.OPEN) {
                  ws.send(JSON.stringify({ type: 'error', message: err.message }));
                }
              }
              return;
            }

            const model = data.model || 'gpt-4o';
            const result = await joeAdvanced.processMessage(userId, data.message, sessionId, { model });
            if (ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({ type: 'response', response: result.response, toolsUsed: result.toolsUsed, sessionId }));
            }

          } else if (data.action === 'cancel') {
            // Handle cancel action if needed
            console.log(`[JoeAgentV2] Received cancel instruction from user ${ws.userId}`);
            // Note: Actual cancellation logic in joeAdvanced.service.mjs is needed here
            ws.send(JSON.stringify({ type: 'status', message: 'Cancellation request received.' }));
          } else {
             ws.send(JSON.stringify({ type: 'error', message: `Unknown action: ${data.action}` }));
          }

        } catch (error) {
          console.error('[JoeAgentV2] Error processing message:', error);
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: `Server Error: ${error.message}` }));
          }
        }
      });

      ws.on('close', () => { console.log('[JoeAgentV2] Client disconnected.'); });
      ws.on('error', (error) => { console.error('[JoeAgentV2] WebSocket error:', error); });

      ws.send(JSON.stringify({ type: 'status', message: 'Connected to Joe Agent v2 "Unified". Ready for instructions.'}));
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
    });

    joeAdvanced.events.on('error', (errorData) => {
        this.wss.clients.forEach(client => {
            // Find the right session to send the error to.
            // This assumes the error context contains the session/task ID
            if (client.sessionId === errorData.context?.sessionId && client.readyState === client.OPEN) {
              client.send(JSON.stringify(errorData));
            }
        });
    });

    console.log('[JoeAgentV2] Event listeners for engine progress and errors are active.');

    if (this.dependencies?.memoryManager) {
      this.dependencies.memoryManager.on('interaction:saved', (payload) => {
        this.wss.clients.forEach(client => {
          if (client.userId === payload.userId && client.readyState === client.OPEN) {
            client.send(JSON.stringify({ type: 'session_updated', sessionId: payload.sessionId }));
          }
        });
      });
    }
  }
}

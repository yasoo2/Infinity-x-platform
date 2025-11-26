import { WebSocketServer } from 'ws';
import joeAdvanced from './ai/joe-advanced.service.mjs'; // The ONE TRUE BRAIN
import jwt from 'jsonwebtoken';
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
    console.log('🤖 Joe Agent WebSocket Server v2.0 "Unified" Initialized.');
    this.setupWebSocketServer();
    this.setupEventListeners();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
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
        console.log('[JoeAgentV2] Connection rejected: Invalid token. Error:', err.message);
        ws.close(1008, 'Policy Violation: Invalid token');
        return;
      }

      // 3. ربط الاتصال بمعلومات المستخدم
      console.log(`[JoeAgentV2] Client connected. User ID: ${decoded.userId}`);
      ws.userId = decoded.userId;
      ws.sessionId = `session_${Date.now()}`; // يمكن استخدام أي معرف جلسة آخر
      ws.role = decoded.role; // تخزين الدور للتحقق من الصلاحيات

      // التحقق من الصلاحيات (اختياري، ولكن يفضل)
      if (ws.role !== 'super_admin' && ws.role !== 'admin') {
        console.log(`[JoeAgentV2] Connection rejected: Insufficient role (${ws.role}).`);
        ws.close(1008, 'Policy Violation: Insufficient role');
        return;
      }

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);

          if (data.action === 'instruct' && data.message) {
            console.log(`[JoeAgentV2] Received instruction: "${data.message}"`);
            
            // Directly call the unified processing engine
            // The model can be specified in the message data, defaulting to gpt-4o
            const model = data.model || 'gpt-4o';
            
            // استخدام userId المستخرج من التوكين
            const userId = ws.userId; 

            await joeAdvanced.processMessage(userId, data.message, ws.sessionId, { model });

          } else {
             ws.send(JSON.stringify({ type: 'error', message: 'Unknown action or missing message.' }));
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
  }
}

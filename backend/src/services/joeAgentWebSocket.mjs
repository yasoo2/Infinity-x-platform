
import { WebSocketServer } from 'ws';
import joeAdvanced from './ai/joe-advanced.service.mjs'; // The ONE TRUE BRAIN

/**
 * Joe Agent WebSocket Server - v2.0 "Unified"
 * This server now directly communicates with the unified Gemini-Phoenix engine.
 * It's simpler, more powerful, and acts as the primary user interface gateway.
 */
export class JoeAgentWebSocketServer {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/ws/joe-agent' });
    console.log('🤖 Joe Agent WebSocket Server v2.0 "Unified" Initialized.');
    this.setupWebSocketServer();
    this.setupEventListeners();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('[JoeAgentV2] New client connected.');
      // Associate WebSocket connection with a user/session if available
      // For now, we'll use a simple session ID from the URL or generate one.
      const sessionId = req.url.split('?sessionId=')[1] || `session_${Date.now()}`;
      ws.sessionId = sessionId;

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);

          if (data.action === 'instruct' && data.message) {
            console.log(`[JoeAgentV2] Received instruction: "${data.message}"`);
            
            // Directly call the unified processing engine
            // The model can be specified in the message data, defaulting to gpt-4o
            const model = data.model || 'gpt-4o';
            
            // The user ID should be handled by your authentication system.
            // For now, we'll use a placeholder.
            const userId = 'user_placeholder'; 

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

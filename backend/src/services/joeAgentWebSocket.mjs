
import { WebSocketServer } from 'ws';
import { AgentTeam } from '../systems/AgentTeam.mjs'; // The REAL brain of Joe

/**
 * Joe's Agent WebSocket Server
 * This is the TRUE entry point for user instructions.
 * It connects the user directly to the AgentTeam, Joe's core intelligence.
 */
export class JoeAgentWebSocketServer {
  constructor(server) {
    // Note the new, correct path: /ws/joe-agent
    this.wss = new WebSocketServer({ server, path: '/ws/joe-agent' });
    this.agentTeam = new AgentTeam(); // Instantiate the Agent Team

    console.log('🤖 Joe Agent WebSocket Server Initialized on /ws/joe-agent');
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('[JoeAgent] New client connected.');

      // Create a function to stream updates back to the client
      const streamUpdate = (update) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(update));
        }
      };

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);

          // Only handle 'instruct' actions for now
          if (data.action === 'instruct' && data.message) {
            console.log(`[JoeAgent] Received instruction: "${data.message}"`);
            
            // CRITICAL STEP: Pass the instruction AND the streaming function to the real brain
            await this.agentTeam.handleInstruction(data.message, streamUpdate);

          } else if (data.action === 'stop') {
            console.log('[JoeAgent] Stop instruction received.');
            // TODO: Implement agent stopping logic in AgentTeam
            streamUpdate({ type: 'status', message: 'Stopping process as requested.', final: true });
          } else {
             streamUpdate({ type: 'error', message: 'Unknown action or missing message.' });
          }

        } catch (error) {
          console.error('[JoeAgent] Error processing message:', error);
          streamUpdate({ type: 'error', message: `Server Error: ${error.message}` });
        }
      });

      ws.on('close', () => {
        console.log('[JoeAgent] Client disconnected.');
      });

      ws.on('error', (error) => {
        console.error('[JoeAgent] WebSocket error:', error);
      });

      ws.send(JSON.stringify({
        type: 'status',
        message: 'Connected to Joe's Core Intelligence. Ready for instructions.',
      }));
    });
  }

  close() {
    this.wss.close();
  }
}

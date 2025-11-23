
import { AgentTeam } from '../systems/AgentTeam.mjs'; // The REAL brain of Joe
import { AdvancedToolsManager } from '../tools_refactored/AdvancedToolsManager.mjs';

/**
 * Joe's Agent WebSocket Server - CORRECTED ARCHITECTURE
 * Connects user instructions to the Planner (AgentTeam) and the Executor (AdvancedToolsManager)
 */
export class JoeAgentWebSocketServer {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/ws/joe-agent' });
    this.planner = new AgentTeam(); 
    this.executor = new AdvancedToolsManager();

    console.log('🤖 Joe Agent WebSocket Server Initialized with Planner and Executor.');
    this.setupWebSocketServer();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('[JoeAgent] New client connected.');

      const streamUpdate = (update) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(update));
        }
      };

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);

          if (data.action === 'instruct' && data.message) {
            console.log(`[JoeAgent] Received instruction: "${data.message}"`);
            
            // 1. Load the tools in the executor to make them available to the planner.
            await this.executor.loadTools();

            // 2. Get the list of available tools for the planner.
            const availableTools = this.executor.getAvailableTools();

            // 3. Pass the instruction, tools, and stream to the PLANNER.
            const plan = await this.planner.createPlan(data.message, availableTools, streamUpdate);

            // 4. If a plan is created, pass it to the EXECUTOR.
            if (plan && plan.steps) {
              await this.executor.executePlan(plan.steps, streamUpdate); // Pass stream for real-time execution updates
            } else {
              streamUpdate({ type: 'error', message: 'The planner failed to create a valid plan.' });
            }

          } else {
             streamUpdate({ type: 'error', message: 'Unknown action or missing message.' });
          }

        } catch (error) {
          console.error('[JoeAgent] Error processing message:', error);
          streamUpdate({ type: 'error', message: `Server Error: ${error.message}` });
        }
      });

      ws.on('close', () => { console.log('[JoeAgent] Client disconnected.'); });
      ws.on('error', (error) => { console.error('[JoeAgent] WebSocket error:', error); });

      ws.send(JSON.stringify({ type: 'status', message: 'Connected to Joe. Planner & Executor are ready.'}));
    });
  }
}

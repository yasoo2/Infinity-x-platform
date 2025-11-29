import { WebSocketServer } from 'ws';
import BrowserController from './browserController.mjs';

class BrowserWebSocketServer {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/ws/browser' });
    this.browserController = new BrowserController();
    this.clients = new Set();
    this.screenshotInterval = null;

    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('Browser WebSocket client connected');
      this.clients.add(ws);

      // Initialize browser on first connection
      this.browserController.initialize().catch(err => {
        console.error('Failed to initialize browser:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to initialize browser' }));
      });

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
      });

      ws.on('close', () => {
        console.log('Browser WebSocket client disconnected');
        this.clients.delete(ws);
        
        // Stop screenshot streaming if no clients
        if (this.clients.size === 0 && this.screenshotInterval) {
          clearInterval(this.screenshotInterval);
          this.screenshotInterval = null;
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  async handleMessage(ws, data) {
    const { type, payload } = data;

    switch (type) {
      case 'navigate':
        {
          const navResult = await this.browserController.navigate(payload.url);
          ws.send(JSON.stringify({ type: 'navigate_result', payload: navResult }));
          setTimeout(async () => {
            const screenshot = await this.browserController.getScreenshot();
            const pageInfo = await this.browserController.getPageInfo();
            ws.send(JSON.stringify({ type: 'screenshot', payload: { screenshot, pageInfo } }));
          }, 1000);
          break;
        }

      case 'click':
        {
          const clickResult = await this.browserController.click(payload.x, payload.y);
          ws.send(JSON.stringify({ type: 'click_result', payload: clickResult }));
          setTimeout(async () => {
            const screenshot = await this.browserController.getScreenshot();
            ws.send(JSON.stringify({ type: 'screenshot', payload: { screenshot } }));
          }, 500);
          break;
        }

      case 'type':
        {
          const typeResult = await this.browserController.type(payload.text);
          ws.send(JSON.stringify({ type: 'type_result', payload: typeResult }));
          break;
        }

      case 'scroll':
        {
          const scrollResult = await this.browserController.scroll(payload.deltaY);
          ws.send(JSON.stringify({ type: 'scroll_result', payload: scrollResult }));
          setTimeout(async () => {
            const screenshot = await this.browserController.getScreenshot();
            ws.send(JSON.stringify({ type: 'screenshot', payload: { screenshot } }));
          }, 300);
          break;
        }

      case 'press_key':
        {
          const keyResult = await this.browserController.pressKey(payload.key);
          ws.send(JSON.stringify({ type: 'press_key_result', payload: keyResult }));
          break;
        }

      case 'get_screenshot':
        {
          const screenshot = await this.browserController.getScreenshot();
          const pageInfo = await this.browserController.getPageInfo();
          ws.send(JSON.stringify({ type: 'screenshot', payload: { screenshot, pageInfo } }));
          break;
        }

      case 'start_streaming':
        {
          if (!this.screenshotInterval) {
            this.screenshotInterval = setInterval(async () => {
              try {
                const screenshot = await this.browserController.getScreenshot();
                const pageInfo = await this.browserController.getPageInfo();
                this.broadcast({ type: 'screenshot', payload: { screenshot, pageInfo } });
              } catch (error) {
                console.error('Screenshot streaming error:', error);
              }
            }, 500);
          }
          break;
        }

      case 'stop_streaming':
        {
          if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
            this.screenshotInterval = null;
          }
          break;
        }

      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }

  async close() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
    }
    await this.browserController.close();
    this.wss.close();
  }
}

export default BrowserWebSocketServer;

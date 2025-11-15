// dashboard-x/src/utils/websocket.js
import config from '../config.js';

let ws = null;
let reconnectInterval = null;

export const connectWebSocket = (onMessage, onOpen, onClose) => {
  const token = localStorage.getItem('sessionToken');
  const wsUrl = `${config.wsBaseUrl}/ws/browser`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('✅ WebSocket connected');
    if (onOpen) onOpen();
  };

  ws.onmessage = (event) => {
    if (onMessage) onMessage(JSON.parse(event.data));
  };

  ws.onclose = () => {
    console.warn('❌ WebSocket disconnected');
    if (onClose) onClose();

    // إعادة الاتصال تلقائيًا بعد 5 ثواني
    clearTimeout(reconnectInterval);
    reconnectInterval = setTimeout(() => {
      console.log('🔄 Reconnecting WebSocket...');
      connectWebSocket(onMessage, onOpen, onClose);
    }, 5000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
};

export const disconnectWebSocket = () => {
  clearTimeout(reconnectInterval);
  if (ws) {
    ws.close();
    ws = null;
  }
};

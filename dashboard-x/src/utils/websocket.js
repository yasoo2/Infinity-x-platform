// dashboard-x/src/utils/websocket.js
import config from '../config.js';

let ws = null;
let reconnectInterval = null;

export const connectWebSocket = (onMessage, onOpen, onClose) => {
  const token = localStorage.getItem('sessionToken') || '';
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.MODE !== 'production';
  const envWs = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) || null;
  const baseWsUrl = isDev
    ? 'ws://localhost:4000'
    : (envWs ? envWs.replace(/\/(ws.*)?$/, '') : (typeof window !== 'undefined' ? window.location.origin : 'ws://localhost:4000').replace(/^https/, 'wss').replace(/^http/, 'ws'));
  const wsUrl = `${baseWsUrl}/ws/joe-agent${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.warn('WebSocket connected');
    if (onOpen) onOpen();
  };

  ws.onmessage = (event) => {
    if (onMessage) onMessage(JSON.parse(event.data));
  };

  ws.onclose = () => {
    console.warn('WebSocket disconnected');
    if (onClose) onClose();

    // إعادة الاتصال تلقائيًا بعد 5 ثواني
    clearTimeout(reconnectInterval);
    reconnectInterval = setTimeout(() => {
      console.warn('Reconnecting WebSocket...');
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

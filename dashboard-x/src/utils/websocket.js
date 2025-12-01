// dashboard-x/src/utils/websocket.js

let ws = null;
let ioSocket = null;
let reconnectInterval = null;
let failedAttempts = 0;

export const connectWebSocket = (onMessage, onOpen, onClose) => {
  const token = localStorage.getItem('sessionToken') || '';
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.MODE !== 'production';
  const envWs = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) || null;
  const baseWsUrl = isDev
    ? 'ws://localhost:4000'
    : (envWs ? envWs.replace(/\/(ws.*)?$/, '') : (typeof window !== 'undefined' ? window.location.origin : 'ws://localhost:4000').replace(/^https/, 'wss').replace(/^http/, 'ws'));
  const wsUrl = `${baseWsUrl}/ws/joe-agent${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  const tryNative = () => {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      failedAttempts = 0;
      if (onOpen) onOpen();
    };
    ws.onmessage = (event) => {
      if (onMessage) onMessage(JSON.parse(event.data));
    };
    ws.onclose = (evt) => {
      try { console.warn(`[WS] Connection closed (code=${evt?.code} reason=${evt?.reason || ''}). Reconnecting...`); } catch { void 0; }
      if (onClose) onClose();
      failedAttempts++;
      clearTimeout(reconnectInterval);
      const delay = Math.min(15000, 2000 * failedAttempts);
      reconnectInterval = setTimeout(() => {
        if (failedAttempts >= 1) {
          trySocketIO().catch(() => { tryNative(); });
        } else {
          tryNative();
        }
      }, delay);
    };
    ws.onerror = () => { failedAttempts++; };
  };

  const trySocketIO = async () => {
    const httpBase = baseWsUrl.replace(/^ws/, 'http').replace(/^wss/, 'https');
    const { io } = await import('socket.io-client');
    ioSocket = io(`${httpBase}/joe-agent`, { auth: { token }, transports: ['websocket','polling'] });
    ioSocket.on('connect', () => { failedAttempts = 0; if (onOpen) onOpen(); });
    ioSocket.on('status', (d) => { if (onMessage) onMessage({ type: 'status', message: d?.message }); });
    ioSocket.on('response', (d) => { if (onMessage) onMessage({ type: 'response', response: d?.response, toolsUsed: d?.toolsUsed, sessionId: d?.sessionId }); });
    ioSocket.on('disconnect', () => { if (onClose) onClose(); clearTimeout(reconnectInterval); reconnectInterval = setTimeout(() => { trySocketIO().catch(()=>{}); }, 5000); });
    ioSocket.on('error', () => { failedAttempts++; });
  };

  tryNative();

  return ws;
};

export const disconnectWebSocket = () => {
  clearTimeout(reconnectInterval);
  if (ws) {
    ws.close();
    ws = null;
  }
  if (ioSocket) {
    try { ioSocket.close(); } catch { /* ignore */ }
    ioSocket = null;
  }
};

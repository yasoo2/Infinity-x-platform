import apiClient from '../api/client';
// dashboard-x/src/utils/websocket.js

let ws = null;
let ioSocket = null;
let reconnectInterval = null;
let failedAttempts = 0;
let token = '';
let connectTimeout = null;
let isConnected = false;
let wsFailures = 0;
let ioFailures = 0;
let raceStart = 0;

const decodeExp = (t) => {
  try {
    const p = t.split('.')[1];
    if (!p) return null;
    const s = atob(p.replace(/-/g, '+').replace(/_/g, '/'));
    const o = JSON.parse(s);
    return o?.exp || null;
  } catch {
    return null;
  }
};

const ensureToken = async () => {
  try {
    let cur = localStorage.getItem('sessionToken') || '';
    const exp = cur ? decodeExp(cur) : null;
    if (!cur || (exp && Date.now() >= exp * 1000)) {
      const { data } = await apiClient.post('/api/v1/auth/guest-token');
      if (data?.ok && data?.token) {
        cur = data.token;
        localStorage.setItem('sessionToken', cur);
      }
    }
    token = cur;
  } catch {
    token = localStorage.getItem('sessionToken') || '';
  }
  return token;
};

export const connectWebSocket = (onMessage, onOpen, onClose) => {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.MODE !== 'production';
  const envWs = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_WS_BASE_URL || import.meta.env?.VITE_WS_URL)) || '';
  const envApi = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL || import.meta.env?.VITE_EXPLICIT_API_BASE)) || '';
  const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  let httpBase = isLocalHost
    ? 'http://localhost:4000'
    : (typeof apiClient?.defaults?.baseURL === 'string'
        ? apiClient.defaults.baseURL
        : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'));
  try {
    if (!isLocalHost && String(envApi).trim().length > 0) {
      httpBase = envApi;
    }
  } catch { /* noop */ }
  try {
    if (!isLocalHost && !envApi && typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h === 'www.xelitesolutions.com' || h === 'xelitesolutions.com') {
        httpBase = 'https://api.xelitesolutions.com';
      }
    }
  } catch { /* noop */ }
  let baseWsUrl = '';
  const computeBaseWsUrl = () => {
    try {
      if (isLocalHost) {
        return 'ws://localhost:4000';
      }
      const candidate = String(envWs).trim().length > 0 ? String(envWs).trim() : (typeof apiClient?.defaults?.baseURL === 'string' ? apiClient.defaults.baseURL : String(httpBase));
      const u = new URL(candidate);
      const proto = u.protocol === 'https:' ? 'wss' : 'ws';
      return `${proto}://${u.host}`;
    } catch {
      const origin = (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
      const u2 = new URL(String(origin));
      const proto2 = u2.protocol === 'https:' ? 'wss' : 'ws';
      return `${proto2}://${u2.host}`;
    }
  };
  baseWsUrl = computeBaseWsUrl();

  const scheduleReconnect = () => {
    failedAttempts++;
    clearTimeout(reconnectInterval);
    const base = Math.min(8000, 500 * failedAttempts);
    const jitter = Math.floor(Math.random() * 300);
    const delay = base + jitter;
    reconnectInterval = setTimeout(() => { startRace(); }, delay);
  };

  const tryNative = async () => {
    await ensureToken();
    const wsUrl = `${baseWsUrl}/ws/joe-agent${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      failedAttempts = 0;
      if (!isConnected) {
        isConnected = true;
        clearTimeout(connectTimeout);
        if (ioSocket) { try { ioSocket.close(); } catch { void 0; } ioSocket = null; }
        try {
          const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
          const ms = Math.max(0, Math.round(end - raceStart));
          localStorage.setItem('wsLastConnectMs', String(ms));
          localStorage.setItem('wsLastTransport', 'websocket');
          window.dispatchEvent(new CustomEvent('ws:connected', { detail: { elapsedMs: ms, transport: 'websocket' } }));
        } catch { void 0; }
        if (onOpen) onOpen();
      }
    };
    ws.onmessage = (event) => {
      if (onMessage) onMessage(JSON.parse(event.data));
    };
    ws.onclose = (evt) => {
      try { console.warn(`[WS] Connection closed (code=${evt?.code} reason=${evt?.reason || ''}). Reconnecting...`); } catch { void 0; }
      if (onClose) onClose();
      isConnected = false;
      wsFailures++;
      try { window.dispatchEvent(new CustomEvent('ws:disconnected')); } catch { void 0; }
      scheduleReconnect();
    };
    ws.onerror = () => { failedAttempts++; };
  };

  const trySocketIO = async () => {
    const httpBase = baseWsUrl.replace(/^ws/, 'http').replace(/^wss/, 'https');
    const { io } = await import('socket.io-client');
    await ensureToken();
    ioSocket = io(`${httpBase}/joe-agent`, { path: '/socket.io/', auth: { token }, transports: ['polling','websocket'], upgrade: true, reconnection: true, reconnectionDelay: 500, reconnectionDelayMax: 4000, timeout: 3000, forceNew: true });
    const fallbackTimer = setTimeout(() => {
      try {
        if (!ioSocket.connected) {
          try { ioSocket.close(); } catch { /* noop */ }
          ioSocket = io(`${httpBase}/joe-agent`, { path: '/ws/socket.io/', auth: { token }, transports: ['websocket','polling'], upgrade: true, reconnection: true, reconnectionDelay: 500, reconnectionDelayMax: 4000, timeout: 3000, forceNew: true });
        }
      } catch { /* noop */ }
    }, 1500);
    ioSocket.on('connect', () => {
      failedAttempts = 0;
      if (!isConnected) {
        isConnected = true;
        clearTimeout(connectTimeout);
        try { clearTimeout(fallbackTimer); } catch { /* noop */ }
        if (ws) { try { ws.close(); } catch { void 0; } ws = null; }
        try {
          const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
          const ms = Math.max(0, Math.round(end - raceStart));
          localStorage.setItem('wsLastConnectMs', String(ms));
          localStorage.setItem('wsLastTransport', 'socket.io');
          window.dispatchEvent(new CustomEvent('ws:connected', { detail: { elapsedMs: ms, transport: 'socket.io' } }));
        } catch { void 0; }
        if (onOpen) onOpen();
      }
    });
    ioSocket.on('status', (d) => { if (onMessage) onMessage({ type: 'status', message: d?.message }); });
    ioSocket.on('response', (d) => { if (onMessage) onMessage({ type: 'response', response: d?.response, toolsUsed: d?.toolsUsed, sessionId: d?.sessionId }); });
    ioSocket.on('disconnect', () => { if (onClose) onClose(); isConnected = false; ioFailures++; try { window.dispatchEvent(new CustomEvent('ws:disconnected')); } catch { void 0; } scheduleReconnect(); });
    ioSocket.on('error', () => { failedAttempts++; ioFailures++; });
  };

  const startRace = async () => {
    try {
      isConnected = false;
      clearTimeout(connectTimeout);
      await ensureToken();
      try { raceStart = typeof performance !== 'undefined' ? performance.now() : Date.now(); } catch { raceStart = Date.now(); }
      if (!isDev) {
        // Prefer native WebSocket first in production; only try Socket.IO if not connected within 1.5s
        tryNative();
        setTimeout(() => { if (!isConnected) { trySocketIO().catch(() => { /* ignore */ }); } }, 1500);
      } else {
        if (wsFailures >= 2 && ioFailures === 0) {
          trySocketIO().catch(() => { tryNative(); });
        } else {
          tryNative();
          trySocketIO().catch(() => { void 0; });
        }
      }
      connectTimeout = setTimeout(() => {
        if (!isConnected) {
          try { if (ws) ws.close(); } catch { void 0; }
          try { if (ioSocket) ioSocket.close(); } catch { void 0; }
          scheduleReconnect();
        }
      }, 3500);
    } catch { void 0; }
  };

  // Listen for API base URL resets and reconnect with new base
  const onApiReset = () => {
    try { clearTimeout(reconnectInterval); } catch { /* noop */ }
    try { if (ws) ws.close(); } catch { /* noop */ }
    try { if (ioSocket) ioSocket.close(); } catch { /* noop */ }
    failedAttempts = 0;
    wsFailures = 0;
    ioFailures = 0;
    baseWsUrl = computeBaseWsUrl();
    startRace();
  };
  try { window.addEventListener('api:baseurl:reset', onApiReset); } catch { /* noop */ }

  startRace();

  // Cleanup global listener when caller unmounts
  try {
    const remove = () => { try { window.removeEventListener('api:baseurl:reset', onApiReset); } catch { /* noop */ } };
    // attach to close to ensure removal
    const prevOnClose = onClose;
    onClose = () => { remove(); if (prevOnClose) prevOnClose(); };
  } catch { /* noop */ }
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

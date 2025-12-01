import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const useBrowserWebSocket = () => {
  const [screenshot, setScreenshot] = useState(null);
  const [pageInfo, setPageInfo] = useState({ title: '', url: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      let sessionToken = null;
      try { sessionToken = localStorage.getItem('sessionToken'); } catch { sessionToken = null; }

      const isDev = typeof import.meta !== 'undefined' && import.meta.env?.MODE !== 'production';
      const apiBase = isDev ? 'http://localhost:4000' : (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'));
      const wsBase = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
      const ensureToken = async () => {
        if (sessionToken) return sessionToken;
        try {
          const { data } = await axios.post(`${apiBase}/api/v1/auth/guest-token`);
          if (data?.ok && data?.token) {
            try { localStorage.setItem('sessionToken', data.token); } catch { /* noop */ }
            sessionToken = data.token;
            return sessionToken;
          }
        } catch { /* noop */ }
        return null;
      };

      (async () => {
        const token = await ensureToken();
        if (!token) return;
        const wsUrl = `${wsBase}/ws/browser?token=${token}`;
        try { console.info('[Browser WS] Connecting:', wsUrl); } catch { /* noop */ }

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          setIsConnected(true);
        };

        wsRef.current.onclose = (ev) => {
          setIsConnected(false);
          try { console.warn('[Browser WS] Closed:', { code: ev?.code, reason: ev?.reason }); } catch { /* noop */ }
          setTimeout(connect, 3000);
        };

        wsRef.current.onerror = (err) => {
          try { console.error('[Browser WS] Error:', err); } catch { /* noop */ }
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            switch (data.type) {
              case 'screenshot':
                setScreenshot(data.payload.screenshot);
                setPageInfo(data.payload.pageInfo);
                setIsLoading(false);
                break;
              case 'navigate_result':
              case 'click_result':
              case 'type_result':
              case 'scroll_result':
              case 'press_key_result':
                break;
              case 'error':
                try { console.error('[Browser WS] Server Error:', data.message); } catch { /* noop */ }
                setIsLoading(false);
                break;
              default:
                break;
            }
          } catch { /* noop */ }
        };
      })();
    };

    connect();
    return () => wsRef.current?.close();
  }, []);

  const navigate = useCallback((url) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setIsLoading(true);
      wsRef.current.send(JSON.stringify({
        type: 'navigate',
        payload: { url }
      }));
    }
  }, []);

  const click = useCallback((x, y) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'click',
        payload: { x, y }
      }));
    }
  }, []);

  const type = useCallback((text) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'type',
        payload: { text }
      }));
    }
  }, []);

  const scroll = useCallback((deltaY) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'scroll',
        payload: { deltaY }
      }));
    }
  }, []);

  const pressKey = useCallback((key) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'press_key',
        payload: { key }
      }));
    }
  }, []);

  const getScreenshot = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'get_screenshot' }));
    }
  }, []);

  const startStreaming = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_streaming' }));
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop_streaming' }));
    }
  }, []);

  return {
    screenshot,
    pageInfo,
    isConnected,
    isLoading,
    navigate,
    click,
    type,
    scroll,
    pressKey,
    getScreenshot,
    startStreaming,
    stopStreaming
  };
};

export default useBrowserWebSocket;

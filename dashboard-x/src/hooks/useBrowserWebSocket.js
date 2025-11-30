import { useState, useEffect, useRef, useCallback } from 'react';

const useBrowserWebSocket = () => {
  const [screenshot, setScreenshot] = useState(null);
  const [pageInfo, setPageInfo] = useState({ title: '', url: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) return;

      const apiBase = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
      const wsBase = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
      const wsUrl = `${wsBase}/ws/browser?token=${sessionToken}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 3000);
      };

      wsRef.current.onerror = (err) => {
        console.error('[Browser WS] Error:', err);
      };

      wsRef.current.onmessage = (event) => {
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
            // لا حاجة لعمل شيء هنا، سيتم تحديث الشاشة عبر 'screenshot'
            break;
          case 'error':
            console.error('[Browser WS] Server Error:', data.message);
            setIsLoading(false);
            break;
          default:
            break;
        }
      };
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

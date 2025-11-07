import { useState, useEffect, useRef, useCallback } from 'react';

const useBrowserWebSocket = () => {
  const [screenshot, setScreenshot] = useState(null);
  const [pageInfo, setPageInfo] = useState({ title: '', url: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // Connect to WebSocket
    const wsUrl = import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws/browser';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Browser WebSocket connected');
      setIsConnected(true);
      // Request initial screenshot
      ws.send(JSON.stringify({ type: 'get_screenshot' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'screenshot':
            setScreenshot(data.payload.screenshot);
            if (data.payload.pageInfo) {
              setPageInfo(data.payload.pageInfo);
            }
            setIsLoading(false);
            break;
          
          case 'navigate_result':
          case 'click_result':
          case 'scroll_result':
          case 'type_result':
          case 'press_key_result':
            if (!data.payload.success) {
              console.error('Action failed:', data.payload.error);
            }
            break;
          
          case 'error':
            console.error('WebSocket error:', data.message);
            setIsLoading(false);
            break;
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('Browser WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
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

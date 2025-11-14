import { useState, useEffect, useRef, useCallback } from 'react';

const useBrowserWebSocket = () => {
  const [screenshot, setScreenshot] = useState(null);
  const [pageInfo, setPageInfo] = useState({ title: '', url: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef(null);

  // Temporarily disable WebSocket connection until the backend supports it
  useEffect(() => {
    console.log('Browser WebSocket connection temporarily disabled.');
    setIsConnected(false);
    return () => {};
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

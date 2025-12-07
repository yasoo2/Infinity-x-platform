import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '../api/client';

const useBrowserWebSocket = () => {
  const [screenshot, setScreenshot] = useState(null);
  const [pageInfo, setPageInfo] = useState({ title: '', url: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageText, setPageText] = useState('');
  const [serpResults, setSerpResults] = useState([]);
  const ioRef = useRef(null);

  useEffect(() => {
    void 0;
    const connect = async () => {
      let sessionToken = null;
      try { sessionToken = localStorage.getItem('sessionToken'); } catch { sessionToken = null; }

      let base = (typeof apiClient?.defaults?.baseURL === 'string' ? apiClient.defaults.baseURL : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'));
      let httpBase = String(base);
      const ensureToken = async () => {
        if (sessionToken) return sessionToken;
        try {
          const { data } = await apiClient.post('/api/v1/auth/guest-token');
          if (data?.ok && data?.token) {
            try { localStorage.setItem('sessionToken', data.token); } catch { /* noop */ }
            sessionToken = data.token;
            return sessionToken;
          }
        } catch { /* noop */ }
        return null;
      };

      const token = await ensureToken();
      if (!token) return;
      const { io } = await import('socket.io-client');
      const ioUrl = httpBase.replace(/\/$/, '');
      ioRef.current = io(`${ioUrl}/joe-agent`, { path: '/socket.io', auth: { token }, transports: ['polling','websocket'], upgrade: true, reconnection: true });
      ioRef.current.on('connect', () => { setIsConnected(true); ioRef.current.emit('browser:start'); ioRef.current.emit('browser:start_streaming'); });
      ioRef.current.on('disconnect', () => { setIsConnected(false); });
      ioRef.current.on('error', (e) => { try { console.error('[Browser IO] Error:', e); } catch { /* noop */ } });
      ioRef.current.on('browser:screenshot', ({ screenshot: sc, pageInfo: pi }) => { setScreenshot(sc); setPageInfo(pi || {}); setIsLoading(false); });
      ioRef.current.on('browser:page_text', ({ result, pageInfo: pi }) => { setPageText(String(result?.text || '')); setPageInfo(pi || {}); setIsLoading(false); });
      ioRef.current.on('browser:serp_results', ({ result, pageInfo: pi }) => { setSerpResults(Array.isArray(result?.results) ? result.results : []); setPageInfo(pi || {}); setIsLoading(false); });
    };

    connect();
    return () => { try { ioRef.current?.close(); } catch { /* noop */ } };
  }, []);

  const navigate = useCallback((url) => {
    if (ioRef.current && ioRef.current.connected) {
      setIsLoading(true);
      ioRef.current.emit('browser:navigate', { url });
    }
  }, []);

  const click = useCallback((x, y) => {
    if (ioRef.current && ioRef.current.connected) {
      ioRef.current.emit('browser:click', { x, y });
    }
  }, []);

  const type = useCallback((text) => {
    if (ioRef.current && ioRef.current.connected) {
      ioRef.current.emit('browser:type', { text });
    }
  }, []);

  const scroll = useCallback((deltaY) => {
    if (ioRef.current && ioRef.current.connected) {
      ioRef.current.emit('browser:scroll', { deltaY });
    }
  }, []);

  const pressKey = useCallback((key) => {
    if (ioRef.current && ioRef.current.connected) {
      ioRef.current.emit('browser:press_key', { key });
    }
  }, []);

  const getScreenshot = useCallback(() => {
    if (ioRef.current && ioRef.current.connected) {
      ioRef.current.emit('browser:get_screenshot');
    }
  }, []);

  const getPageText = useCallback(() => {
    if (ioRef.current && ioRef.current.connected) {
      setIsLoading(true);
      ioRef.current.emit('browser:get_page_text');
    }
  }, []);

  const extractSerp = useCallback((query) => {
    if (ioRef.current && ioRef.current.connected) {
      setIsLoading(true);
      ioRef.current.emit('browser:extract_serp', { query });
    }
  }, []);

  const startStreaming = useCallback(() => {
    if (ioRef.current && ioRef.current.connected) {
      ioRef.current.emit('browser:start_streaming');
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (ioRef.current && ioRef.current.connected) {
      ioRef.current.emit('browser:stop_streaming');
    }
  }, []);

  return {
    screenshot,
    pageInfo,
    isConnected,
    isLoading,
    pageText,
    serpResults,
    navigate,
    click,
    type,
    scroll,
    pressKey,
    getScreenshot,
    getPageText,
    extractSerp,
    startStreaming,
    stopStreaming
  };
};

export default useBrowserWebSocket;

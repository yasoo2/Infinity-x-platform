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
      let sock = null;
      try { sock = window.__joeSocket || null; } catch { sock = null; }
      const attach = (s) => {
        ioRef.current = s;
        s.on('connect', () => { setIsConnected(true); s.emit('browser:start'); s.emit('browser:start_streaming'); });
        s.on('disconnect', () => { setIsConnected(false); });
        s.on('error', (e) => { try { console.error('[Browser IO] Error:', e); } catch { /* noop */ } });
        s.on('browser:screenshot', ({ screenshot: sc, pageInfo: pi }) => { setScreenshot(sc); setPageInfo(pi || {}); setIsLoading(false); });
        s.on('browser:page_text', ({ result, pageInfo: pi }) => { setPageText(String(result?.text || '')); setPageInfo(pi || {}); setIsLoading(false); });
        s.on('browser:serp_results', ({ result, pageInfo: pi }) => { setSerpResults(Array.isArray(result?.results) ? result.results : []); setPageInfo(pi || {}); setIsLoading(false); });
        if (s.connected) { setIsConnected(true); s.emit('browser:start'); s.emit('browser:start_streaming'); }
      };
      if (sock && sock.connected) {
        attach(sock);
      } else {
        const onReady = () => { try { const s2 = window.__joeSocket || null; if (s2) { attach(s2); } } catch { /* noop */ } };
        try { window.addEventListener('joe:socket-ready', onReady, { once: true }); } catch { /* noop */ }
        setTimeout(async () => {
          try { const s3 = window.__joeSocket || null; if (s3) { attach(s3); return; } } catch { /* noop */ }
          const { io } = await import('socket.io-client');
          const ioUrl = httpBase.replace(/\/$/, '');
          const optsA = { path: '/socket.io/', auth: { token }, transports: ['polling','websocket'], upgrade: true, reconnection: true };
          try { attach(io(`${ioUrl}/joe-agent`, optsA)); } catch { /* noop */ }
        }, 800);
      }
    };

    connect();
    const onApiReset = () => {
      try { ioRef.current?.close(); } catch { /* noop */ }
      connect();
    };
    try { window.addEventListener('api:baseurl:reset', onApiReset); } catch { /* noop */ }
    return () => {
      try { window.removeEventListener('api:baseurl:reset', onApiReset); } catch { /* noop */ }
      try { ioRef.current?.close(); } catch { /* noop */ }
    };
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

  const back = useCallback(() => {
    if (ioRef.current && ioRef.current.connected) {
      setIsLoading(true);
      ioRef.current.emit('browser:back');
    }
  }, []);

  const forward = useCallback(() => {
    if (ioRef.current && ioRef.current.connected) {
      setIsLoading(true);
      ioRef.current.emit('browser:forward');
    }
  }, []);

  const refresh = useCallback(() => {
    if (ioRef.current && ioRef.current.connected) {
      setIsLoading(true);
      ioRef.current.emit('browser:refresh');
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
    back,
    forward,
    refresh,
    startStreaming,
    stopStreaming
  };
};

export default useBrowserWebSocket;

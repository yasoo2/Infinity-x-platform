  import axios from 'axios';

  // Base URL normalization: prefer explicit env; otherwise use same-origin
  let resolvedBase;
  let lsBase = null;
  try { lsBase = localStorage.getItem('apiBaseUrl'); } catch { lsBase = null; }
  const envBase = typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL);
  const explicitBase = typeof import.meta !== 'undefined' && import.meta.env?.VITE_EXPLICIT_API_BASE;
  const isLocal = (u) => { try { const h = new URL(String(u)).hostname; return h === 'localhost' || h === '127.0.0.1'; } catch { return /localhost|127\.0\.0\.1/.test(String(u)); } };
  const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
  const origin = typeof window !== 'undefined' ? window.location.origin : null;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const normalize = (u) => String(u || '').replace(/\/+$/, '');

  if (typeof window !== 'undefined' && isDev) {
    resolvedBase = window.location.origin;
  } else if (lsBase && String(lsBase).trim().length > 0) {
    resolvedBase = lsBase;
  } else if (explicitBase && String(explicitBase).trim().length > 0) {
    // Use explicit base URL from environment variable (e.g., from Front Cloud settings)
    resolvedBase = explicitBase;
  } else if (envBase && String(envBase).trim().length > 0) {
    if (typeof window !== 'undefined' && !isLocal(window.location.origin) && isLocal(envBase)) {
      resolvedBase = window.location.origin;
    } else {
      resolvedBase = envBase;
    }
  } else if (typeof window !== 'undefined') {
    resolvedBase = origin;
  } else {
    resolvedBase = 'http://localhost:4000';
  }
  const BASE_URL = String(resolvedBase).replace(/\/+$/, '');
  let errCount = 0;
  let errStart = 0;

  // Helper to detect FormData
  const isFormData = (data) =>
    typeof FormData !== 'undefined' && data instanceof FormData;

  // Axios instance
  const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000, // 15s reasonable default
    headers: {
      Accept: 'application/json',
      // don't set Content-Type globally; axios sets it for JSON, and FormData needs boundary
    },
    withCredentials: false, // set true only if server uses cookies for auth
  });

  const shouldRetry = (error) => {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    const idempotent = method === 'GET' || method === 'HEAD';
    return (error.code === 'ECONNABORTED' || !status || (status >= 500 && status < 600)) && idempotent;
  };


  // Request interceptor: attach session token and correct headers
  apiClient.interceptors.request.use(
    (config) => {
      const urlPath = String(config.url || '');
      const skipAuth = urlPath === '/api/v1/runtime-mode/status' || urlPath === '/api/v1/integration/health' || urlPath === '/api/v1/health';
      const token = skipAuth ? null : localStorage.getItem('sessionToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      } else if (skipAuth && config.headers && 'Authorization' in config.headers) {
        try { delete config.headers['Authorization']; } catch { /* noop */ }
      }
      // Let axios set JSON content-type; ensure we don't override FormData headers
      if (!isFormData(config.data) && !config.headers['Content-Type'] && (config.method || 'GET').toUpperCase() !== 'GET') {
        // axios will set to application/json automatically; explicit is fine too:
        config.headers['Content-Type'] = 'application/json';
      }
      // Prevent baseURL + url from duplicating /api/v1 when env base already includes it
      try {
        const base = String(apiClient.defaults.baseURL || '');
        const baseHasV1 = /\/api\/v1$/i.test(base);
        const urlHasV1 = /^\/api\/v1(\/|$)/i.test(String(config.url || ''));
        if (baseHasV1 && urlHasV1) {
          config.url = String(config.url || '').replace(/^\/api\/v1/, '/');
        }
      } catch { /* noop */ }
      // Prevent accidental double slashes in URL
      if (config.url?.startsWith('/')) {
        config.url = config.url.replace(/^\/+/, '/');
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Centralized error normalization
  const normalizeError = (error) => {
    if (axios.isAxiosError(error)) {
      const ax = error;
      const status = ax.response?.status;
      const message =
        ax.response?.data?.message ||
        ax.message ||
        'حدث خطأ غير متوقع أثناء الاتصال بالخادم';
      return {
        status,
        code: ax.code,
        message,
        details: ax.response?.data ?? ax.toJSON?.() ?? null,
      };
    }
    return { message: 'خطأ غير متوقع', details: String(error) };
  };

  // Simple in-flight flag for auth redirect throttling
  let isRedirecting = false;

  // Response interceptor
  apiClient.interceptors.response.use(
    (response) => {
      try {
        const newToken = response.headers?.['x-new-token'] || response.headers?.['X-New-Token'];
        if (newToken) {
          localStorage.setItem('sessionToken', newToken);
        }
      } catch { void 0; }
      return response;
    },
    async (error) => {
      if (shouldRetry(error)) {
        try {
          return await axios.request(error.config);
        } catch (e) {
          error = e;
        }
      }

      const status = error.response?.status;

      if (status === 401) {
        localStorage.removeItem('sessionToken');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        if (!isRedirecting) {
          isRedirecting = true;
          setTimeout(() => {
            if (location.pathname !== '/') {
              window.location.href = `/?redirect=${encodeURIComponent(location.pathname + location.search)}`;
            }
            isRedirecting = false;
          }, 0);
        }
      }
      if (status === 403) {
        const cfg = error.config || {};
        const method = (cfg.method || '').toUpperCase();
        const isAuthPath = /\/api\/v1\/auth\//.test(String(cfg.url || ''));
        const isAiPath = /\/api\/v1\/ai\//.test(String(cfg.url || ''));
        if (!isAuthPath && (method === 'GET' || isAiPath) && !cfg._retryGuest) {
          cfg._retryGuest = true;
          try {
            const { data } = await axios.post(`${BASE_URL}/api/v1/auth/guest-token`);
            const t = data?.token || data?.jwt || data?.access_token;
            if (t) {
              try { localStorage.setItem('sessionToken', t); } catch { void 0; }
              cfg.headers = cfg.headers || {};
              cfg.headers['Authorization'] = `Bearer ${t}`;
              return await axios.request(cfg);
            }
          } catch { /* ignore */ }
        }
        const details = normalizeError(error);
        window.dispatchEvent(new CustomEvent('auth:forbidden', { detail: details }));
      }

      if (!status || error.code === 'ECONNABORTED') {
        const now = Date.now();
        if (!errStart) errStart = now;
        errCount += 1;
        const elapsed = now - errStart;
        if (errCount >= 3 && elapsed <= 20000) {
          const fallback = typeof window !== 'undefined'
            ? ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? 'http://localhost:4000'
                : window.location.origin)
            : apiClient.defaults.baseURL;
          apiClient.defaults.baseURL = String(fallback).replace(/\/+$/, '');
          errCount = 0;
          errStart = 0;
          try { window.dispatchEvent(new CustomEvent('api:baseurl:reset')); } catch { void 0; }
        } else if (elapsed > 20000) {
          errCount = 1;
          errStart = now;
        }
      }

      // Throw normalized error for consistent handling in callers
      return Promise.reject(normalizeError(error));
    }
  );


  export default apiClient;

  // Helper: example usage
  export async function getJson(url, config) {
    try {
      const { data } = await apiClient.get(url, config);
      return data;
    } catch (e) {
      const err = normalizeError(e);
      // Optionally log or show toast here
      throw err;
    }
  }

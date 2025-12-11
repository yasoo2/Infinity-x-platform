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
  

  if (typeof window !== 'undefined' && (isDev || ['localhost','127.0.0.1'].includes(String(window.location.hostname)))) {
    if (explicitBase && String(explicitBase).trim().length > 0) {
      resolvedBase = explicitBase;
    } else if (envBase && String(envBase).trim().length > 0) {
      resolvedBase = envBase;
    } else {
      resolvedBase = 'http://localhost:4000';
    }
  } else if (lsBase && String(lsBase).trim().length > 0) {
    let valid = null;
    try {
      const u = new URL(String(lsBase));
      if (u.hostname && u.protocol) valid = String(lsBase);
    } catch { valid = null; }
    if (valid) {
      resolvedBase = valid;
    } else {
      try { localStorage.removeItem('apiBaseUrl'); } catch { /* noop */ }
      resolvedBase = origin || 'http://localhost:4000';
    }
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
    // Prefer same-origin to avoid cross-site CORS/Workers issues
    resolvedBase = origin;
  } else {
    resolvedBase = 'http://localhost:4000';
  }
  
  try {
    const rateLimited = localStorage.getItem('apiRateLimited') === '1';
    if (rateLimited && typeof window !== 'undefined') {
      const curHost = (() => { try { return new URL(String(resolvedBase)).hostname; } catch { return ''; } })();
      const winHost = window.location.hostname || '';
      if (!!curHost && !!winHost && curHost !== winHost) {
        resolvedBase = origin;
      }
    }
  } catch { /* noop */ }
  // Final sanitation: trim trailing slashes
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
      try {
        const curBase = String(apiClient.defaults.baseURL || '');
        const host = new URL(curBase).hostname;
        const offline = localStorage.getItem('apiOffline') === '1';
        if (offline && (host === 'localhost' || host === '127.0.0.1')) {
          const prod = computePreferredApiBase();
          apiClient.defaults.baseURL = prod;
          try { localStorage.setItem('apiBaseUrl', prod); localStorage.removeItem('apiOffline'); } catch { /* noop */ }
          try { window.dispatchEvent(new CustomEvent('api:baseurl:reset')); window.dispatchEvent(new CustomEvent('api:online')); } catch { /* noop */ }
        }
      } catch { /* noop */ }
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

  // Helper: compute safe fallback base URL
  const computeFallbackBase = () => {
    try {
      // أولًا: احترم الـ Override اليدوي إن وُجد
      try {
        const override = localStorage.getItem('apiOverrideBase');
        if (override && String(override).trim().length > 0) return String(override).replace(/\/+$/, '');
      } catch { /* noop */ }
      // ثانيًا: استخدم مسار احتياطي محدد بيئيًا إن وُجد
      const envFallback = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FALLBACK_API_BASE_URL) || '';
      if (String(envFallback).trim().length > 0) return String(envFallback).replace(/\/+$/, '');
      // ثالثًا: استخدم القاعدة البيئية الأساسية إن وُجدت
      const envApi = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL || import.meta.env?.VITE_EXPLICIT_API_BASE)) || '';
      if (String(envApi).trim().length > 0) return String(envApi).replace(/\/+$/, '');
      // أخيرًا: إن لم يتوفر شيء، استخدم نفس الأصل في بيئة غير محلية
      if (typeof window !== 'undefined') {
        const h = String(window.location.hostname || '');
        const isLocalHost = (h === 'localhost' || h === '127.0.0.1');
        if (isLocalHost) return 'http://localhost:4000';
        return String(window.location.origin || BASE_URL).replace(/\/+$/, '');
      }
    } catch { /* noop */ }
    return BASE_URL;
  };

  // Helper: prefer production API when local backend is offline
  const computePreferredApiBase = () => {
    try {
      try {
        const override = localStorage.getItem('apiOverrideBase');
        if (override && String(override).trim().length > 0) return String(override).replace(/\/+$/, '');
      } catch { /* noop */ }
      const explicit = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_EXPLICIT_API_BASE) || '';
      const envApi = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) || '';
      const envFallback = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FALLBACK_API_BASE_URL) || '';
      const rateLimited = (() => { try { return localStorage.getItem('apiRateLimited') === '1'; } catch { return false; } })();
      if (String(explicit).trim().length > 0) return String(explicit).replace(/\/+$/, '');
      if (!rateLimited && String(envApi).trim().length > 0) return String(envApi).replace(/\/+$/, '');
      if (String(envFallback).trim().length > 0) return String(envFallback).replace(/\/+$/, '');
      if (typeof window !== 'undefined') {
        const h = String(window.location.hostname || '');
        const isLocalHost = (h === 'localhost' || h === '127.0.0.1');
        return isLocalHost ? 'http://localhost:4000' : String(window.location.origin || BASE_URL).replace(/\/+$/, '');
      }
      return 'http://localhost:4000';
    } catch { /* noop */ }
    return 'http://localhost:4000';
  };

  // Helper: compute rate-limit fallback base
  const computeRateLimitFallback = () => {
    try {
      const envFallback = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FALLBACK_API_BASE_URL) || '';
      if (String(envFallback).trim().length > 0) return String(envFallback).replace(/\/+$/, '');
      if (typeof window !== 'undefined') {
        const h = String(window.location.hostname || '');
        const isLocalHost = (h === 'localhost' || h === '127.0.0.1');
        if (isLocalHost) return 'http://localhost:4000';
        const origin = String(window.location.origin || BASE_URL).replace(/\/+$/, '');
        return origin;
      }
    } catch { /* noop */ }
    return BASE_URL;
  };

  // Response interceptor
  apiClient.interceptors.response.use(
    (response) => {
      try {
        const newToken = response.headers?.['x-new-token'] || response.headers?.['X-New-Token'];
        if (newToken) {
          localStorage.setItem('sessionToken', newToken);
        }
        try {
          if (localStorage.getItem('apiOffline') === '1') {
            localStorage.removeItem('apiOffline');
            window.dispatchEvent(new CustomEvent('api:online'));
          }
        } catch { /* noop */ }
        try {
          const ct = String(response.headers?.['content-type'] || response.headers?.['Content-Type'] || '');
          const isHtml = /text\/html/i.test(ct);
          const body = response.data;
          const looksRateLimited = typeof body === 'string' && /temporarily rate limited|Cloudflare/i.test(body);
          if (!isDev && (isHtml || looksRateLimited)) {
            localStorage.setItem('apiRateLimited', '1');
            const fallback = computeRateLimitFallback();
            apiClient.defaults.baseURL = String(fallback).replace(/\/+$/, '');
            try { localStorage.setItem('apiBaseUrl', apiClient.defaults.baseURL); } catch { /* noop */ }
            try { window.dispatchEvent(new CustomEvent('api:baseurl:reset')); } catch { void 0; }
            try { window.dispatchEvent(new CustomEvent('api:rate-limited')); } catch { void 0; }
          }
        } catch { /* noop */ }
      } catch { void 0; }
      return response;
    },
    async (error) => {
      try {
        const status = error?.response?.status;
        const cfg = error?.config || {};
        const curBase = String(apiClient.defaults.baseURL || '');
        const host = (() => { try { return new URL(curBase).hostname; } catch { return ''; } })();
        const isLocalHost = (host === 'localhost' || host === '127.0.0.1');
        const path = (() => {
          try {
            const u = new URL(String(cfg.url || ''), curBase || BASE_URL);
            return u.pathname || String(cfg.url || '');
          } catch { return String(cfg.url || ''); }
        })();
        const isCorePath = /^\/api\/v1\/(health|ai\/providers|chat-history)/i.test(path);
        if (!isLocalHost && status === 404 && isCorePath) {
          try {
            const probe = await axios.get('http://localhost:4000/api/v1/runtime-mode/status', { timeout: 2000 });
            if (probe?.data?.success) {
              apiClient.defaults.baseURL = 'http://localhost:4000';
              try { localStorage.setItem('apiBaseUrl', apiClient.defaults.baseURL); localStorage.removeItem('apiOffline'); } catch { /* noop */ }
              try { window.dispatchEvent(new CustomEvent('api:baseurl:reset')); window.dispatchEvent(new CustomEvent('api:online')); } catch { /* noop */ }
              const retryCfg = { ...cfg, baseURL: apiClient.defaults.baseURL };
              try {
                if (/^https?:\/\//i.test(String(retryCfg.url || ''))) {
                  retryCfg.url = path;
                }
              } catch { /* noop */ }
              return await apiClient.request(retryCfg);
            }
          } catch { /* ignore */ }
        }
      } catch { /* noop */ }
      const code = error.code;
      const msg = String(error.message || '').toLowerCase();
      const nameNotResolved = /name\s*not\s*resolved|enotfound|getaddrinfo/.test(msg);
      if (nameNotResolved) {
        try { localStorage.removeItem('apiBaseUrl'); } catch { /* noop */ }
        const fb = computeFallbackBase();
        apiClient.defaults.baseURL = String(fb).replace(/\/+$/, '');
        try { localStorage.setItem('apiBaseUrl', apiClient.defaults.baseURL); } catch { /* noop */ }
        try { window.dispatchEvent(new CustomEvent('api:baseurl:reset')); } catch { void 0; }
      }
      if (shouldRetry(error)) {
        try {
          return await axios.request(error.config);
        } catch (e) {
          error = e;
        }
      }

      const status = error.response?.status;

      if (status === 401) {
        const cfg = error.config || {};
        if (cfg._noRedirect401) {
          return Promise.reject(normalizeError(error));
        }
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

      if (!status || code === 'ECONNABORTED') {
        try {
          const curBase = String(apiClient.defaults.baseURL || '');
          const host = new URL(curBase).hostname;
          if (host === 'localhost' || host === '127.0.0.1') {
            localStorage.setItem('apiOffline', '1');
            window.dispatchEvent(new CustomEvent('api:offline'));
          }
        } catch { /* noop */ }
        if (!isDev) {
          const now = Date.now();
          if (!errStart) errStart = now;
          errCount += 1;
          const elapsed = now - errStart;
          // في الإنتاج، حوّل مباشرةً عند أول فشل preflight/شبكي
          if (errCount >= 1 && elapsed <= 20000) {
            const fallback = computeFallbackBase();
            apiClient.defaults.baseURL = String(fallback).replace(/\/+$/, '');
            try { localStorage.setItem('apiBaseUrl', apiClient.defaults.baseURL); } catch { /* noop */ }
            errCount = 0;
            errStart = 0;
            try { window.dispatchEvent(new CustomEvent('api:baseurl:reset')); } catch { void 0; }
          } else if (elapsed > 20000) {
            errCount = 1;
            errStart = now;
          }
        }
      }

      // Explicit 5xx gateway errors: trigger fallback logic similarly
      if (!isDev && (status === 502 || status === 503 || status === 504)) {
        const now = Date.now();
        if (!errStart) errStart = now;
        errCount += 1;
        const elapsed = now - errStart;
        if (errCount >= 3 && elapsed <= 20000) {
          const fallback = computeFallbackBase();
          apiClient.defaults.baseURL = String(fallback).replace(/\/+$/, '');
          try { localStorage.setItem('apiBaseUrl', apiClient.defaults.baseURL); } catch { /* noop */ }
          errCount = 0;
          errStart = 0;
          try { window.dispatchEvent(new CustomEvent('api:baseurl:reset')); } catch { void 0; }
        } else if (elapsed > 20000) {
          errCount = 1;
          errStart = now;
        }
      }

      // Cloudflare/Workers rate limit (429): mark and fallback
      if (!isDev && status === 429) {
        try { localStorage.setItem('apiRateLimited', '1'); } catch { /* noop */ }
        const fallback = computeRateLimitFallback();
        apiClient.defaults.baseURL = String(fallback).replace(/\/+$/, '');
        try { localStorage.setItem('apiBaseUrl', apiClient.defaults.baseURL); } catch { /* noop */ }
        try { window.dispatchEvent(new CustomEvent('api:baseurl:reset')); } catch { void 0; }
      }

      // In local preview with production base, repeated 400/404 should fall back to localhost
      if (!isDev && (status === 400 || status === 404)) {
        try {
          const curBase = String(apiClient.defaults.baseURL || '');
          const host = new URL(curBase).hostname;
          const isProdApi = host === 'api.xelitesolutions.com';
          const isLocalHost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
          if (isProdApi && isLocalHost) {
            const now = Date.now();
            if (!errStart) errStart = now;
            errCount += 1;
            const elapsed = now - errStart;
            if (errCount >= 3 && elapsed <= 20000) {
              apiClient.defaults.baseURL = computeFallbackBase();
              try { localStorage.setItem('apiBaseUrl', apiClient.defaults.baseURL); } catch { /* noop */ }
              errCount = 0;
              errStart = 0;
              try { window.dispatchEvent(new CustomEvent('api:baseurl:reset')); } catch { void 0; }
            } else if (elapsed > 20000) {
              errCount = 1;
              errStart = now;
            }
          }
        } catch { /* noop */ }
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

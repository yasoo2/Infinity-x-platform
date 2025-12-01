  import axios from 'axios';

  // Base URL normalization: prefer explicit env; otherwise use same-origin
  let resolvedBase;
  let lsBase = null;
  try { lsBase = localStorage.getItem('apiBaseUrl'); } catch { lsBase = null; }
  const envBase = typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL);
  if (lsBase && String(lsBase).trim().length > 0) {
    resolvedBase = lsBase;
  } else if (envBase && String(envBase).trim().length > 0) {
    resolvedBase = envBase;
  } else if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    resolvedBase = origin;
  } else {
    resolvedBase = 'http://localhost:4000';
  }
  const BASE_URL = String(resolvedBase).replace(/\/+$/, '');

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

  // Optional: a simple retry policy for idempotent requests (GET/HEAD)
  const shouldRetry = (error) => {
    const status = error.response?.status;
    const method = error.config?.method?.toUpperCase();
    // Retry on network or 5xx for idempotent methods
    const idempotent = method === 'GET' || method === 'HEAD';
    return (error.code === 'ECONNABORTED' || !status || (status >= 500 && status < 600)) && idempotent;
  };

  // Request interceptor: attach session token and correct headers
  apiClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('sessionToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      // Let axios set JSON content-type; ensure we don't override FormData headers
      if (!isFormData(config.data) && !config.headers['Content-Type']) {
        // axios will set to application/json automatically; explicit is fine too:
        config.headers['Content-Type'] = 'application/json';
      }
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
      // Optional retry
      if (shouldRetry(error)) {
        try {
          return await axios.request(error.config);
        } catch (e) {
          // fall through to unified handling
          error = e;
        }
      }

      const status = error.response?.status;

      if (status === 401) {
        // Clear token and emit an event; let the app decide how to redirect
        localStorage.removeItem('sessionToken');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        // Fallback redirect if app doesn't handle event within a tick
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
        const details = normalizeError(error);
        window.dispatchEvent(new CustomEvent('auth:forbidden', { detail: details }));
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

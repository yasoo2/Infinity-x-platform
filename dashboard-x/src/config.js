function resolveApiBaseUrl() {
  let base = '';
  let lsBase = null;
  try { lsBase = localStorage.getItem('apiBaseUrl'); } catch { lsBase = null; }
  const envBase = typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL);
  const explicitBase = typeof import.meta !== 'undefined' && import.meta.env?.VITE_EXPLICIT_API_BASE;
  const origin = typeof window !== 'undefined' ? window.location.origin : null;
  const isLocalHost = (h) => h === 'localhost' || h === '127.0.0.1';

  if (explicitBase && String(explicitBase).trim().length > 0) {
    base = explicitBase;
  } else if (envBase && String(envBase).trim().length > 0) {
    base = envBase;
  } else if (lsBase && String(lsBase).trim().length > 0) {
    try {
      const u = new URL(String(lsBase));
      const host = u.hostname;
      if (host === 'www.xelitesolutions.com' || host === 'xelitesolutions.com') {
        base = 'https://api.xelitesolutions.com';
        try { localStorage.setItem('apiBaseUrl', base); } catch { /* noop */ }
      } else {
        base = lsBase;
      }
    } catch {
      base = lsBase;
    }
  } else if (origin) {
    base = origin;
    try {
      const h = window.location.hostname || '';
      if (h === 'www.xelitesolutions.com' || h === 'xelitesolutions.com') {
        base = 'https://api.xelitesolutions.com';
      } else if (isLocalHost(h)) {
        base = 'http://localhost:4000';
      }
    } catch { /* noop */ }
  } else {
    base = 'http://localhost:4000';
  }

  try {
    const u2 = new URL(String(base));
    const host2 = u2.hostname;
    if (host2 === 'www.xelitesolutions.com' || host2 === 'xelitesolutions.com') {
      base = 'https://api.xelitesolutions.com';
    }
  } catch { /* noop */ }

  const sanitized = String(base).replace(/\/+$/, '');
  const hasApiV1 = /\/api\/v1$/i.test(sanitized);
  return hasApiV1 ? sanitized : `${sanitized}/api/v1`;
}

const config = { apiBaseUrl: resolveApiBaseUrl() };

export default config;

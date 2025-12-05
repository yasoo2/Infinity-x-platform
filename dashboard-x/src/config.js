function resolveApiBaseUrl() {
  let base = '';
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000';
    const u = new URL(String(origin));
    let host = u.hostname;
    if (host === 'www.xelitesolutions.com' || host === 'xelitesolutions.com') {
      base = 'https://api.xelitesolutions.com';
    } else if (host === 'localhost' || host === '127.0.0.1') {
      base = 'http://localhost:4000';
    } else {
      base = origin;
    }
  } catch {
    base = 'http://localhost:4000';
  }
  return `${String(base).replace(/\/+$/, '')}/api/v1`;
}

const config = { apiBaseUrl: resolveApiBaseUrl() };

export default config;

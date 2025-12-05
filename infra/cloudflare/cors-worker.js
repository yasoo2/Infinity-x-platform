export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const configured = (env && env.ALLOWED_ORIGINS) ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [];
    const defaults = ['https://xelitesolutions.com', 'https://www.xelitesolutions.com'];
    const allowlist = configured.length ? configured : defaults;
    const allowed = origin && allowlist.includes(origin);

    const corsHeaders = allowed
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
          'Access-Control-Expose-Headers': 'X-New-Token, x-new-token',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method'
        }
      : {};

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: allowed ? 200 : 403, headers: corsHeaders });
    }
    const url = new URL(request.url);
    const upstreamBase = (env && env.UPSTREAM_BASE) ? String(env.UPSTREAM_BASE) : 'https://infinity-x-platform.onrender.com';
    const needsProxy = url.hostname === 'api.xelitesolutions.com' && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/ws/joe-agent'));

    const upgrade = request.headers.get('Upgrade');
    if (upgrade && upgrade.toLowerCase() === 'websocket') {
      if (needsProxy) {
        const targetUrl = upstreamBase.replace(/\/$/, '') + url.pathname + url.search;
        const upstreamReq = new Request(targetUrl, request);
        return fetch(upstreamReq);
      }
      return fetch(request);
    }

    let resp;
    if (needsProxy) {
      const targetUrl = upstreamBase.replace(/\/$/, '') + url.pathname + url.search;
      const upstreamReq = new Request(targetUrl, request);
      resp = await fetch(upstreamReq);
    } else {
      resp = await fetch(request);
    }
    if (resp.status === 101) {
      return resp;
    }
    const headers = new Headers(resp.headers);
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
    return new Response(resp.body, { status: resp.status, headers });
  }
};

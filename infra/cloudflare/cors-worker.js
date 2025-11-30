export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = origin && (origin === 'https://xelitesolutions.com' || origin === 'https://www.xelitesolutions.com');

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
    // Proxy to origin API host
    url.hostname = 'api.xelitesolutions.com';
    const proxied = new Request(url, request);
    const resp = await fetch(proxied);

    const headers = new Headers(resp.headers);
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
    return new Response(resp.body, { status: resp.status, headers });
  }
};

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '*';
    const baseHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Expose-Headers': 'X-New-Token, x-new-token',
      'Vary': 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method'
    };

    if (request.method === 'OPTIONS') {
      const reqHeaders = request.headers.get('Access-Control-Request-Headers');
      const allowHeaders = reqHeaders || 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
      const allowMethods = 'GET,POST,PUT,DELETE,PATCH,OPTIONS';
      return new Response(null, {
        status: 200,
        headers: {
          ...baseHeaders,
          'Access-Control-Allow-Headers': allowHeaders,
          'Access-Control-Allow-Methods': allowMethods,
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    const response = await fetch(request);
    if (response.status === 101) {
      return response;
    }
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', origin);
    newHeaders.set('Access-Control-Allow-Credentials', 'true');
    newHeaders.set('Access-Control-Expose-Headers', 'X-New-Token, x-new-token');
    newHeaders.append('Vary', 'Origin, Access-Control-Request-Headers, Access-Control-Request-Method');
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
}

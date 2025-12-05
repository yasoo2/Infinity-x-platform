# CORS Production Setup

## Allowed Origins
- https://xelitesolutions.com
- https://www.xelitesolutions.com

## Node Server
- Echo exact `Origin` on responses
- Handle `OPTIONS` globally with 204 and headers
- Expose `X-New-Token` headers

## Cloudflare/NGINX Gateway
- Return 204 for `OPTIONS` with the same headers
- Mirror `Origin` when allowed
- Add `Vary: Origin, Access-Control-Request-Headers, Access-Control-Request-Method`

## Cloudflare Worker (Optional)
- Use `infra/cloudflare/cors-worker.js` to enforce CORS and proxy to `api.xelitesolutions.com`

## Verify
```
curl -I -X OPTIONS -H "Origin: https://www.xelitesolutions.com" -H "Access-Control-Request-Method: POST" https://api.xelitesolutions.com/api/v1/auth/login
```

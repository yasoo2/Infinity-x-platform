# Cloudflare CORS Worker

This worker guarantees correct CORS behavior for `api.xelitesolutions.com` by:
- Returning `200 OK` for `OPTIONS` preflight requests
- Mirroring the `Origin` when allowed (`https://xelitesolutions.com` and `https://www.xelitesolutions.com`)
- Setting `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `Access-Control-Allow-Credentials`, `Access-Control-Max-Age`, and `Vary`

## Deploy (Secure)

1. Install Wrangler: `npm i -g wrangler`
2. Export your API token without printing it:
   - `export CLOUDFLARE_API_TOKEN='***YOUR_TOKEN***'`
3. Get account info:
   - `bash scripts/cf-whoami.sh`
   - Set `CF_ACCOUNT_ID` from output, and `CF_ZONE_ID` for your domain zone.
4. Publish using a temporary config (no secrets written):
   - `export CF_ACCOUNT_ID='***'`
   - `export CF_ZONE_ID='***'`
   - `bash scripts/cf-publish.sh`

## Verify

Run a preflight check from anywhere:

```
curl -i -X OPTIONS 'https://api.xelitesolutions.com/api/v1/auth/login' \
  -H 'Origin: https://www.xelitesolutions.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Expected:
- Status: `HTTP/2 200`
- Headers include `Access-Control-Allow-Origin` equal to the request origin and `Access-Control-Allow-Credentials: true`.

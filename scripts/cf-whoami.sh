#!/usr/bin/env bash
set -euo pipefail

# Requires env var CLOUDFLARE_API_TOKEN
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Error: CLOUDFLARE_API_TOKEN is not set" >&2; exit 1;
fi

wrangler whoami --config infra/cloudflare/wrangler.toml || wrangler whoami

echo "Use the printed account_id to set CF_ACCOUNT_ID, and zone_id from your domain to set CF_ZONE_ID."


#!/usr/bin/env bash
set -euo pipefail

# Requires env vars: CLOUDFLARE_API_TOKEN, CF_ACCOUNT_ID, CF_ZONE_ID
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "Error: CLOUDFLARE_API_TOKEN is not set" >&2; exit 1;
fi
if [[ -z "${CF_ACCOUNT_ID:-}" ]]; then
  echo "Error: CF_ACCOUNT_ID is not set" >&2; exit 1;
fi
if [[ -z "${CF_ZONE_ID:-}" ]]; then
  echo "Error: CF_ZONE_ID is not set" >&2; exit 1;
fi

TEMP_TOML=$(mktemp)
sed \
  -e "s|<YOUR_CLOUDFLARE_ACCOUNT_ID>|${CF_ACCOUNT_ID}|g" \
  -e "s|<YOUR_ZONE_ID>|${CF_ZONE_ID}|g" \
  infra/cloudflare/wrangler.toml > "$TEMP_TOML"

echo "Publishing Cloudflare Worker using temporary config: $TEMP_TOML"
wrangler publish --config "$TEMP_TOML"

echo "Done. Remember to verify OPTIONS returns 200 on production."


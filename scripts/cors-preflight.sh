#!/usr/bin/env bash
set -euo pipefail

ORIGIN=${1:-https://www.xelitesolutions.com}
URL=${2:-http://localhost:4001/api/v1/auth/login}

echo "Testing CORS preflight for: $URL"
curl -i -X OPTIONS "$URL" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"


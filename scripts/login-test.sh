#!/usr/bin/env bash
set -euo pipefail

URL=${1:-http://localhost:4001/api/v1/auth/login}
EMAIL=${2:-info.auraaluxury@gmail.com}
PASSWORD=${3:-younes2025}

echo "Testing login at: $URL"
curl -i -X POST "$URL" \
  -H "Origin: https://www.xelitesolutions.com" \
  -H "Content-Type: application/json" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"


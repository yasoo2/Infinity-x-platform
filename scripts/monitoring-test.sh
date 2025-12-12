#!/usr/bin/env bash

set -euo pipefail

# Usage:
#   API="https://api.xelitesolutions.com" TOKEN="<ADMIN_JWT>" bash scripts/monitoring-test.sh
# If testing locally, set API="http://localhost:4000" and provide a valid admin token.

API=${API:-"http://localhost:4000"}
TOKEN=${TOKEN:-""}

hdr_auth=()
if [[ -n "$TOKEN" ]]; then
  hdr_auth=( -H "Authorization: Bearer $TOKEN" )
fi

echo "[1] Health"
curl -s "$API/api/v1/health" | sed -e 's/{/{\n{/' -e 's/,/,\n/g'
echo

echo "[2] Joe Stats (before)"
curl -s "${hdr_auth[@]}" "$API/api/v1/joe/stats" | sed -e 's/{/{\n{/' -e 's/,/,\n/g'
echo

echo "[3] Purge Tools Cache"
curl -s -X POST "${hdr_auth[@]}" "$API/api/v1/joe/tools/cache/purge" | sed -e 's/{/{\n{/' -e 's/,/,\n/g'
echo

echo "[4] Joe Stats (after purge)"
curl -s "${hdr_auth[@]}" "$API/api/v1/joe/stats" | sed -e 's/{/{\n{/' -e 's/,/,\n/g'
echo

echo "[5] Reset Circuits"
curl -s -X POST "${hdr_auth[@]}" "$API/api/v1/joe/tools/circuits/reset" | sed -e 's/{/{\n{/' -e 's/,/,\n/g'
echo

echo "[6] Joe Stats (after reset)"
curl -s "${hdr_auth[@]}" "$API/api/v1/joe/stats" | sed -e 's/{/{\n{/' -e 's/,/,\n/g'
echo

echo "Done."


#!/usr/bin/env bash

set -euo pipefail

# Usage examples:
#  API="https://api.xelitesolutions.com" bash scripts/login-test.sh
#  API="http://localhost:4000" bash scripts/login-test.sh

API=${API:-"http://localhost:4000"}
ORIGIN=${ORIGIN:-"https://www.xelitesolutions.com"}

echo "[1] Preflight OPTIONS /api/v1/auth/login"
curl -s -i -X OPTIONS \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  "$API/api/v1/auth/login" | sed -e 's/^/  /'
echo

echo "[2] POST invalid credentials (should fail with 404/401)"
curl -s -i -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  --data '{"email":"nonexistent@example.com","password":"wrong"}' | sed -e 's/^/  /'
echo

echo "[3] POST dev super admin credentials"
curl -s -i -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  --data '{"email":"info.auraaluxury@gmail.com","password":"younes2025"}' | sed -e 's/^/  /'
echo

echo "[4] GET fallback dev super admin credentials"
curl -s -i "$API/api/v1/auth/login?email=info.auraaluxury@gmail.com&password=younes2025" | sed -e 's/^/  /'
echo

echo "[5] Aliases check (/auth and /v1/auth)"
curl -s -i -X POST "$API/auth/login" -H "Content-Type: application/json" --data '{"email":"info.auraaluxury@gmail.com","password":"younes2025"}' | sed -e 's/^/  /'
curl -s -i -X POST "$API/v1/auth/login" -H "Content-Type: application/json" --data '{"email":"info.auraaluxury@gmail.com","password":"younes2025"}' | sed -e 's/^/  /'
echo

RAND=$(( RANDOM % 100000 ))
NEW_EMAIL="tester_${RAND}@example.com"
NEW_PASS="TestPass1234"

echo "[6] Register new user: $NEW_EMAIL"
curl -s -i -X POST "$API/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  --data '{"email":"'"$NEW_EMAIL"'","password":"'"$NEW_PASS"'"}' | sed -e 's/^/  /'
echo

echo "[7] Login new user (POST)"
curl -s -i -X POST "$API/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  --data '{"email":"'"$NEW_EMAIL"'","password":"'"$NEW_PASS"'"}' | sed -e 's/^/  /'
echo

echo "[8] Login new user (GET fallback)"
curl -s -i "$API/api/v1/auth/login?email=$NEW_EMAIL&password=$NEW_PASS" | sed -e 's/^/  /'
echo

echo "Done."


#!/usr/bin/env bash
#
# Live status checker — reports health of API, web, and auth (read-only).
#
# Usage:
#   npm run status
#
# Optional overrides:
#   API_URL=https://... WEB_URL=https://... npm run status
set -euo pipefail

API_URL="${API_URL:-https://creative-ops-erp-api.onrender.com}"
WEB_URL="${WEB_URL:-https://web-pi-rose-49.vercel.app}"

echo "== Live status =="
echo "   $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

# --- API health ---
API_RAW=$(curl -sS -w "|%{http_code}" --max-time 25 "$API_URL/api/v1/health" || echo "|000")
API_CODE="${API_RAW##*|}"
BODY="${API_RAW%|*}"
if [ "$API_CODE" = "200" ]; then
  UP=$(printf '%s' "$BODY" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
  echo "API   health : ✅ up  (HTTP $API_CODE, status=${UP:-ok})"
else
  echo "API   health : ❌ down (HTTP $API_CODE)"
fi

# --- Web app (follow server redirects) ---
WEB_CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 25 -L "$WEB_URL" || echo 000)
if [ "$WEB_CODE" = "200" ]; then
  echo "Web   reach : ✅ up  (HTTP $WEB_CODE)"
else
  echo "Web   reach : ⚠️  HTTP $WEB_CODE (3xx = normal login redirect; non-2xx is a problem)"
fi

# --- Auth smoke test ---
TOKENS=$(curl -sS -m 25 -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@onedot.com","password":"Admin@123","portal":"MANAGER"}' 2>/dev/null || echo "")
if printf '%s' "$TOKENS" | grep -q '"accessToken"'; then
  echo "Auth  login  : ✅ works"
else
  echo "Auth  login  : ❌ failed (check JWT secrets / credentials)"
fi

echo ""
echo "API : $API_URL/api/v1"
echo "Web : $WEB_URL"

#!/usr/bin/env bash
#
# One-command deploy to live:
#   verify build -> commit -> push to main (triggers Render API + Vercel web) -> confirm live health
#
# Usage:
#   npm run deploy                 # deploy with a default message
#   npm run deploy -- "feat: xyz"  # deploy with a custom commit message
#
# Optional overrides:
#   API_URL=https://... WEB_URL=https://... npm run deploy
set -euo pipefail

cd "$(dirname "$0")/.."

API_URL="${API_URL:-https://creative-ops-erp-api.onrender.com}"
WEB_URL="${WEB_URL:-https://web-pi-rose-49.vercel.app}"
MSG="${1:-deploy: update live}"

# 1. Ensure we are on main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "❌ Not on main (on '$BRANCH'). Switch to main first: git checkout main" >&2
  exit 1
fi

# 2. Verify the API builds before deploying
echo "==> Verifying API build..."
npm run build -w apps/api

# 3. Stage + commit any changes
echo "==> Staging changes..."
git add -A
if git diff --cached --quiet; then
  echo "   (no changes to commit — still pushing to trigger deploy)"
else
  echo "==> Committing: $MSG"
  git commit -m "$MSG"
fi

# 4. Push to main (auto-deploys Render API + Vercel web)
echo "==> Pushing to origin/main..."
git push origin main

# 5. Wait for + confirm live API health
echo "==> Waiting for live API health (max ~5 min)..."
for i in $(seq 1 30); do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "$API_URL/api/v1/health" || echo 000)
  if [ "$CODE" = "200" ]; then
    echo "✅ Live API healthy (HTTP 200): $API_URL/api/v1/health"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "⚠️  Timed out waiting for health. Check $API_URL/api/v1/health" >&2
    exit 1
  fi
  echo "   ... not ready yet (HTTP $CODE), retrying in 10s"
  sleep 10
done

echo ""
echo "✅ Deployed. Live site: $WEB_URL"
echo "   Monitor: npm run status"

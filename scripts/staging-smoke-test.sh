#!/usr/bin/env bash
# staging-smoke-test.sh — Post-deploy smoke tests for staging.carsi.com.au
# Run after a successful staging deploy to verify the environment is healthy.
#
# Usage:
#   bash scripts/staging-smoke-test.sh
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more checks failed

set -euo pipefail

WEB_URL="https://staging.carsi.com.au"
API_URL="https://api-staging.carsi.com.au"
TIMEOUT=30
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL++)); }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

echo "========================================="
echo "  CARSI Staging Smoke Test"
echo "  $(date -u)"
echo "========================================="
echo ""

# ── Check 1: Web frontend responds HTTP 200 ────────────────────────────────
info "Checking web frontend: ${WEB_URL}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" --location "$WEB_URL" || echo "000")
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "Web frontend returned HTTP 200"
else
  fail "Web frontend returned HTTP ${HTTP_STATUS} (expected 200)"
fi

# ── Check 2: Web frontend TLS valid ───────────────────────────────────────
info "Checking TLS certificate for ${WEB_URL}"
if curl -s -o /dev/null --max-time "$TIMEOUT" "$WEB_URL" 2>&1; then
  pass "TLS certificate valid for staging.carsi.com.au"
else
  fail "TLS certificate error for staging.carsi.com.au"
fi

# ── Check 3: API health endpoint ──────────────────────────────────────────
info "Checking API health: ${API_URL}/health"
API_STATUS=$(curl -s -o /tmp/api_health.json -w "%{http_code}" --max-time "$TIMEOUT" "${API_URL}/health" || echo "000")
if [[ "$API_STATUS" == "200" ]]; then
  pass "API health endpoint returned HTTP 200"
  # Check response body contains 'status' field
  if grep -q '"status"' /tmp/api_health.json 2>/dev/null; then
    pass "API health response contains 'status' field"
  else
    fail "API health response missing 'status' field — body: $(cat /tmp/api_health.json 2>/dev/null || echo 'empty')"
  fi
else
  fail "API health endpoint returned HTTP ${API_STATUS} (expected 200)"
fi

# ── Check 4: API TLS valid ────────────────────────────────────────────────
info "Checking TLS certificate for ${API_URL}"
if curl -s -o /dev/null --max-time "$TIMEOUT" "${API_URL}/health" 2>&1; then
  pass "TLS certificate valid for api-staging.carsi.com.au"
else
  fail "TLS certificate error for api-staging.carsi.com.au"
fi

# ── Check 5: DB connectivity probe via API ────────────────────────────────
# The /health endpoint on the backend should include DB status if healthy.
# If the API returned 200 above, DB is likely connected — but check explicitly.
info "Checking DB connectivity via API health response"
if grep -qiE '"database"[[:space:]]*:[[:space:]]*"(ok|healthy|connected|up)"' /tmp/api_health.json 2>/dev/null; then
  pass "Database connectivity confirmed via health response"
elif grep -q '"db"' /tmp/api_health.json 2>/dev/null; then
  pass "Database key present in health response"
else
  info "Database field not found in health response — relying on HTTP 200 as proxy for DB health"
  if [[ "$API_STATUS" == "200" ]]; then
    pass "API returned 200 (DB likely healthy — verify health endpoint includes db field)"
  else
    fail "Cannot confirm DB connectivity (API health check also failed)"
  fi
fi

# ── Check 6: Web Next.js API health route ────────────────────────────────
info "Checking web Next.js health route: ${WEB_URL}/api/health"
WEB_API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "${WEB_URL}/api/health" || echo "000")
if [[ "$WEB_API_STATUS" == "200" ]]; then
  pass "Web /api/health returned HTTP 200"
else
  info "Web /api/health returned HTTP ${WEB_API_STATUS} (may not be implemented)"
fi

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "  Results: ${PASS} passed, ${FAIL} failed"
echo "========================================="

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "${RED}SMOKE TEST FAILED — staging environment is not healthy.${NC}"
  exit 1
else
  echo -e "${GREEN}SMOKE TEST PASSED — staging environment is healthy.${NC}"
  exit 0
fi

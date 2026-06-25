#!/usr/bin/env bash
#
# Fly.io secrets bootstrap for the CARSI backend app.
#
# TEMPLATE ONLY — every value below is a REPLACE_ME placeholder. Fill them in with real
# values BEFORE running, and NEVER commit real secret values back to the repo.
#
# Usage:
#   1. Replace every REPLACE_ME with the real value (or delete the line to leave it unset).
#   2. From the repo root:  bash scripts/fly-secrets.sh
#   3. Verify:              fly secrets list --app "$APP"
#
# Notes:
#   - `fly postgres attach carsi-db --app "$APP"` sets DATABASE_URL automatically — it is NOT
#     listed here.
#   - Secrets are staged and applied in a single `fly secrets set` call to trigger one redeploy.
#   - Reference: docs/PRODUCTION_DEPLOY.md and docs/FLY_DEPLOYMENT.md.
#
set -euo pipefail

APP="${FLY_APP:-carsi-backend}"

# --- Required secrets ------------------------------------------------------------------------
fly secrets set --app "$APP" \
  JWT_SECRET_KEY="REPLACE_ME" \
  STRIPE_SECRET_KEY="REPLACE_ME" \
  STRIPE_PUBLISHABLE_KEY="REPLACE_ME" \
  STRIPE_WEBHOOK_SECRET="REPLACE_ME" \
  STRIPE_YEARLY_PRICE_ID="REPLACE_ME" \
  ANTHROPIC_API_KEY="REPLACE_ME" \
  REDIS_URL="REPLACE_ME" \
  CORS_ORIGINS="https://carsi.com.au" \
  FRONTEND_URL="https://carsi.com.au" \
  ENVIRONMENT="production" \
  AI_PROVIDER="anthropic"

# --- Optional integrations (uncomment + fill to enable) --------------------------------------
# fly secrets set --app "$APP" \
#   GOOGLE_CLIENT_ID="REPLACE_ME" \
#   GOOGLE_CLIENT_SECRET="REPLACE_ME" \
#   GOOGLE_DRIVE_FOLDER_ID="REPLACE_ME" \
#   SYNTHEX_API_KEY="REPLACE_ME" \
#   UNITE_HUB_API_KEY="REPLACE_ME"

# --- Demo-video production (SYNTHEX marketing assets) -----------------------------------------
# Authoring-time only (npm run video:demo:* / video:brand:*) — not used by the running app.
# Set these only where the videos are produced. See docs/marketing/demo-video-production.md.
# fly secrets set --app "$APP" \
#   HEYGEN_API_KEY="REPLACE_ME" \
#   HEYGEN_AVATAR_ID="REPLACE_ME" \
#   HEYGEN_VOICE_ID="REPLACE_ME" \
#   CLOUDINARY_CLOUD_NAME="REPLACE_ME" \
#   CLOUDINARY_API_KEY="REPLACE_ME" \
#   CLOUDINARY_API_SECRET="REPLACE_ME"

echo "Secrets staged for $APP. Verify with: fly secrets list --app $APP"

#!/usr/bin/env bash
# =============================================================================
# CARSI LMS — Fly.io Secrets Configuration Script
#
# Usage:
#   1. Fill in every REPLACE_ME value below
#   2. Run: bash scripts/fly-secrets.sh
#
# These secrets are encrypted at rest in Fly's Vault and injected as
# environment variables at runtime. Never commit real values here.
# =============================================================================

APP="carsi-backend"

echo "Setting CARSI production secrets on Fly.io app: $APP"
echo "------------------------------------------------------"

fly secrets set \
  --app "$APP" \
  \
  # --- Core Security ---
  JWT_SECRET_KEY="REPLACE_ME_min32chars_generate_with_openssl_rand_hex_32" \
  ENVIRONMENT="production" \
  \
  # --- Database (set automatically by 'fly postgres attach', or manually) ---
  DATABASE_URL="REPLACE_ME_from_fly_postgres_attach" \
  \
  # --- Redis (set automatically by 'fly redis create', or manually) ---
  REDIS_URL="REPLACE_ME_from_fly_redis_create" \
  \
  # --- Stripe Payments ---
  STRIPE_SECRET_KEY="sk_live_REPLACE_ME" \
  STRIPE_WEBHOOK_SECRET="whsec_REPLACE_ME" \
  \
  # --- CORS / Frontend ---
  CORS_ORIGINS='["https://carsi.com.au","https://carsi-web.vercel.app"]' \
  FRONTEND_URL="https://carsi.com.au" \
  \
  # --- Synthex Marketing Automation ---
  SYNTHEX_API_KEY="REPLACE_ME" \
  SYNTHEX_API_URL="https://synthex.unite-group.com.au/api/webhooks/carsi" \
  \
  # --- Unite-Hub Nexus ---
  UNITE_HUB_API_KEY="REPLACE_ME" \
  UNITE_HUB_API_URL="https://api.unite-hub.com/v1/events" \
  \
  # --- Google Drive (course content) ---
  GOOGLE_DRIVE_FOLDER_ID="REPLACE_ME" \
  FEATURE_GOOGLE_DRIVE="true" \
  \
  # --- AI Provider ---
  ANTHROPIC_API_KEY="sk-ant-REPLACE_ME"

echo ""
echo "Done. Verify with: fly secrets list --app $APP"

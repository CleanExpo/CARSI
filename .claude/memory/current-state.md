# Current State

> Updated: 05/03/2026 13:25 AEST

## Active Task

Fly.io backend deployment — COMPLETE ✅

## What Was Completed This Session

- Fly.io backend deployed: https://carsi-backend.fly.dev
- /health → healthy, /ready → database:true, /docs → 200
- All 6 Alembic migrations (001–006) applied to production DB
- Three bugs fixed during live deploy:
  1. Dockerfile: workers 4→1 (OOM on 512MB), CMD uv→.venv direct (permission fix)
  2. Migration 005/004: sa.text() wrapper for server_default (JSONB quoting bug)
  3. database.py: connect_args={"ssl": False} for asyncpg on flycast network

## In-Progress Work

Branch: feature/gamification-subscription-iicrc (3 commits ahead of origin)
Not pushed yet — pending user decision on PR.

## Next Steps

1. Add remaining Fly secrets: STRIPE_SECRET_KEY, ANTHROPIC_API_KEY
2. Create Redis via Fly dashboard (update REDIS_URL secret)
3. Configure custom domain api.carsi.com.au
4. Update Vercel NEXT_PUBLIC_BACKEND_URL to https://api.carsi.com.au
5. Push branch / create PR for the deploy fixes

## Last Updated

05/03/2026 13:25 AEST (manual update)

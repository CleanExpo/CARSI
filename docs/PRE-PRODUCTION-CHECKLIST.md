# CARSI LMS — Pre-Production Checklist

> Generated: 05/03/2026
> Last updated: 05/03/2026

---

## Infrastructure

- [ ] Docker images build successfully (`docker-compose.prod.yml`)
- [ ] Nginx config tested with `nginx -t`
- [ ] SSL certificates installed at `/etc/nginx/ssl/`
- [ ] Kubernetes cluster provisioned and `kubectl` configured
- [ ] All K8s manifests applied (`kubectl apply -f k8s/`)

## Database

- [ ] PostgreSQL running and accessible
- [ ] `alembic upgrade head` completed successfully (5 migrations: 001-005)
- [ ] Seed data loaded (5 IICRC pathways: WRT, CRT, OCT, ASD, CCT)
- [ ] Connection pool configured for production load
- [ ] Database backups configured (automated daily)
- [ ] `init-db.sql` applied for starter framework tables

## Environment Variables — Vercel (Frontend)

- [x] `NEXT_PUBLIC_BACKEND_URL` = `https://api.carsi.com.au`
- [x] `NEXT_PUBLIC_FRONTEND_URL` = `https://carsi.com.au`
- [x] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set
- [x] `STRIPE_SECRET_KEY` set (use LIVE key, not test)
- [x] `STRIPE_WEBHOOK_SECRET` set
- [x] `CRON_SECRET` set
- [x] `WEBHOOK_SECRET` set
- [ ] `NEXT_PUBLIC_API_URL` = `https://api.carsi.com.au`

## Environment Variables — Backend

- [ ] `DATABASE_URL` set to production PostgreSQL
- [ ] `JWT_SECRET_KEY` set (min 48 chars, random)
- [ ] `REDIS_URL` set to production Redis
- [ ] `STRIPE_SECRET_KEY` set (LIVE key)
- [ ] `CORS_ORIGINS` updated to `["https://carsi.com.au", "https://www.carsi.com.au"]`
- [ ] `FEATURE_GOOGLE_DRIVE=true` (if Drive integration enabled)
- [ ] SMTP configured for production email (CEC report emails, notifications)
- [ ] `AI_PROVIDER` set (ollama or anthropic)

## DNS

- [ ] `carsi.com.au` -> Vercel (or K8s ingress)
- [ ] `api.carsi.com.au` -> K8s ingress IP
- [ ] `www.carsi.com.au` -> `carsi.com.au` redirect

## Security

- [ ] `JWT_SECRET_KEY` is unique per environment (not the dev default)
- [ ] All test API keys replaced with live keys
- [ ] `CORS_ORIGINS` contains only production domains
- [ ] Database not accessible from public internet
- [ ] Redis not accessible from public internet
- [ ] Default admin password changed (`admin@local.dev` / `admin123` must be removed)
- [ ] `alembic.ini` hardcoded DB URL does not leak to production (use env override)
- [ ] Stripe webhook signature verification enabled

## Smoke Tests

- [ ] Run: `cd apps/backend && pytest tests/test_smoke.py -v`
- [ ] All checks pass

## Verification

- [ ] `https://carsi.com.au` loads
- [ ] `https://api.carsi.com.au/health` returns `{"status": "healthy"}`
- [ ] Student can log in and enrol in a course
- [ ] Stripe test payment processes correctly
- [ ] IICRC CEC report email sends successfully
- [ ] Course completion triggers certificate generation
- [ ] Gamification XP awards on lesson completion

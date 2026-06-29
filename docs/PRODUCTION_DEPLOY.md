# CARSI LMS Production Deployment Runbook

> **Last Updated**: 06/03/2026
> **Region**: Sydney, Australia (syd)
> **Status**: Backend deployed and healthy

---

## 1. Architecture Overview

```
                    +------------------+
                    |    Cloudflare    |
                    |   (DNS + CDN)    |
                    +--------+---------+
                             |
            +----------------+----------------+
            |                                 |
            v                                 v
   +--------+--------+               +--------+--------+
   |     Vercel      |               |     Fly.io      |
   |   (Frontend)    |               |    (Backend)    |
   |                 |               |                 |
   | carsi.com.au    |    HTTPS      | api.carsi.com.au|
   | Next.js 15      +-------------->| FastAPI         |
   | React 19        |               | Python 3.12     |
   +-----------------+               +--------+--------+
                                              |
                              +---------------+---------------+
                              |                               |
                              v                               v
                     +--------+--------+             +--------+--------+
                     |   Fly Postgres  |             |   Upstash Redis |
                     |    (carsi-db)   |             |  (carsi-redis)  |
                     |                 |             |                 |
                     | PostgreSQL 15   |             | Free tier       |
                     | 3GB storage     |             | 10K req/day     |
                     +-----------------+             +-----------------+
```

### Component Summary

| Component | Service       | URL              | Region       |
| --------- | ------------- | ---------------- | ------------ |
| Frontend  | Vercel        | carsi.com.au     | Global CDN   |
| Backend   | Fly.io        | api.carsi.com.au | syd (Sydney) |
| Database  | Fly Postgres  | Internal         | syd          |
| Cache     | Upstash Redis | Internal         | syd          |
| DNS/CDN   | Cloudflare    | -                | Global       |

---

## 2. Prerequisites

### Required Tools

```bash
# Fly.io CLI
winget install Fly.io.flyctl
fly auth login

# Vercel CLI
npm i -g vercel
vercel login

# Git
git --version  # Must be 2.x+
```

### Required Access

- [ ] Fly.io account with `personal` organisation access
- [ ] Vercel account with `unite-group` team access
- [ ] Google Cloud Console access (for Drive OAuth)
- [ ] Stripe Dashboard access (CARSI account)
- [ ] Cloudflare DNS access (carsi.com.au zone)

### Verify CLI Authentication

```bash
fly auth whoami
vercel whoami
```

---

## 3. Backend Deployment (Fly.io)

### Current Status

```bash
fly status --app carsi-backend
```

**Current deployment:**

- App: `carsi-backend`
- Hostname: `carsi-backend.fly.dev`
- Region: `syd`
- Machine: `shared-cpu-1x` 512MB
- Status: Running (1 machine, health check passing)

### First-Time Setup (already completed)

```bash
# 1. Create the app
cd apps/backend
fly apps create carsi-backend --org personal

# 2. Create Postgres database
fly postgres create \
  --name carsi-db \
  --region syd \
  --initial-cluster-size 1 \
  --vm-size shared-cpu-1x \
  --volume-size 3

# 3. Attach database (auto-sets DATABASE_URL)
fly postgres attach carsi-db --app carsi-backend

# 4. Create Redis
fly redis create \
  --name carsi-redis \
  --region syd \
  --no-replicas

# 5. Get Redis URL
fly redis status carsi-redis
```

### Setting Secrets

**Required secrets (all currently configured):**

| Secret                   | Description                     | Status                            |
| ------------------------ | ------------------------------- | --------------------------------- |
| `DATABASE_URL`           | Postgres connection string      | Auto-set by `fly postgres attach` |
| `JWT_SECRET_KEY`         | JWT signing key (min 48 chars)  | Set                               |
| `STRIPE_SECRET_KEY`      | Stripe API key (sk*live*...)    | Set                               |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key          | Set                               |
| `STRIPE_WEBHOOK_SECRET`  | Stripe webhook signing secret   | Set                               |
| `STRIPE_YEARLY_PRICE_ID` | Stripe price ID for annual plan | Set                               |
| `ANTHROPIC_API_KEY`      | Claude API key                  | Set                               |
| `REDIS_URL`              | Upstash Redis connection string | Set                               |
| `CORS_ORIGINS`           | Allowed frontend origins        | Set                               |
| `FRONTEND_URL`           | Frontend base URL               | Set                               |
| `ENVIRONMENT`            | Environment name                | Set (production)                  |
| `AI_PROVIDER`            | AI provider selection           | Set (anthropic)                   |

**Optional secrets (for future features):**

| Secret                   | Description               | Status  |
| ------------------------ | ------------------------- | ------- |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID    | Not set |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth secret       | Not set |
| `GOOGLE_DRIVE_FOLDER_ID` | Drive folder for content  | Not set |
| `SYNTHEX_API_KEY`        | Synthex marketing webhook | Not set |
| `UNITE_HUB_API_KEY`      | Unite-Hub integration     | Not set |

**Demo-video production secrets (SYNTHEX marketing assets — authoring tool only, not used at runtime):**

These power the demo-screencast / brand-avatar video pipeline (`npm run video:demo:*` /
`video:brand:*`). They are only needed where the videos are produced (a maintainer machine or
a dedicated job), not by the running app. See `docs/marketing/demo-video-production.md`.

| Secret                   | Description                                      | Status  |
| ------------------------ | ------------------------------------------------ | ------- |
| `HEYGEN_API_KEY`         | HeyGen avatar video generation                   | Not set |
| `HEYGEN_AVATAR_ID`       | HeyGen avatar id (avatar mode)                   | Not set |
| `HEYGEN_VOICE_ID`        | HeyGen voice id (avatar mode)                    | Not set |
| `CLOUDINARY_CLOUD_NAME`  | Cloudinary account for video/thumbnail uploads   | Not set |
| `CLOUDINARY_API_KEY`     | Cloudinary API key                               | Not set |
| `CLOUDINARY_API_SECRET`  | Cloudinary API secret                            | Not set |

Optional overrides (have safe defaults, see `.env.example`): `DEMO_RECORD_BASE_URL`,
`DEMO_VIDEO_MAX`, `DEMO_PIP_MARGIN`, `FFMPEG_PATH`, `DEMO_STUDENT_EMAIL`, `DEMO_STUDENT_PASSWORD`.

**Setting a secret:**

```bash
fly secrets set JWT_SECRET_KEY="your-secret-here" --app carsi-backend
```

**Bulk setting secrets:**

```bash
# Edit scripts/fly-secrets.sh with actual values, then:
bash scripts/fly-secrets.sh
```

**Verify secrets:**

```bash
fly secrets list --app carsi-backend
```

### Deploying

The backend uses a multi-stage Docker build with automatic migrations.

```bash
cd apps/backend
fly deploy --app carsi-backend
```

**What happens during deploy:**

1. Docker image builds locally using `Dockerfile`
2. Image pushes to Fly.io registry
3. `release_command` runs: `alembic upgrade head`
4. New machine starts with health check
5. Old machine drains and stops (rolling deployment)

**First deploy:** ~3 minutes
**Subsequent deploys:** ~90 seconds

### Verify Deployment

```bash
# Check status
fly status --app carsi-backend

# View logs
fly logs --app carsi-backend

# Health check
curl https://carsi-backend.fly.dev/health
# Expected: {"status":"healthy","environment":"production"}

# Or via custom domain
curl https://api.carsi.com.au/health
```

### Running Migrations Manually

```bash
# SSH into running machine
fly ssh console --app carsi-backend -C "/app/.venv/bin/alembic -c /app/alembic.ini upgrade head"

# Or view current migration status
fly ssh console --app carsi-backend -C "/app/.venv/bin/alembic -c /app/alembic.ini current"
```

---

## 4. Frontend Deployment (Vercel)

### Current Status

- Project: `carsi-web`
- Project ID: `prj_hIQAdXiHQGGec6nNKEGzn7SyMh9p`
- Team: `unite-group`
- Production URL: `carsi-web.vercel.app`
- Custom domain: `carsi.com.au`

### Environment Variables (Vercel Dashboard)

**Required (all currently set):**

| Variable                             | Value                      | Environment |
| ------------------------------------ | -------------------------- | ----------- |
| `NEXT_PUBLIC_BACKEND_URL`            | `https://api.carsi.com.au` | Production  |
| `NEXT_PUBLIC_FRONTEND_URL`           | `https://carsi.com.au`     | Production  |
| `NEXT_PUBLIC_API_URL`                | `https://api.carsi.com.au` | Production  |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...`              | Production  |
| `STRIPE_SECRET_KEY`                  | `sk_live_...`              | Production  |
| `STRIPE_WEBHOOK_SECRET`              | `whsec_...`                | Production  |
| `CRON_SECRET`                        | (generated)                | Production  |
| `WEBHOOK_SECRET`                     | (generated)                | Production  |

**Setting via CLI:**

```bash
cd apps/web
vercel env add NEXT_PUBLIC_BACKEND_URL
# Enter value when prompted
```

**Setting via Dashboard:**

1. Go to https://vercel.com/unite-group/carsi-web
2. Settings > Environment Variables
3. Add/edit variable
4. Select "Production" environment
5. Save

### Deploying

**Automatic (recommended):**

Push to `main` branch triggers automatic deployment via Vercel Git integration.

```bash
git push origin main
```

**Manual:**

```bash
cd apps/web
vercel --prod
```

### Verify Deployment

```bash
# Check Vercel status
vercel ls

# Test frontend
curl -I https://carsi.com.au

# Test API connection from frontend
curl https://carsi.com.au/api/health
```

---

## 5. Google Drive OAuth Setup

Google Drive integration enables course content storage (PDFs, videos).

### Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select project (e.g., `carsi-lms`)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application**
6. Configure:
   - Name: `CARSI LMS Production`
   - Authorized JavaScript origins:
     - `https://carsi.com.au`
     - `https://api.carsi.com.au`
   - Authorized redirect URIs:
     - `https://api.carsi.com.au/api/auth/google/callback`
     - `https://carsi.com.au/auth/callback`
7. Click **Create**
8. Copy **Client ID** and **Client Secret**

### Step 2: Enable Drive API

1. Navigate to **APIs & Services > Library**
2. Search for "Google Drive API"
3. Click **Enable**

### Step 3: Create Drive Folder

1. Go to [Google Drive](https://drive.google.com/)
2. Create folder: `CARSI-LMS-Content`
3. Copy folder ID from URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`

### Step 4: Set Secrets

```bash
fly secrets set \
  GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com" \
  GOOGLE_CLIENT_SECRET="your-client-secret" \
  GOOGLE_DRIVE_FOLDER_ID="your-folder-id" \
  FEATURE_GOOGLE_DRIVE="true" \
  --app carsi-backend
```

### Step 5: Verify

```bash
# Check Drive integration status
curl https://api.carsi.com.au/api/lms/drive/status
```

---

## 6. Stripe Configuration

### Current Configuration

- Account: CARSI (`acct_1T74VNDOMULuvIJb`)
- Mode: **TEST** (switch to LIVE before launch)
- Product: CARSI Pro Annual Subscription
- Price: $795.00 AUD/year
- Trial: 7 days

### Switching from Test to Live

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Toggle **View test data** OFF (top right)
3. Navigate to **Developers > API keys**
4. Copy **Live** publishable key and secret key

**Update Fly.io secrets:**

```bash
fly secrets set \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_PUBLISHABLE_KEY="pk_live_..." \
  --app carsi-backend
```

**Update Vercel env vars:**

```bash
cd apps/web
vercel env rm STRIPE_SECRET_KEY production
vercel env add STRIPE_SECRET_KEY
# Enter live key value

vercel env rm NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Enter live key value
```

### Webhook Configuration

**Current endpoint:**

- URL: `https://carsi-backend.fly.dev/api/webhooks/stripe`
- Events: Full event set (231 events)
- Secret: `whsec_...` (retrieve from the Stripe Dashboard → Developers → Webhooks → your endpoint → "Signing secret"; store in the `STRIPE_WEBHOOK_SECRET` env var — never commit the real value)

**To create new webhook (if needed):**

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Enter URL: `https://api.carsi.com.au/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy signing secret and update Fly.io:

```bash
fly secrets set STRIPE_WEBHOOK_SECRET="whsec_..." --app carsi-backend
```

### Verify Webhook

```bash
# Stripe CLI test
stripe listen --forward-to localhost:8000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

---

## 7. Custom Domain Setup

### Vercel (carsi.com.au)

**Current status:** Configured and working

**If reconfiguration needed:**

1. Go to Vercel Dashboard > carsi-web > Settings > Domains
2. Add `carsi.com.au`
3. Add CNAME record in Cloudflare:
   - Type: `CNAME`
   - Name: `@`
   - Target: `cname.vercel-dns.com`
4. Add `www.carsi.com.au` with redirect to apex

### Fly.io (api.carsi.com.au)

**Current status:** Certificate not yet verified

**Step 1: Verify IPs are allocated**

```bash
fly ips list --app carsi-backend
```

Current IPs:

- IPv4: `66.241.124.60` (shared)
- IPv6: `2a09:8280:1::dc:bda5:0` (dedicated)

**Step 2: Add DNS records in Cloudflare**

| Type   | Name  | Target                   | Proxy                 |
| ------ | ----- | ------------------------ | --------------------- |
| `A`    | `api` | `66.241.124.60`          | DNS only (grey cloud) |
| `AAAA` | `api` | `2a09:8280:1::dc:bda5:0` | DNS only (grey cloud) |

**Important:** Disable Cloudflare proxy (orange cloud) for Fly.io - use DNS only mode.

**Step 3: Create/verify certificate**

```bash
fly certs create api.carsi.com.au --app carsi-backend
fly certs show api.carsi.com.au --app carsi-backend
```

**Step 4: Wait for DNS propagation (2-10 minutes)**

```bash
# Check DNS resolution
nslookup api.carsi.com.au

# Verify HTTPS works
curl https://api.carsi.com.au/health
```

---

## 8. Monitoring & Logs

### Real-Time Logs

```bash
# All logs
fly logs --app carsi-backend

# Follow mode (tail)
fly logs --app carsi-backend -f

# Filter by log level
fly logs --app carsi-backend | grep -i error
```

### Dashboard

```bash
fly dashboard --app carsi-backend
```

Opens Fly.io web dashboard with:

- Machine metrics (CPU, memory)
- Network traffic
- Request logs
- Deployment history

### Health Checks

The backend has a `/health` endpoint checked every 30 seconds:

```bash
# Manual check
curl https://api.carsi.com.au/health

# Expected response
{"status":"healthy","environment":"production"}
```

### Database Monitoring

```bash
# Connect to Postgres
fly postgres connect --app carsi-db

# View connection count
SELECT count(*) FROM pg_stat_activity;

# View database size
SELECT pg_size_pretty(pg_database_size('carsi_db'));
```

### Vercel Logs

```bash
vercel logs --app=carsi-web
```

Or via dashboard: https://vercel.com/unite-group/carsi-web/logs

---

## 9. Troubleshooting

### Backend Issues

| Issue                       | Diagnosis              | Fix                                         |
| --------------------------- | ---------------------- | ------------------------------------------- |
| 502 Bad Gateway             | Machine starting       | Wait 30s, check `fly logs`                  |
| Health check failing        | App crashing           | `fly logs`, check for Python errors         |
| Database connection refused | Postgres down          | `fly status --app carsi-db`                 |
| CORS errors                 | Origin not whitelisted | Update `CORS_ORIGINS` secret                |
| Alembic migration fails     | Schema conflict        | SSH in, check `alembic current`             |
| Memory exceeded             | 512MB limit hit        | `fly scale memory 1024 --app carsi-backend` |

**Restart machine:**

```bash
fly apps restart carsi-backend
```

**SSH into machine:**

```bash
fly ssh console --app carsi-backend
```

**View machine info:**

```bash
fly machine list --app carsi-backend
fly machine status <machine-id> --app carsi-backend
```

### Frontend Issues

| Issue              | Diagnosis         | Fix                                         |
| ------------------ | ----------------- | ------------------------------------------- |
| API calls failing  | Backend URL wrong | Check `NEXT_PUBLIC_BACKEND_URL`             |
| Blank page         | Build error       | Check Vercel deployment logs                |
| 404 on routes      | Routing issue     | Check `next.config.js` rewrites             |
| Stripe not loading | Key mismatch      | Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |

**Redeploy:**

```bash
cd apps/web
vercel --prod --force
```

### Database Issues

| Issue              | Diagnosis           | Fix                                            |
| ------------------ | ------------------- | ---------------------------------------------- |
| Connection timeout | Postgres overloaded | Check `fly status --app carsi-db`              |
| Migration stuck    | Lock held           | `fly postgres connect`, kill stuck connections |
| Disk full          | 3GB limit           | `fly volumes extend <vol-id> -s 10`            |

**View Postgres logs:**

```bash
fly logs --app carsi-db
```

**Restart Postgres:**

```bash
fly apps restart carsi-db
```

### Common Error Messages

**`DATABASE_URL not set`**

```bash
fly postgres attach carsi-db --app carsi-backend
```

**`CORS policy: No 'Access-Control-Allow-Origin'`**

```bash
fly secrets set CORS_ORIGINS='["https://carsi.com.au","https://carsi-web.vercel.app"]' --app carsi-backend
```

**`Alembic: Can't locate revision`**

```bash
fly ssh console --app carsi-backend -C "/app/.venv/bin/alembic -c /app/alembic.ini stamp head"
fly deploy --app carsi-backend
```

**`Stripe webhook signature verification failed`**

- Verify `STRIPE_WEBHOOK_SECRET` matches webhook endpoint in Stripe Dashboard
- Check webhook is pointing to correct URL

---

## 10. Scaling

### Backend (Fly.io)

**Scale memory:**

```bash
fly scale memory 1024 --app carsi-backend
```

**Scale machines:**

```bash
fly scale count 2 --app carsi-backend
```

**Current machine spec:**

- CPU: shared-cpu-1x
- Memory: 512MB
- Workers: 1

**Recommended for production load:**

- CPU: shared-cpu-2x
- Memory: 1024MB
- Workers: 2
- Machines: 2 (for redundancy)

### Database (Fly Postgres)

**Scale volume:**

```bash
fly volumes list --app carsi-db
fly volumes extend <vol-id> -s 10 --app carsi-db
```

**Scale compute:**

```bash
fly scale vm shared-cpu-2x --app carsi-db
fly scale memory 2048 --app carsi-db
```

---

## 11. Rollback Procedures

### Backend Rollback

**List recent deployments:**

```bash
fly releases --app carsi-backend
```

**Rollback to previous version:**

```bash
fly deploy --image <previous-image-ref> --app carsi-backend
```

### Frontend Rollback

**Via Vercel Dashboard:**

1. Go to Deployments tab
2. Find previous successful deployment
3. Click three dots > Promote to Production

**Via CLI:**

```bash
vercel rollback
```

### Database Rollback

**Alembic downgrade:**

```bash
fly ssh console --app carsi-backend -C "/app/.venv/bin/alembic -c /app/alembic.ini downgrade -1"
```

**Warning:** Data migrations may not be reversible. Always backup first.

---

## 12. Backup & Recovery

### Database Backup

**Manual snapshot:**

```bash
fly postgres backup create --app carsi-db
fly postgres backup list --app carsi-db
```

**Export data:**

```bash
fly postgres connect --app carsi-db
pg_dump carsi_db > backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
fly postgres backup restore <backup-id> --app carsi-db
```

---

## 13. Cost Summary

| Service      | Spec                           | Monthly Cost (AUD) |
| ------------ | ------------------------------ | ------------------ |
| Fly Machine  | shared-cpu-1x 512MB            | ~$6.00             |
| Fly Postgres | shared-cpu-1x 1GB, 3GB storage | ~$3.00             |
| Fly Redis    | Upstash free tier              | $0                 |
| Vercel       | Hobby plan                     | $0                 |
| Cloudflare   | Free plan                      | $0                 |
| **Total**    |                                | **~$9.00/month**   |

---

## 14. Deployment Checklist

### Pre-Deployment

- [ ] All tests passing locally (`pnpm turbo run test`)
- [ ] Type check passing (`pnpm turbo run type-check`)
- [ ] Lint passing (`pnpm turbo run lint`)
- [ ] Environment variables verified
- [ ] Database migrations tested locally

### Backend Deployment

```bash
cd apps/backend
fly deploy --app carsi-backend
fly status --app carsi-backend
curl https://api.carsi.com.au/health
```

### Frontend Deployment

```bash
cd apps/web
git push origin main
# Or: vercel --prod
```

### Post-Deployment

- [ ] Health check passing
- [ ] Login flow working
- [ ] Stripe checkout working
- [ ] Course enrollment working
- [ ] No errors in logs

---

## 15. Emergency Contacts

| Role           | Contact                  | Escalation               |
| -------------- | ------------------------ | ------------------------ |
| Fly.io Support | community.fly.io         | Critical: support@fly.io |
| Vercel Support | vercel.com/help          | Critical: via dashboard  |
| Stripe Support | stripe.com/support       | Critical: via dashboard  |
| Google Cloud   | cloud.google.com/support | Via console              |

---

_Runbook version 1.0 - Generated 06/03/2026_

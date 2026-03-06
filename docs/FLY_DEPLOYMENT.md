# CARSI LMS — Fly.io Backend Deployment

> Region: `syd` (Sydney) | Machine: `shared-cpu-1x` 512MB | ~$7 AUD/month

---

## Prerequisites

Install Fly CLI (Windows PowerShell):

```powershell
# Option A — winget
winget install Fly.io.flyctl

# Option B — PowerShell installer
iwr https://fly.io/install.ps1 -useb | iex
```

Then authenticate:

```bash
fly auth login
```

---

## One-Time Setup (~15 minutes)

### Step 1 — Create the app

```bash
cd C:\CARSI\apps\backend

# Register the app with Fly (no deploy yet)
fly apps create carsi-backend --org personal
```

### Step 2 — Create Postgres database

```bash
# Creates a Fly-managed Postgres instance in Sydney
fly postgres create \
  --name carsi-db \
  --region syd \
  --initial-cluster-size 1 \
  --vm-size shared-cpu-1x \
  --volume-size 3

# Attach to app — automatically sets DATABASE_URL secret
fly postgres attach carsi-db --app carsi-backend
```

> **Note:** `fly postgres attach` sets `DATABASE_URL` as a secret automatically.
> You do NOT need to add it manually to `fly-secrets.sh`.

### Step 3 — Create Redis

```bash
# Upstash Redis via Fly (free tier — 10K req/day)
fly redis create \
  --name carsi-redis \
  --region syd \
  --no-replicas

# Get the Redis URL
fly redis status carsi-redis
```

Copy the `Private URL` (starts with `redis://`) — add it as `REDIS_URL` in secrets.

### Step 4 — Set all secrets

Edit `scripts/fly-secrets.sh`, replace every `REPLACE_ME` value, then:

```bash
# From repo root
bash scripts/fly-secrets.sh
```

Verify:

```bash
fly secrets list --app carsi-backend
```

You should see ~12 secrets listed (values hidden).

### Step 5 — Run database migrations

```bash
# SSH into a one-off machine and run Alembic
fly ssh console --app carsi-backend -C "uv run alembic upgrade head"
```

> If the app isn't deployed yet, use a one-off runner:
>
> ```bash
> fly run --app carsi-backend \
>   --image ghcr.io/carsi-lms/backend:latest \
>   "uv run alembic upgrade head"
> ```

### Step 6 — Deploy

```bash
cd C:\CARSI\apps\backend

fly deploy --app carsi-backend
```

Fly builds the Docker image locally, pushes it to the Fly registry, and deploys.
First deploy takes ~3 minutes. Subsequent deploys ~90 seconds.

### Step 7 — Verify

```bash
# Check status
fly status --app carsi-backend

# View logs
fly logs --app carsi-backend

# Health check
curl https://carsi-backend.fly.dev/health
```

Expected response:

```json
{ "status": "healthy", "environment": "production" }
```

---

## Custom Domain (api.carsi.com.au)

### Step 1 — Allocate a dedicated IP

```bash
fly ips allocate-v4 --app carsi-backend
fly ips allocate-v6 --app carsi-backend
fly ips list --app carsi-backend
```

### Step 2 — Add DNS records (Cloudflare / your DNS provider)

| Type   | Name  | Value               |
| ------ | ----- | ------------------- |
| `A`    | `api` | `<IPv4 from above>` |
| `AAAA` | `api` | `<IPv6 from above>` |

### Step 3 — Add certificate

```bash
fly certs create api.carsi.com.au --app carsi-backend
fly certs show api.carsi.com.au --app carsi-backend
```

Fly provisions a Let's Encrypt cert automatically. DNS propagation takes 2–10 minutes.

---

## Vercel → Fly.io Connection

Once `api.carsi.com.au` is live, update Vercel env vars:

```
NEXT_PUBLIC_BACKEND_URL = https://api.carsi.com.au
NEXT_PUBLIC_API_URL     = https://api.carsi.com.au
```

In Vercel dashboard: Settings → Environment Variables → Production.

---

## Ongoing Deploys

```bash
# Redeploy after code changes
cd apps/backend && fly deploy

# Scale up if needed
fly scale memory 1024 --app carsi-backend

# View machine metrics
fly dashboard --app carsi-backend
```

---

## Estimated Monthly Cost (AUD)

| Service         | Spec                               | Cost             |
| --------------- | ---------------------------------- | ---------------- |
| Fly Machine     | shared-cpu-1x 512MB, always-on     | ~$3.83           |
| Fly Postgres    | shared-cpu-1x 1GB RAM, 3GB storage | ~$2.00           |
| Fly Redis       | Upstash free tier                  | $0               |
| Outbound egress | ~10GB/month estimated              | ~$1.00           |
| **Total**       |                                    | **~$6.83/month** |

> Prices in USD × ~1.55 AUD exchange rate. Check https://fly.io/docs/about/pricing/ for current rates.

---

## Connecting to Synthex + Unite-Hub

Both connectors use fire-and-forget HTTP calls already configured in:

- `apps/backend/src/services/synthex_connector.py`
- `apps/backend/src/services/nexus_connector.py`

Once `SYNTHEX_API_KEY` and `UNITE_HUB_API_KEY` secrets are set,
those connections activate automatically on events (enrolments, completions, subscriptions).

---

## Troubleshooting

| Issue                   | Fix                                                                    |
| ----------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL` not set  | Run `fly postgres attach carsi-db --app carsi-backend`                 |
| Build fails             | Check `fly logs --app carsi-backend` — usually missing `uv.lock`       |
| 502 on health check     | Machine starting — wait 30s, then `fly logs`                           |
| Alembic migration fails | Check `DATABASE_URL` format: must be `postgresql://` not `postgres://` |
| CORS errors from Vercel | Ensure `CORS_ORIGINS` secret includes `https://carsi.com.au`           |

# DigitalOcean Deployment (CARSI)

> CARSI runs on **DigitalOcean App Platform**, configured by [`app.yaml`](../app.yaml) at the
> repo root. This is the canonical production deployment.
>
> The `docs/FLY_DEPLOYMENT.md` and the Fly bits of `docs/PRODUCTION_DEPLOY.md` describe a
> **legacy Fly.io target that is not in use** — prefer this document.

## How it deploys

- **Platform:** DigitalOcean App Platform, app name `carsi`, region `blr`.
- **Build:** Docker — `Dockerfile` at the repo root (`dockerfile_path: Dockerfile`).
- **Runtime:** one service `carsi` listening on **port 8080** (`http_port` / `PORT=8080`).
- **Scale:** `instance_count: 2`, `instance_size_slug: apps-s-1vcpu-1gb`.
- **Auto-deploy:** every push to **`main`** redeploys (`deploy_on_push: true`).
- **Health check:** `GET /api/health` (30s initial delay, 10s period, 3 failures → unhealthy).
- **Alerts:** `DEPLOYMENT_FAILED`, `DOMAIN_FAILED`.

## Environment variables / secrets

Defined under `services[0].envs` in `app.yaml`. Set the **values** in the DigitalOcean
dashboard (App → Settings → App-Level Environment Variables) or via `doctl`; `app.yaml` only
declares the keys and their scope. Secrets should be marked **Encrypted** in the dashboard.

| Key | Scope | Notes |
| --- | --- | --- |
| `NODE_ENV` | run | `production` |
| `PORT` | run | `8080` (must match `http_port`) |
| `DATABASE_URL` | run+build | Postgres connection string |
| `DATABASE_CA_CERT` | run+build | Managed-DB CA cert (PEM) |
| `JWT_SECRET` | run | Auth signing key — **canonical name is `JWT_SECRET`** (not `JWT_SECRET_KEY`) |
| `STRIPE_SECRET_KEY` | run+build | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | run | Stripe webhook signing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | run+build | Stripe publishable |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | run | Admin bootstrap |
| `NEXT_PUBLIC_ADMIN_EMAIL` | run+build | Admin email (client) |
| `OPENAI_API_KEY` | run | LMS AI features |
| `NEXT_PUBLIC_FRONTEND_URL` / `NEXT_PUBLIC_APP_URL` | run+build | Public base URLs |

> The demo-video production secrets (`HEYGEN_*`, `CLOUDINARY_*`) are **authoring-time only** and
> are intentionally **not** in `app.yaml` — they are never used by the running app. See
> `docs/marketing/demo-video-production.md`.

## Common operations

```bash
# Inspect / edit the app spec
doctl apps list
doctl apps spec get <APP_ID>

# Apply a changed app.yaml
doctl apps update <APP_ID> --spec app.yaml

# Tail runtime logs
doctl apps logs <APP_ID> --type run --follow

# Trigger a manual deploy (normally automatic on push to main)
doctl apps create-deployment <APP_ID>
```

## Notes

- A push to `main` is a production deploy — gate merges on green CI.
- `Dockerfile` must expose and listen on `8080`; `app.yaml` health check hits `/api/health`,
  so that route must return 200 once the server is up.
- Frontend preview deploys (the `carsi-web` Vercel checks on PRs) are **separate** from this
  production App Platform deployment and are used for review only.

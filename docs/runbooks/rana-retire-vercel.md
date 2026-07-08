# Runbook — Retire Vercel carsi-web deployment (#293 / GP-449)

**Audience:** Rana (Technical Lead)
**Goal:** Ensure **DigitalOcean `monkfish-app`** is the sole production path; no stale traffic on Vercel.

## Preconditions

- `carsi.com.au` DNS points to DigitalOcean App Platform (not Vercel).
- Production deploys and webhooks use DO env vars (`DATABASE_URL`, `STRIPE_*`, etc.).

## Steps

1. **Vercel dashboard** → project `carsi-web` → **Settings → Domains** — remove `carsi.com.au` and any `www` alias if still attached.
2. **Disable auto-deploy** on the Vercel project (or delete the Git integration) so pushes to `main` do not deploy to Vercel.
3. **Optional:** Archive or delete the Vercel project after 48h with zero traffic in Vercel analytics.
4. **Verify:** `curl -sI https://carsi.com.au` shows DO/App Platform headers; `npm run verify:professional-directory` passes against production.

## Note

Do not delete Vercel env secrets until DO production is confirmed healthy for 24h.

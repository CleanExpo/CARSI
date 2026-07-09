# Runbook — Rotate carsi-db credentials (#289 / GP-449)

**Audience:** Rana (Technical Lead)
**Goal:** Rotate the DigitalOcean managed Postgres `doadmin` password without downtime.

## Steps

1. **DigitalOcean** → Databases → `carsi-db` → **Users & Databases** → reset `doadmin` password. Copy the new connection string.
2. **DigitalOcean App Platform** → `monkfish-app` → **Settings → Environment Variables** → update `DATABASE_URL` with the new password (preserve `sslmode` and any `DATABASE_CA_CERT` base64 cert).
3. **Redeploy** the app (env change triggers redeploy). Confirm `GET /api/health` returns OK.
4. **Verify migrations:** PRE_DEPLOY `prisma migrate deploy` should succeed in deploy logs.
5. **Smoke test:** sign in, open student dashboard, submit a test contact form.
6. **Revoke old credential:** in DO database panel, confirm only the new password works; delete any saved copies of the old URL from password managers shared with agents.

## Rollback

If the new URL fails, restore the previous `DATABASE_URL` from DO env history and redeploy.

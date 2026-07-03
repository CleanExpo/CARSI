# Admin Auth Migration — RA-3027

This document captures the rollout sequence for the `admin_users` table
introduced in [RA-3027](https://linear.app/unite-group/issue/RA-3027).
The migration is **backwards-compatible by design** — the env-var
single-admin login path stays active until at least one row exists in
`admin_users`.

## State before this PR

- `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars define the only admin
- `app/api/admin/login/route.ts` does plaintext string comparison
- No rate limit, no audit trail, no per-admin role

## State after this PR (env-var bootstrap mode)

- `admin_users` table exists but is empty
- Login route tries DB lookup first, sees empty table → falls back to
  env-var path (with constant-time compare now)
- Rate limit: 10 attempts / 15 min per IP
- Structured audit log via `console.log` (JSON lines) on every login
  success / failure

## State after running `scripts/admin-bootstrap.ts`

- `admin_users` has exactly one row with `ADMIN_EMAIL` + bcrypt-hashed
  `ADMIN_PASSWORD`
- Login route detects `admin_users.count() > 0` → env-var path is
  **locked out** (any login attempt now goes through bcrypt verify
  against the table)
- `lastLoginAt` / `lastLoginIp` updated on each successful login

## Rollout sequence (operator)

```bash
# 1. Apply the migration
pnpm prisma migrate deploy

# 2. Bootstrap the first admin from the existing env vars
pnpm db:admin-bootstrap   # alias for: npx tsx scripts/admin-bootstrap.ts

# 3. Test admin login via the UI (should still work — same creds)

# 4. Optional: add more admins (script not yet written — separate ticket)

# 5. Once happy, remove ADMIN_EMAIL + ADMIN_PASSWORD env vars from prod
#    (the table is now the source of truth; env vars are inert).
```

## Rollback

If anything goes wrong after step 2:

```bash
# Delete the bootstrapped row — falls back to env-var path
psql $DATABASE_URL -c "DELETE FROM admin_users;"
```

The migration itself (CREATE TABLE) does not need to be rolled back —
an empty table is functionally identical to its absence (the login
route handles both cases).

## Deferred (RA-3027 follow-ups)

The original ticket calls out these as separable follow-ups:

- TOTP MFA on admin login (`otpauth` library)
- Dedicated `admin_audit_log` table (currently console-logged only)
- Self-serve password rotation flow
- Per-admin role enforcement on individual admin endpoints
- Rotate `ADMIN_JWT_SECRET` after table migration completes

-- RA-3027 — Admin users table.
--
-- Replaces the single ADMIN_EMAIL+ADMIN_PASSWORD env-var gate for the
-- CARSI admin surface with a proper Postgres-backed table:
--   * Multiple admins
--   * Per-admin bcryptjs password hash (matches the LmsUser pattern)
--   * Per-admin role for future RBAC
--   * lastLoginAt + lastLoginIp for audit-trail bootstrapping
--
-- Backwards-compatible by design — the env-var login path in
-- `app/api/admin/login/route.ts` remains active until the table has at
-- least one row. See `docs/ADMIN_AUTH_MIGRATION.md` for rollout steps.

CREATE TABLE "admin_users" (
    "id"             UUID         NOT NULL,
    "email"          TEXT         NOT NULL,
    "password_hash"  TEXT         NOT NULL,
    "role"           TEXT         NOT NULL DEFAULT 'admin',
    "is_active"      BOOLEAN      NOT NULL DEFAULT TRUE,
    "last_login_at"  TIMESTAMPTZ(6),
    "last_login_ip"  TEXT,
    "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

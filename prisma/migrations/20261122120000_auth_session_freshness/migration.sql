-- GP-760: session freshness and durable auth rate limits. Additive only: one
-- nullable column and one new table. Rolling back the code leaves both unused.

-- Sessions issued before this second (Unix epoch seconds, the unit of a JWT
-- "iat") are no longer accepted, nor are reset links issued at or before it. A
-- successful password reset sets it to the reset second, which ends every other
-- session and makes the reset link single-use. NULL = no cut-off. Whole seconds,
-- not a timestamp, so no time zone conversion can shift it.
ALTER TABLE "lms_users"
  ADD COLUMN "sessions_valid_after_sec" BIGINT;

-- Fixed-window counters for the auth endpoints, shared by every instance and
-- kept across deploys. The key is a SHA-256 of "<bucket>:<ip or email>", so no
-- address or email is stored in clear.
CREATE TABLE "auth_rate_limits" (
  "key"      VARCHAR(64) NOT NULL,
  "count"    INTEGER NOT NULL,
  "reset_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "idx_auth_rate_limits_reset_at" ON "auth_rate_limits" ("reset_at");

-- GP-760: session freshness and durable auth rate limits. Additive only: one
-- column with a default and one new table. Rolling back the code leaves both unused.

-- A per-user session generation. Every session token and every reset link carries
-- the generation it was issued under; only the current one is accepted. A
-- successful password reset adds one in the same UPDATE that spends the link, so
-- every earlier session and every earlier link ends at once, while a session or
-- link issued after the reset (even in the same clock second) carries the new
-- generation and works. Existing rows and tokens issued before this change are
-- generation 0, so nobody is signed out by the deploy.
ALTER TABLE "lms_users"
  ADD COLUMN "session_generation" INTEGER NOT NULL DEFAULT 0;

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

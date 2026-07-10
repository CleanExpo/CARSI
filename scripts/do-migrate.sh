#!/usr/bin/env bash
# DigitalOcean App Platform PRE_DEPLOY job: apply pending Prisma migrations to the live database.
# Uses the app's own DATABASE_URL + DATABASE_CA_CERT (the direct connection the app already uses),
# so it always targets the correct production database. Idempotent (applies pending only); a failure
# blocks the deploy, which is the desired safety behaviour.
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set — cannot migrate." >&2
  exit 1
fi

# Match the app's SSL handling (src/lib/prisma.ts): normalise sslmode to verify-full and, when
# DATABASE_CA_CERT is present, write it to a file and reference it via sslrootcert.
RESOLVED_URL="$(node -e '
  const fs = require("fs");
  let url = (process.env.DATABASE_URL || "").trim();
  try {
    const u = new URL(url);
    const m = u.searchParams.get("sslmode");
    if (["require", "prefer", "verify-ca"].includes(m)) {
      u.searchParams.set("sslmode", "verify-full");
      url = u.toString();
    }
  } catch (_e) { /* leave url as-is if unparseable */ }
  const ca = (process.env.DATABASE_CA_CERT || "").trim();
  if (ca) {
    const p = "/tmp/pg-ca.crt";
    fs.writeFileSync(p, Buffer.from(ca, "base64").toString("utf8"), { mode: 0o600 });
    url += (url.includes("?") ? "&" : "?") + "sslrootcert=" + encodeURIComponent(p);
  }
  process.stdout.write(url);
')"
export DATABASE_URL="$RESOLVED_URL"

echo "Applying pending Prisma migrations to the production database…"
npx prisma migrate deploy
echo "Migrations up to date."

# Deploy-time course seeding is DISABLED BY DEFAULT (data-safety incident 2026-07-10).
#
# The upsert seeders below rewrite live course rows to match the repo's
# data/seed/courses-catalog.json — which OVERWRITES manually-curated production course
# content (uploaded via the live app over ~a week). The LIVE DATABASE is the source of
# truth for course content, NOT the repo JSON. Running these on every deploy silently
# clobbers that data.
#
# Migrations above (prisma migrate deploy) are schema-only and always run. Content seeding
# only runs when an operator explicitly opts in for a controlled, reviewed re-seed by
# setting SEED_ON_DEPLOY=true — and even then, only against a database whose course content
# is known to be repo-authored.
if [ "${SEED_ON_DEPLOY:-false}" = "true" ]; then
  echo "SEED_ON_DEPLOY=true — running deploy-time content seed (this OVERWRITES live course data)…"
  echo "Seeding course catalog…"
  npx tsx scripts/seed-courses-catalog.ts
  echo "Seeding course quizzes…"
  npx tsx scripts/seed-all-quizzes.ts
  echo "Seeding CCW-CARSI truckmount practical assessment…"
  npx tsx scripts/seed-ccw-truckmount-assessment.ts || echo "WARN: truckmount assessment seed failed (non-blocking)"
  echo "Content seed complete."
else
  echo "SEED_ON_DEPLOY not set — skipping deploy-time course seeding (live DB is the source of truth)."
fi

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

# Deploy-time content convergence (GP-482/GP-484): the runtime image is a pure Next standalone
# server, so the course catalog + quizzes seed here, where the real DATABASE_URL lives.
# A catalog-seed failure blocks the deploy (set -e) — the old release keeps serving, and the
# failure is visible in the deploy log. The quiz seeder is internally fault-tolerant (exit 0).
echo "Seeding course catalog…"
npx tsx scripts/seed-courses-catalog.ts
echo "Seeding course quizzes…"
npx tsx scripts/seed-all-quizzes.ts
echo "Content seed complete."

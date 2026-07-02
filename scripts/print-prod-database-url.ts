/**
 * Print the fully-resolved production Postgres connection string (sslmode=verify-full +
 * DATABASE_CA_CERT written to a temp file + referenced via sslrootcert) on stdout.
 *
 * Used by the production migration runner so `prisma migrate deploy` connects to the managed
 * database exactly like the app does. Run AFTER the production `.env` is present (e.g. pulled
 * from Vercel), so DATABASE_URL + DATABASE_CA_CERT are set:
 *
 *   export DATABASE_URL="$(npx tsx scripts/print-prod-database-url.ts)"
 *   npx prisma migrate deploy
 */
import 'dotenv/config';

/**
 * Prisma's migrate engine needs a DIRECT (non-pooler) connection — Supabase's transaction/session
 * pooler rejects it (`P1000` auth / unsupported). Prefer an explicit direct URL when the prod env
 * provides one; fall back to DATABASE_URL. Supabase exposes the direct string as DIRECT_URL.
 */
const directUrl =
  process.env.DIRECT_URL?.trim() ||
  process.env.DIRECT_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.MIGRATE_DATABASE_URL?.trim();

if (directUrl) {
  // resolvePrismaDatabaseUrl reads process.env.DATABASE_URL — point it at the direct URL.
  process.env.DATABASE_URL = directUrl;
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error('No database URL set (did the production .env get pulled?)');
  process.exit(1);
}

// Imported after DATABASE_URL is finalised (module resolves the connection string at load).
const { resolvePrismaDatabaseUrl } = await import('../src/lib/prisma');
process.stdout.write(resolvePrismaDatabaseUrl());

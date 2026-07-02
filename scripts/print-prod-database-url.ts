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

import { resolvePrismaDatabaseUrl } from '../src/lib/prisma';

if (!process.env.DATABASE_URL?.trim()) {
  console.error('DATABASE_URL is not set (did the production .env get pulled?)');
  process.exit(1);
}

process.stdout.write(resolvePrismaDatabaseUrl());

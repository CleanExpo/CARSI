import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Same idea as `prisma.config.ts`: valid for client init when `DATABASE_URL` is not injected yet (e.g. `next build` on a host). */
const PRISMA_CLIENT_PLACEHOLDER_URL =
  'postgresql://prisma:prisma@127.0.0.1:5432/prisma_generate_only?schema=public';

let cachedCaPath: string | undefined;

export function normalizePostgresSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      return connectionString;
    }
    const sslMode = url.searchParams.get('sslmode');
    if (sslMode === 'require' || sslMode === 'prefer' || sslMode === 'verify-ca') {
      url.searchParams.set('sslmode', 'verify-full');
      return url.toString();
    }
    return connectionString;
  } catch {
    return connectionString;
  }
}

/**
 * Connection string for PrismaPg. Does not mutate `process.env.DATABASE_URL`.
 * When DATABASE_URL is unset (CI/build), uses a placeholder so the module can load; real
 * requests must still have DATABASE_URL set for DB access.
 */
function getConnectionStringForAdapter(): string {
  const base = process.env.DATABASE_URL?.trim();
  if (!base) {
    return PRISMA_CLIENT_PLACEHOLDER_URL;
  }

  const connectionString = normalizePostgresSslMode(base);

  const b64 = process.env.DATABASE_CA_CERT?.trim();
  if (!b64) {
    return connectionString;
  }

  if (!cachedCaPath) {
    const certPath = join(tmpdir(), `carsi-pg-ca-${randomUUID()}.crt`);
    const pem = Buffer.from(b64, 'base64').toString('utf8');
    writeFileSync(certPath, pem, { mode: 0o600 });
    cachedCaPath = certPath;
  }

  const sep = connectionString.includes('?') ? '&' : '?';
  return `${connectionString}${sep}sslrootcert=${encodeURIComponent(cachedCaPath)}`;
}

/**
 * The fully-resolved Postgres connection string the app uses — sslmode normalised to
 * `verify-full` and `DATABASE_CA_CERT` (base64) written to a temp file + referenced via
 * `sslrootcert`. Exported so out-of-band tooling (e.g. the production migration runner) connects
 * to the managed database identically to the app. Does not mutate `process.env`.
 */
export function resolvePrismaDatabaseUrl(): string {
  return getConnectionStringForAdapter();
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: getConnectionStringForAdapter() });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function clientHasTeamCoursePurchases(client: PrismaClient): boolean {
  return Boolean(
    (client as PrismaClient & { lmsTeamCoursePurchase?: { findMany?: unknown } })
      .lmsTeamCoursePurchase?.findMany,
  );
}

function clientHasRenewalCommunications(client: PrismaClient): boolean {
  return Boolean(
    (client as PrismaClient & { lmsIicrcCecCommunication?: { groupBy?: unknown } })
      .lmsIicrcCecCommunication?.groupBy,
  );
}

function clientHasNotifications(client: PrismaClient): boolean {
  return Boolean(
    (client as PrismaClient & { lmsNotification?: { findMany?: unknown } })
      .lmsNotification?.findMany,
  );
}

function clientHasHubSubmissions(client: PrismaClient): boolean {
  return Boolean(
    (client as PrismaClient & { hubSubmission?: { create?: unknown } }).hubSubmission?.create,
  );
}

/** Dev HMR can keep a Prisma client generated before new models exist — refresh when stale. */
export function getPrismaClient(): PrismaClient {
  let client = globalForPrisma.prisma ?? createClient();
  if (
    !clientHasTeamCoursePurchases(client) ||
    !clientHasRenewalCommunications(client) ||
    !clientHasNotifications(client) ||
    !clientHasHubSubmissions(client)
  ) {
    client = createClient();
  }
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();

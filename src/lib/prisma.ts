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

function appendQueryParam(url: string, key: string, value: string): string {
  if (new RegExp(`[?&]${key}=`, 'i').test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
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

  const b64 = process.env.DATABASE_CA_CERT?.trim();
  if (b64) {
    if (!cachedCaPath) {
      const certPath = join(tmpdir(), `carsi-pg-ca-${randomUUID()}.crt`);
      const pem = Buffer.from(b64, 'base64').toString('utf8');
      writeFileSync(certPath, pem, { mode: 0o600 });
      cachedCaPath = certPath;
    }

    let url = base;
    if (!/sslmode=/i.test(url)) {
      url = appendQueryParam(url, 'sslmode', 'verify-full');
    }
    return appendQueryParam(url, 'sslrootcert', cachedCaPath);
  }

  // node-pg treats sslmode=require as verify-full; DigitalOcean needs libpq-compat or a CA file.
  // See https://github.com/brianc/node-postgres/issues/2558
  let url = base;
  if (/\.db\.ondigitalocean\.com/i.test(url) && !/sslmode=/i.test(url)) {
    url = appendQueryParam(url, 'sslmode', 'require');
  }
  if (/sslmode=require/i.test(url) && !/uselibpqcompat=/i.test(url)) {
    url = appendQueryParam(url, 'uselibpqcompat', 'true');
  }

  return url;
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

/** Dev HMR can keep a Prisma client generated before new models exist — refresh when stale. */
function getPrismaClient(): PrismaClient {
  let client = globalForPrisma.prisma ?? createClient();
  if (!clientHasTeamCoursePurchases(client) || !clientHasRenewalCommunications(client)) {
    client = createClient();
  }
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();

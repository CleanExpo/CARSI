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
  if (!b64) {
    return base;
  }

  if (!cachedCaPath) {
    const certPath = join(tmpdir(), `carsi-pg-ca-${randomUUID()}.crt`);
    const pem = Buffer.from(b64, 'base64').toString('utf8');
    writeFileSync(certPath, pem, { mode: 0o600 });
    cachedCaPath = certPath;
  }

  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}sslrootcert=${encodeURIComponent(cachedCaPath)}`;
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: getConnectionStringForAdapter() });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

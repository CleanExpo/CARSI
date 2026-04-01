import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

let cachedCaPath: string | undefined;

/**
 * Appends sslrootcert for DigitalOcean managed Postgres when DATABASE_CA_CERT (base64 PEM) is set.
 * Updates DATABASE_URL before PrismaPg reads it.
 */
function resolveDatabaseUrl(): string {
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error('DATABASE_URL is not set');
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

process.env.DATABASE_URL = resolveDatabaseUrl();

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

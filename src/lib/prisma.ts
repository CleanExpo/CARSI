import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { PrismaClient } from '@/generated/prisma/client';
import { isDigitalOceanDatabaseHost, resolveRawDatabaseUrl } from '@/lib/database-url';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Valid for client init when `DATABASE_URL` is not injected yet (e.g. `next build`). */
const PRISMA_CLIENT_PLACEHOLDER_URL =
  'postgresql://prisma:prisma@127.0.0.1:5432/prisma_generate_only?schema=public';

function readCaPem(): string | undefined {
  const b64 = process.env.DATABASE_CA_CERT?.trim();
  if (!b64) return undefined;
  return Buffer.from(b64, 'base64').toString('utf8');
}

function createPgPool(): pg.Pool {
  const connectionString = resolveRawDatabaseUrl();
  if (!connectionString) {
    return new pg.Pool({ connectionString: PRISMA_CLIENT_PLACEHOLDER_URL });
  }

  const ca = readCaPem();
  const isDo = isDigitalOceanDatabaseHost(connectionString);

  if (ca) {
    return new pg.Pool({
      connectionString,
      ssl: { ca, rejectUnauthorized: true },
    });
  }

  if (isDo) {
    // DigitalOcean managed Postgres: encrypt without strict public-CA verification
    // when DATABASE_CA_CERT is not injected (common on App Platform).
    return new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  return new pg.Pool({ connectionString });
}

function createClient() {
  const adapter = new PrismaPg(createPgPool());
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

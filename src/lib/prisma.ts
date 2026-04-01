import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import os from 'os';
import path from 'path';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string {
  let url = process.env.DATABASE_URL!;

  if (process.env.DATABASE_CA_CERT) {
    const certPath = path.join(os.tmpdir(), 'do-ca.crt');
    const certContent = Buffer.from(process.env.DATABASE_CA_CERT, 'base64').toString('utf-8');
    fs.writeFileSync(certPath, certContent);

    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}sslrootcert=${certPath}`;
  }

  return url;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: getDatabaseUrl() },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

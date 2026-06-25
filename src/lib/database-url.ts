import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let cachedCaPath: string | undefined;

export function isDigitalOceanDatabaseHost(url: string): boolean {
  return /\.db\.ondigitalocean\.com/i.test(url);
}

function appendQueryParam(url: string, key: string, value: string): string {
  if (new RegExp(`[?&]${key}=`, 'i').test(url)) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

function buildUrlFromDbEnvVars(): string | null {
  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD?.trim();
  const host = process.env.DB_HOST?.trim();
  const port = (process.env.DB_PORT ?? '25060').trim();
  const database = (process.env.DB_NAME ?? 'defaultdb').trim();
  const ssl =
    process.env.DB_SSLMODE === 'false' || process.env.DB_SSLMODE === 'disable'
      ? 'disable'
      : 'require';

  if (!user || !password || !host) return null;

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=${ssl}`;
}

/**
 * Connection string for Prisma CLI (`migrate deploy`) and tooling.
 * Adds DigitalOcean-compatible SSL query params when no CA file is configured.
 */
export function resolveDatabaseConnectionString(raw?: string | null): string {
  const base = raw?.trim() || buildUrlFromDbEnvVars();
  if (!base) return '';

  const b64 = process.env.DATABASE_CA_CERT?.trim();
  if (b64) {
    if (!cachedCaPath) {
      const certPath = join(tmpdir(), `carsi-pg-ca-${randomUUID()}.crt`);
      writeFileSync(certPath, Buffer.from(b64, 'base64').toString('utf8'), { mode: 0o600 });
      cachedCaPath = certPath;
    }

    let url = base;
    if (!/sslmode=/i.test(url)) {
      url = appendQueryParam(url, 'sslmode', 'verify-full');
    }
    return appendQueryParam(url, 'sslrootcert', cachedCaPath);
  }

  let url = base;
  if (isDigitalOceanDatabaseHost(url) && !/sslmode=/i.test(url)) {
    url = appendQueryParam(url, 'sslmode', 'require');
  }
  if (/sslmode=require/i.test(url) && !/uselibpqcompat=/i.test(url)) {
    url = appendQueryParam(url, 'uselibpqcompat', 'true');
  }

  return url;
}

/** Raw URL before query normalization (for pg Pool `ssl` options). */
export function resolveRawDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || buildUrlFromDbEnvVars() || '';
}

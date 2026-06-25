import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * `prisma generate` runs on `npm install` (postinstall). Some hosts (e.g. DigitalOcean buildpacks)
 * do not inject DATABASE_URL until later build phases, so `env("DATABASE_URL")` fails.
 * Set `DATABASE_URL` in `.env` (never commit credentials). The placeholder below is only for
 * `prisma generate` when DATABASE_URL is unset. Migrations need a real URL at runtime/start.
 */

const GENERATE_ONLY_URL =
  'postgresql://prisma:prisma@127.0.0.1:5432/prisma_generate_only?schema=public';

function resolveDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) return direct;

  const user = process.env.DB_USER?.trim();
  const password = process.env.DB_PASSWORD?.trim();
  const host = process.env.DB_HOST?.trim();
  const port = (process.env.DB_PORT ?? '25060').trim();
  const database = (process.env.DB_NAME ?? 'defaultdb').trim();
  const ssl =
    process.env.DB_SSLMODE === 'false' || process.env.DB_SSLMODE === 'disable'
      ? 'disable'
      : 'require';

  if (user && password && host) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=${ssl}`;
  }

  return GENERATE_ONLY_URL;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});

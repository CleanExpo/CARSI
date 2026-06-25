import 'dotenv/config';
import { defineConfig } from 'prisma/config';

import { resolveDatabaseConnectionString } from './src/lib/database-url';

/**
 * `prisma generate` runs on `npm install` (postinstall). Some hosts (e.g. DigitalOcean buildpacks)
 * do not inject DATABASE_URL until later build phases. Migrations run manually or via
 * `PRISMA_MIGRATE_ON_START=true` on the container entrypoint — not on every `npm start`.
 */

const GENERATE_ONLY_URL =
  'postgresql://prisma:prisma@127.0.0.1:5432/prisma_generate_only?schema=public';

function resolveDatabaseUrl(): string {
  const resolved = resolveDatabaseConnectionString(process.env.DATABASE_URL);
  return resolved || GENERATE_ONLY_URL;
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

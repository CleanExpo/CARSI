import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * `prisma generate` runs on `npm install` (postinstall). Some hosts (e.g. DigitalOcean buildpacks)
 * do not inject DATABASE_URL until later build phases, so `env("DATABASE_URL")` fails.
 * Set `DATABASE_URL` in `.env` (never commit credentials). The placeholder below is only for
 * `prisma generate` when DATABASE_URL is unset. Migrations need a real URL at runtime/start.
 */

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@carsi-db-do-user-29653167-0.d.db.ondigitalocean.com:25060/defaultdb?sslmode=require`,
  },
});

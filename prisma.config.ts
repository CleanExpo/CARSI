import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `prisma generate` runs on `npm install` (postinstall). Some hosts (e.g. DigitalOcean buildpacks)
 * do not inject DATABASE_URL until later build phases, so `env("DATABASE_URL")` fails.
 * Set `DATABASE_URL` in `.env` (never commit credentials). The placeholder below is only for
 * `prisma generate` when DATABASE_URL is unset. Migrations need a real URL at runtime/start.
 */
const PRISMA_GENERATE_PLACEHOLDER_URL =
  "postgresql://prisma:prisma@127.0.0.1:5432/prisma_generate_only?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? PRISMA_GENERATE_PLACEHOLDER_URL,
  },
});

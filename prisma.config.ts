import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * `prisma generate` runs on `npm install` (postinstall). Some hosts (e.g. DigitalOcean buildpacks)
 * do not inject DATABASE_URL until later build phases, so `env("DATABASE_URL")` fails.
 * A placeholder is valid for generate only; `prisma migrate deploy` must use a real DATABASE_URL.
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

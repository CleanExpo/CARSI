import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Real-PostgreSQL tests (*.pg.test.ts). They need DATABASE_URL pointing at a disposable, migrated
 * local PostgreSQL, which CI's E2E job provides (`npm run test:pg`). They are excluded from the
 * database-free unit suite in vitest.config.ts. Files run one at a time: they share one database.
 *
 * They write and delete shared rows, so globalSetup REFUSES the run unless DATABASE_URL is a
 * loopback host AND CARSI_PG_DISPOSABLE=1 (src/test-utils/pg-disposable.ts). Locally, with a
 * throwaway docker container:
 *   docker run -d --rm --name carsi-pg -e POSTGRES_USER=root -e POSTGRES_PASSWORD=root \
 *     -e POSTGRES_DB=carsi -p 55432:5432 postgres:16
 *   DATABASE_URL=postgresql://root:root@localhost:55432/carsi npx prisma migrate deploy
 *   CARSI_PG_DISPOSABLE=1 DATABASE_URL=postgresql://root:root@localhost:55432/carsi npm run test:pg
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.pg.test.ts'],
    globalSetup: ['./src/test-utils/pg-global-setup.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});

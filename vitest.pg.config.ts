import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Real-PostgreSQL tests (*.pg.test.ts). They need DATABASE_URL pointing at a disposable, migrated
 * local PostgreSQL, which CI's E2E job provides (`npm run test:pg`). They are excluded from the
 * database-free unit suite in vitest.config.ts. Files run one at a time: they share one database.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.pg.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});

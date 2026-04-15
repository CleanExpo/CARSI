import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://starter_user:local_dev_password@localhost:5432/starter_db',
      JWT_SECRET_KEY: process.env.JWT_SECRET_KEY ?? 'ci-e2e-placeholder-secret',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'ci-e2e-placeholder-secret',
      NEXT_PUBLIC_FRONTEND_URL: 'http://localhost:3000',
      SKIP_ENV_VALIDATION: '1',
    },
  },
});

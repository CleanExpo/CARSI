import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  testMatch: ['tests/**/*.spec.ts', 'e2e/**/*.spec.ts'],
  testIgnore: ['**/.next/**', '**/node_modules/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'tablet-chromium',
      // Tablet/mobile exist for responsive *accessibility* coverage only. The
      // functional e2e journeys are viewport-agnostic, so running them under
      // every device tripled CI time and blew the E2E job's 30-min budget.
      testMatch: ['tests/accessibility/**/*.spec.ts'],
      use: {
        ...devices['iPad (gen 7)'],
        // devices['iPad (gen 7)'] defaults to WebKit; force Chromium so this
        // project matches its name and the browser CI installs (chromium only).
        browserName: 'chromium',
      },
    },
    {
      name: 'mobile-chromium',
      testMatch: ['tests/accessibility/**/*.spec.ts'],
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // CI runs a full production build inside the webServer; allow headroom so a
    // cold `next build` doesn't trip the startup timeout on slower runners.
    timeout: 240_000,
  },
});

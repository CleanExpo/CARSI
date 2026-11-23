import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { rejectedAnalytics } from './e2e-consent';

/**
 * Read-only smoke of the LIVE site (Phill, 23/11/2026: "Nothing gets pushed to live without
 * going through all the necessary systems and checks using Playwright also to ensure everything
 * is perfect."). Runs e2e/live-smoke.live.ts only, after every production deploy
 * (.github/workflows/deploy-production.yml, job live-smoke) and by hand with
 * `npm run test:smoke:live`.
 *
 * It targets https://carsi.com.au, so it is deliberately kept out of `npm run test:e2e`: the
 * spec's `.live.ts` name does not match the main config's `e2e/**\/*.spec.ts`. There is no
 * webServer: nothing is started, nothing is signed in, nothing is written.
 *
 * LIVE_SMOKE_BASE_URL  another origin to smoke (default https://carsi.com.au)
 * LIVE_SMOKE_OUTPUT_DIR where screenshots and failure traces go (default test-results/live-smoke)
 * LIVE_SMOKE_EXPECT_COMMIT when set, /api/health must report this build commit
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseURL = process.env.LIVE_SMOKE_BASE_URL ?? 'https://carsi.com.au';
const outputRoot = path.resolve(
  repoRoot,
  process.env.LIVE_SMOKE_OUTPUT_DIR ?? path.join('test-results', 'live-smoke')
);

export default defineConfig({
  testDir: path.join(repoRoot, 'e2e'),
  testMatch: /live-smoke\.live\.ts$/,
  outputDir: path.join(outputRoot, 'failures'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry absorbs a single network blip on the live site; a real fault fails twice.
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  metadata: { screenshotDir: outputRoot },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    storageState: rejectedAnalytics(baseURL),
  },
  projects: [
    {
      name: 'desktop-1440x900',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'phone-390x844',
      use: {
        browserName: 'chromium',
        userAgent: devices['iPhone 13'].userAgent,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});

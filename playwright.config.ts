import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

/**
 * The membership checkout journeys (e2e/membership-checkout.spec.ts) need a server with the
 * yearly membership switched on (SUBSCRIPTIONS_ENABLED=true), while every other spec runs against
 * the default flag-off server. In CI a second process serves the SAME production build on port
 * 3100 with the flag on, so the checkout journeys run in the normal gate. Locally, point
 * PLAYWRIGHT_MEMBERSHIP_BASE_URL at a flag-on server; without it the project is not defined.
 */
const MEMBERSHIP_CI_PORT = 3100;
const membershipBaseURL =
  process.env.PLAYWRIGHT_MEMBERSHIP_BASE_URL ??
  (process.env.CI ? `http://localhost:${MEMBERSHIP_CI_PORT}` : undefined);
const MEMBERSHIP_SPEC = /e2e\/membership-checkout\.spec\.ts$/;
/**
 * The payment-success purchase survey (e2e/payment-success-survey.spec.ts) renders only when
 * PURCHASE_SURVEY_ENABLED=true. Same pattern as the membership project: in CI a third process
 * serves the SAME build on port 3101 with the flag on; locally set PLAYWRIGHT_SURVEY_BASE_URL.
 * Flag-on tests carry the @survey-on tag and run only in the `purchase-survey` project; the
 * flag-off test in the same file runs in the default project.
 */
const SURVEY_CI_PORT = 3101;
const surveyBaseURL =
  process.env.PLAYWRIGHT_SURVEY_BASE_URL ??
  (process.env.CI ? `http://localhost:${SURVEY_CI_PORT}` : undefined);
const SURVEY_SPEC = /e2e\/payment-success-survey\.spec\.ts$/;
// A project-level testIgnore REPLACES the top-level one, so every project that sets its own must
// repeat these (the CI build writes a copy of e2e/ under .next/standalone).
const BUILD_OUTPUT = ['**/.next/**', '**/node_modules/**'];

export default defineConfig({
  testDir: '.',
  // `auth.setup.ts` is matched by the dedicated `setup` project below (not by the
  // `*.spec.ts` glob), so it runs once to mint a real session before the
  // authenticated journeys.
  testMatch: ['e2e/**/*.spec.ts'],
  testIgnore: BUILD_OUTPUT,
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
      // Real-login setup: signs in the seeded E2E student and saves storageState
      // to playwright/.auth/student.json. Authenticated specs opt in with
      // `test.use({ storageState })`; unauthenticated specs are unaffected.
      name: 'setup',
      testMatch: /e2e\/auth\.setup\.ts$/,
    },
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@authenticated|@survey-on/,
      // Flag-on journeys run only in the membership-checkout project below.
      testIgnore: [...BUILD_OUTPUT, MEMBERSHIP_SPEC],
    },
    {
      // Authenticated desktop journeys: depend on `setup` to mint a real session and
      // run with its storageState.
      name: 'desktop-authenticated',
      testMatch: ['e2e/**/*.spec.ts'],
      grep: /@authenticated/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/student.json',
      },
    },
    ...(membershipBaseURL
      ? [
          {
            name: 'membership-checkout',
            testMatch: MEMBERSHIP_SPEC,
            testIgnore: BUILD_OUTPUT,
            use: { ...devices['Desktop Chrome'], baseURL: membershipBaseURL },
          },
        ]
      : []),
    ...(surveyBaseURL
      ? [
          {
            name: 'purchase-survey',
            testMatch: SURVEY_SPEC,
            testIgnore: BUILD_OUTPUT,
            grep: /@survey-on/,
            use: { ...devices['Desktop Chrome'], baseURL: surveyBaseURL },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      // CI runs a full production build inside the webServer; allow headroom so a
      // cold `next build` doesn't trip the startup timeout on slower runners.
      timeout: 240_000,
    },
    // Playwright starts web servers one after another, so this reuses the build above.
    ...(process.env.CI && !process.env.PLAYWRIGHT_MEMBERSHIP_BASE_URL
      ? [
          {
            command: `npx next start -p ${MEMBERSHIP_CI_PORT}`,
            url: `http://localhost:${MEMBERSHIP_CI_PORT}`,
            env: { SUBSCRIPTIONS_ENABLED: 'true' },
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ]
      : []),
    ...(process.env.CI && !process.env.PLAYWRIGHT_SURVEY_BASE_URL
      ? [
          {
            command: `npx next start -p ${SURVEY_CI_PORT}`,
            url: `http://localhost:${SURVEY_CI_PORT}`,
            env: { PURCHASE_SURVEY_ENABLED: 'true' },
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ]
      : []),
  ],
});

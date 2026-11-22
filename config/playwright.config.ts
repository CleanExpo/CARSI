import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { allocateE2EPorts } from './e2e-ports';

import { CONSENT_NOTICE_VERSION, CONSENT_STORAGE_KEY } from '../src/lib/analytics/consent';

// This file lives in config/; every path (specs, output, auth state, web server working
// directory) must resolve from the repo root, where package.json and next.config.ts live.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// GitHub never sets E2E_PORT*, so CI listens on 3000, 3100 and 3101. The release gate's local
// CI mirror sets them to free ports, because on a shared Mac another session's dev server
// often holds 3000 (UNI-3468).
// A developer's own PORT is kept when E2E_PORT is unset (UNI-3472); no workflow sets PORT.
// All three server ports come from allocateE2EPorts: explicit E2E_PORT_2 / E2E_PORT_3 win, and a
// default that another server holds is skipped, so two servers never share a port.
const {
  main: MAIN_PORT,
  membership: MEMBERSHIP_CI_PORT,
  survey: SURVEY_CI_PORT,
} = allocateE2EPorts(process.env);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${MAIN_PORT}`;

/**
 * The membership checkout journeys (e2e/membership-checkout.spec.ts) need a server with the
 * yearly membership switched on (SUBSCRIPTIONS_ENABLED=true), while every other spec runs against
 * the default flag-off server. In CI a second process serves the SAME production build on port
 * 3100 with the flag on, so the checkout journeys run in the normal gate. Locally, point
 * PLAYWRIGHT_MEMBERSHIP_BASE_URL at a flag-on server; without it the project is not defined.
 */
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
const surveyBaseURL =
  process.env.PLAYWRIGHT_SURVEY_BASE_URL ??
  (process.env.CI ? `http://localhost:${SURVEY_CI_PORT}` : undefined);
const SURVEY_SPEC = /e2e\/payment-success-survey\.spec\.ts$/;
// A project-level testIgnore REPLACES the top-level one, so every project that sets its own must
// repeat these (the CI build writes a copy of e2e/ under .next/standalone).
const BUILD_OUTPUT = ['**/.next/**', '**/node_modules/**'];

/**
 * GP-731: every page shows the analytics consent banner until the visitor chooses, and the banner
 * covers the foot of the page. Each project therefore starts with a stored "Reject optional"
 * choice for its own origin, so journeys are not blocked by the banner and no test traffic loads
 * Google. Specs that check analytics events make an explicit "yes" first
 * (acceptAnalytics in e2e/membership-analytics.ts). The value is built from the app's own
 * constants, so a new notice version cannot silently bring the banner back.
 */
function rejectedAnalytics(url: string | undefined) {
  const origins = url
    ? [
        {
          origin: new URL(url).origin,
          localStorage: [
            {
              name: CONSENT_STORAGE_KEY,
              value: JSON.stringify({
                version: CONSENT_NOTICE_VERSION,
                analytics: false,
                timestamp: '2026-11-21T00:00:00.000Z',
              }),
            },
          ],
        },
      ]
    : [];
  return { cookies: [], origins };
}

export default defineConfig({
  testDir: repoRoot,
  outputDir: path.join(repoRoot, 'test-results'),
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
      // The saved student session carries the stored choice into the authenticated projects.
      use: { storageState: rejectedAnalytics(baseURL) },
    },
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], storageState: rejectedAnalytics(baseURL) },
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
        storageState: path.join(repoRoot, 'playwright/.auth/student.json'),
      },
    },
    ...(membershipBaseURL
      ? [
          {
            name: 'membership-checkout',
            testMatch: MEMBERSHIP_SPEC,
            testIgnore: BUILD_OUTPUT,
            use: {
              ...devices['Desktop Chrome'],
              baseURL: membershipBaseURL,
              storageState: rejectedAnalytics(membershipBaseURL),
            },
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
            use: {
              ...devices['Desktop Chrome'],
              baseURL: surveyBaseURL,
              storageState: rejectedAnalytics(surveyBaseURL),
            },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
      url: baseURL,
      cwd: repoRoot,
      env: { PORT: MAIN_PORT },
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
            cwd: repoRoot,
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
            cwd: repoRoot,
            env: { PURCHASE_SURVEY_ENABLED: 'true' },
            reuseExistingServer: false,
            timeout: 120_000,
          },
        ]
      : []),
  ],
});

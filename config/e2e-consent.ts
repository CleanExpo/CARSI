import { CONSENT_NOTICE_VERSION, CONSENT_STORAGE_KEY } from '../src/lib/analytics/consent';

/**
 * GP-731: every page shows the analytics consent banner until the visitor chooses, and the banner
 * covers the foot of the page. Each Playwright project therefore starts with a stored "Reject
 * optional" choice for its own origin, so journeys are not blocked by the banner and no test
 * traffic loads Google. Specs that check analytics events make an explicit "yes" first
 * (acceptAnalytics in e2e/membership-analytics.ts). The value is built from the app's own
 * constants, so a new notice version cannot silently bring the banner back.
 *
 * Shared by config/playwright.config.ts (local server) and config/playwright.live.config.ts
 * (the read-only smoke against the live site).
 */
export function rejectedAnalytics(url: string | undefined) {
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

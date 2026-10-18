import { expect, test } from '@playwright/test';

import { configIndex, events, recordGtag } from './membership-analytics';

/**
 * V6 — /subscribe sends membership_view through the real analytics path, once, only after GA4 has
 * been configured, and with no account state. Runs in the default (flag-off) project; the checkout
 * journeys need the membership switched on and live in membership-checkout.spec.ts.
 */
test.describe('membership funnel events', () => {
  test('membership_view is sent once, after GA4 config, with site state only', async ({ page }) => {
    const calls = await recordGtag(page);
    await page.goto('/subscribe');
    await expect.poll(() => events(calls, 'membership_view').length).toBe(1);

    // Review r2 P1-V6-GA-EVENT-BEFORE-CONFIG: a configured destination exists before the event.
    const viewAt = calls.findIndex((c) => c.command === 'event' && c.name === 'membership_view');
    expect(configIndex(calls)).toBeGreaterThanOrEqual(0);
    expect(viewAt).toBeGreaterThan(configIndex(calls));

    // Review r2 P1-V6-ANALYTICS-STATUS: no membership status or renewal state leaves the page.
    const [view] = events(calls, 'membership_view');
    expect(Object.keys(view.params)).toEqual(['checkout_enabled']);
    expect(typeof view.params.checkout_enabled).toBe('boolean');

    await page.waitForTimeout(500);
    expect(events(calls, 'membership_view')).toHaveLength(1);
    expect(events(calls, 'membership_checkout_started')).toHaveLength(0);
  });
});

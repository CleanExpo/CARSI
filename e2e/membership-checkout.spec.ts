import { expect, test } from '@playwright/test';

import { events, recordGtag, STRIPE_URL, stubStripe } from './membership-analytics';

/**
 * V6 — membership checkout journeys against a server with the yearly membership switched on.
 * Runs only in the `membership-checkout` Playwright project: in CI that is a second process
 * serving the same production build with SUBSCRIPTIONS_ENABLED=true (playwright.config.ts), so
 * these journeys are part of the normal gate. A missing "Start membership" button is a failure.
 *
 * No request reaches Stripe: checkout responses and the Stripe page are answered locally. The
 * guest journey registers a fresh, uniquely named account in the test database.
 */
test.describe('membership checkout events (membership switched on)', () => {
  test('a CTA checkout sends membership_checkout_started once, with the price only', async ({
    page,
  }) => {
    const calls = await recordGtag(page);
    let checkoutCalls = 0;
    await page.route('**/api/lms/subscription/checkout', async (route) => {
      checkoutCalls += 1;
      await route.fulfill({ json: { url: STRIPE_URL } });
    });
    await stubStripe(page);

    await page.goto('/subscribe');
    const cta = page.getByRole('button', { name: /Start membership/ });
    await expect(cta).toBeVisible();
    await expect.poll(() => events(calls, 'membership_view').length).toBe(1);
    expect(events(calls, 'membership_view')[0].params).toEqual({ checkout_enabled: true });
    expect(events(calls, 'membership_checkout_started')).toHaveLength(0);

    await cta.click();
    await expect(page).toHaveURL(STRIPE_URL);
    expect(checkoutCalls).toBe(1);
    expect(events(calls, 'membership_checkout_started')).toHaveLength(1);
    expect(events(calls, 'membership_checkout_started')[0].params).toEqual({
      value: 795,
      currency: 'AUD',
    });
  });

  // Review r1 P1-V6-GUEST-CHECKOUT-UNTRACKED: the real guest path, through /register.
  test('a guest who registers in-flow sends membership_checkout_started once', async ({ page }) => {
    const calls = await recordGtag(page);
    const statuses: number[] = [];
    await page.route('**/api/lms/subscription/checkout', async (route) => {
      if (statuses.length === 0) {
        // The guest's first click reaches the real server: no session, so 401.
        const res = await route.fetch();
        statuses.push(res.status());
        await route.fulfill({ response: res });
        return;
      }
      // After registering, the new session's checkout is answered locally (no Stripe call).
      statuses.push(200);
      await route.fulfill({ json: { url: STRIPE_URL } });
    });
    await stubStripe(page);

    await page.goto('/subscribe');
    const cta = page.getByRole('button', { name: /Start membership/ });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/register\?next=%2Fsubscribe$/);
    expect(statuses).toEqual([401]);
    expect(events(calls, 'membership_checkout_started')).toHaveLength(0);

    const email = `e2e-guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
    const fields: Array<[string, string]> = [
      ['fullName', 'E2E Guest Buyer'],
      ['email', email],
      ['password', 'correct-horse-9'],
      ['confirmPassword', 'correct-horse-9'],
    ];
    // Hydration can reset values typed into the server-rendered form; refill until they stick.
    await expect(async () => {
      for (const [name, value] of fields) {
        await page.locator(`input[name="${name}"]`).fill(value);
      }
      await page.waitForTimeout(200);
      for (const [name, value] of fields) {
        await expect(page.locator(`input[name="${name}"]`)).toHaveValue(value, { timeout: 500 });
      }
    }).toPass({ timeout: 15_000 });
    const registered = page.waitForResponse(
      (r) => r.url().endsWith('/api/auth/register') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: 'Create account' }).click();
    // /api/auth/register allows 10 attempts per IP per 15 minutes. Repeated local runs can hit
    // that throttle; name it plainly instead of failing later on a URL wait.
    const registerStatus = (await registered).status();
    expect(
      registerStatus,
      registerStatus === 429
        ? 'registration throttled (10 per IP per 15 min) by repeated runs: environment, not a funnel defect'
        : 'guest registration'
    ).toBe(200);

    await expect(page).toHaveURL(STRIPE_URL, { timeout: 20_000 });
    expect(statuses).toEqual([401, 200]);
    expect(events(calls, 'membership_checkout_started')).toHaveLength(1);
    expect(events(calls, 'membership_checkout_started')[0].params).toEqual({
      value: 795,
      currency: 'AUD',
    });
  });
});

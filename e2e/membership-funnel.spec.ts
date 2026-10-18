import { expect, test, type Page } from '@playwright/test';

/**
 * V6 — /subscribe dispatches the membership funnel events through the real analytics path
 * (trackFunnelEvent → window.gtag). gtag is replaced with a recorder before any page script runs,
 * so an event only counts if the page itself sends it. No request reaches Stripe: the checkout
 * API and the Stripe redirect are both answered locally.
 */
type RecordedEvent = { name: string; params: Record<string, unknown> };

async function recordGtagEvents(page: Page): Promise<RecordedEvent[]> {
  const events: RecordedEvent[] = [];
  await page.exposeFunction('__e2eRecordGtag', (name: string, params: Record<string, unknown>) => {
    events.push({ name, params });
  });
  await page.addInitScript(() => {
    const w = window as unknown as {
      __e2eRecordGtag: (name: string, params: unknown) => void;
    };
    const recorder = (...args: unknown[]) => {
      if (args[0] === 'event') w.__e2eRecordGtag(String(args[1]), args[2] ?? {});
    };
    // Locked so a later GA bootstrap cannot swap the recorder out.
    Object.defineProperty(window, 'gtag', {
      configurable: false,
      get: () => recorder,
      set: () => {},
    });
  });
  return events;
}

const names = (events: RecordedEvent[]) => events.map((e) => e.name);

test.describe('membership funnel events', () => {
  test('membership_view is dispatched when /subscribe loads', async ({ page }) => {
    const events = await recordGtagEvents(page);
    await page.goto('/subscribe');
    await expect.poll(() => names(events)).toContain('membership_view');
    const view = events.find((e) => e.name === 'membership_view');
    expect(view?.params).toMatchObject({ membership_status: 'none' });
    expect(typeof view?.params.checkout_enabled).toBe('boolean');
    expect(names(events)).not.toContain('membership_checkout_started');
  });

  test('membership_checkout_started is dispatched when the CTA starts checkout', async ({
    page,
  }) => {
    const events = await recordGtagEvents(page);
    const stripeUrl = 'https://checkout.stripe.com/c/pay/e2e-membership';
    let checkoutCalls = 0;
    await page.route('**/api/lms/subscription/checkout', async (route) => {
      checkoutCalls += 1;
      await route.fulfill({ json: { url: stripeUrl } });
    });
    await page.route('https://checkout.stripe.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>stripe stub</title>' })
    );

    await page.goto('/subscribe');
    const cta = page.getByRole('button', { name: /Start membership/ });
    test.skip(
      (await cta.count()) === 0,
      'SUBSCRIPTIONS_ENABLED is off: the CTA is "Coming soon" and no checkout can start'
    );

    await expect.poll(() => names(events)).toContain('membership_view');
    expect(names(events)).not.toContain('membership_checkout_started');

    await cta.click();
    await expect(page).toHaveURL(stripeUrl);
    expect(checkoutCalls).toBe(1);
    const started = events.find((e) => e.name === 'membership_checkout_started');
    expect(started?.params).toMatchObject({ is_renewal: false, value: 795, currency: 'AUD' });
  });
});

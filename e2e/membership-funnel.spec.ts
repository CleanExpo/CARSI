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

const count = (events: RecordedEvent[], name: string) =>
  events.filter((e) => e.name === name).length;

const STRIPE_URL = 'https://checkout.stripe.com/c/pay/e2e-membership';

async function stubStripe(page: Page) {
  await page.route('https://checkout.stripe.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>stripe stub</title>' })
  );
}

test.describe('membership funnel events', () => {
  test('membership_view is dispatched once when /subscribe loads', async ({ page }) => {
    const events = await recordGtagEvents(page);
    await page.goto('/subscribe');
    await expect.poll(() => names(events)).toContain('membership_view');
    const view = events.find((e) => e.name === 'membership_view');
    expect(view?.params).toMatchObject({ membership_status: 'none' });
    expect(typeof view?.params.checkout_enabled).toBe('boolean');
    await page.waitForTimeout(500);
    expect(count(events, 'membership_view')).toBe(1);
    expect(names(events)).not.toContain('membership_checkout_started');
  });
});

/**
 * The checkout journeys need the membership switched on (SUBSCRIPTIONS_ENABLED) on the server
 * under test, which the shared CI E2E job does not set. They are opted in with
 * E2E_MEMBERSHIP_CHECKOUT=1, and when opted in a missing "Start membership" button is a FAILURE,
 * never a skip. CI coverage of the same events comes from the flag-independent component tests in
 * src/lib/membership-checkout.test.tsx.
 */
test.describe('membership checkout events (membership switched on)', () => {
  test.skip(
    process.env.E2E_MEMBERSHIP_CHECKOUT !== '1',
    'set E2E_MEMBERSHIP_CHECKOUT=1 against a server with SUBSCRIPTIONS_ENABLED=true'
  );

  test('a signed-in style CTA checkout dispatches membership_checkout_started once', async ({
    page,
  }) => {
    const events = await recordGtagEvents(page);
    let checkoutCalls = 0;
    await page.route('**/api/lms/subscription/checkout', async (route) => {
      checkoutCalls += 1;
      await route.fulfill({ json: { url: STRIPE_URL } });
    });
    await stubStripe(page);

    await page.goto('/subscribe');
    const cta = page.getByRole('button', { name: /Start membership/ });
    await expect(cta).toBeVisible();
    await expect.poll(() => names(events)).toContain('membership_view');
    expect(names(events)).not.toContain('membership_checkout_started');

    await cta.click();
    await expect(page).toHaveURL(STRIPE_URL);
    expect(checkoutCalls).toBe(1);
    expect(count(events, 'membership_checkout_started')).toBe(1);
    const started = events.find((e) => e.name === 'membership_checkout_started');
    expect(started?.params).toMatchObject({ is_renewal: false, value: 795, currency: 'AUD' });
  });

  // Review r1 P1-V6-GUEST-CHECKOUT-UNTRACKED: the real guest path, through /register.
  test('a guest who registers in-flow dispatches membership_checkout_started once', async ({
    page,
  }) => {
    const events = await recordGtagEvents(page);
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
    expect(count(events, 'membership_checkout_started')).toBe(0);

    const email = `e2e-guest-${Date.now()}@example.com`;
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
    expect(count(events, 'membership_checkout_started')).toBe(1);
    const started = events.find((e) => e.name === 'membership_checkout_started');
    expect(started?.params).toMatchObject({ is_renewal: false, value: 795, currency: 'AUD' });
  });
});

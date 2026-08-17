import { expect, test } from '@playwright/test';

/**
 * Per-course purchase path — `POST /api/lms/checkout`.
 *
 * This is the ONLY revenue path that exists today: subscriptions ship dark behind
 * SUBSCRIPTIONS_ENABLED, so every dollar CARSI can currently take goes through this endpoint.
 * Until this file existed nothing exercised it — `grep -rn "lms/checkout" e2e/` matched nothing,
 * and the only checkout under test was `api/lms/subscription/checkout`, the dark one.
 *
 * What is asserted here is the fail-closed half: hostile and anonymous callers must never come
 * away with a Stripe session or a free enrolment. Completing a real payment needs Stripe test
 * keys and webhooks and is deliberately out of scope — a faked-green purchase test would be
 * worse than an absent one.
 *
 * The status sets below are deliberately loose because the environment changes what the route
 * reaches: locally there is no DATABASE_URL, so the published-catalogue lookup misses and a real
 * slug 404s; in CI the catalogue is seeded (ci.yml e2e-tests seeds Postgres), so the same request
 * walks past the lookup and fails at the unset-Stripe branch instead. The INVARIANT is what
 * matters and it holds in both: no `checkout_url`, and no `enrolled: true`.
 */

const REAL_SLUG = 'wrt-water-damage-essentials';

/** Neither a Stripe session nor a free enrolment may ever come back from these calls. */
async function expectNoPurchaseGranted(res: { json: () => Promise<unknown> }) {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  expect(body.checkout_url, 'anonymous/hostile caller must not receive a Stripe session').toBeUndefined();
  expect(body.url, 'anonymous/hostile caller must not receive a Stripe session').toBeUndefined();
  expect(body.enrolled, 'anonymous/hostile caller must not be enrolled for free').toBeUndefined();
  return body;
}

test.describe('Per-course purchase path (the only live revenue path)', () => {
  // Guard against running the whole file against the wrong server. Playwright defaults to
  // :3000, and a stranger app answering 405 to everything would satisfy every "no checkout_url"
  // assertion below vacuously — the suite would pass while testing nothing. This fails loudly
  // instead. It also fixes the classic false-green where the dev server moved port.
  test('the server under test is actually CARSI', async ({ request }) => {
    const res = await request.get('/api/lms/subscription/status');
    expect(res.status(), 'expected the CARSI app on the configured baseURL').toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('has_subscription');
  });

  test('a request with no course slug is rejected', async ({ request }) => {
    const res = await request.post('/api/lms/checkout', { data: {} });
    expect(res.status()).toBe(400);
    await expectNoPurchaseGranted(res);
  });

  test('an anonymous caller with no email cannot start a checkout', async ({ request }) => {
    // The identity gate sits before the catalogue lookup, so this holds with or without a DB.
    const res = await request.post('/api/lms/checkout', { data: { slug: REAL_SLUG } });
    expect(res.status()).toBe(401);
    await expectNoPurchaseGranted(res);
  });

  test('an unknown course slug never yields a checkout', async ({ request }) => {
    const res = await request.post('/api/lms/checkout', {
      data: { slug: 'definitely-not-a-course-xyz', customer_email: 'probe@example.com' },
    });
    expect(res.status()).toBe(404);
    await expectNoPurchaseGranted(res);
  });

  test('a real course still refuses to sell to an unverified email without Stripe configured', async ({
    request,
  }) => {
    const res = await request.post('/api/lms/checkout', {
      data: { slug: REAL_SLUG, customer_email: 'probe@example.com' },
    });
    // 404 where the catalogue is empty (no DATABASE_URL), 503 where it is seeded but Stripe is
    // not configured, 401 if the guest path is closed. Never a sale.
    expect([401, 404, 503]).toContain(res.status());
    await expectNoPurchaseGranted(res);
  });

  test.describe('team seat validation', () => {
    test('team purchase without a seat count is rejected', async ({ request }) => {
      const res = await request.post('/api/lms/checkout', {
        data: { slug: REAL_SLUG, customer_email: 'probe@example.com', purchase_mode: 'team' },
      });
      expect(res.status()).toBe(400);
      await expectNoPurchaseGranted(res);
    });

    test('a seat count above the per-order cap is rejected', async ({ request }) => {
      const res = await request.post('/api/lms/checkout', {
        data: {
          slug: REAL_SLUG,
          customer_email: 'probe@example.com',
          purchase_mode: 'team',
          team_seat_count: 999999,
        },
      });
      expect(res.status()).toBe(400);
      await expectNoPurchaseGranted(res);
    });

    test('a zero seat count is rejected', async ({ request }) => {
      const res = await request.post('/api/lms/checkout', {
        data: {
          slug: REAL_SLUG,
          customer_email: 'probe@example.com',
          purchase_mode: 'team',
          team_seat_count: 0,
        },
      });
      expect(res.status()).toBe(400);
      await expectNoPurchaseGranted(res);
    });

    test('a negative seat count cannot invert the price', async ({ request }) => {
      const res = await request.post('/api/lms/checkout', {
        data: {
          slug: REAL_SLUG,
          customer_email: 'probe@example.com',
          purchase_mode: 'team',
          team_seat_count: -5,
        },
      });
      expect(res.status()).toBe(400);
      await expectNoPurchaseGranted(res);
    });
  });

  test('a malformed body does not crash the endpoint', async ({ request }) => {
    const res = await request.post('/api/lms/checkout', {
      headers: { 'Content-Type': 'application/json' },
      data: 'not json at all',
    });
    // The route catches a bad body and treats it as an empty one — a 5xx here would mean an
    // unhandled throw on the revenue path.
    expect(res.status()).toBeLessThan(500);
    await expectNoPurchaseGranted(res);
  });
});

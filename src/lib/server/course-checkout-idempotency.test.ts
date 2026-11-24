/**
 * GP-783: a double-click or a retry on "Buy course" must reuse ONE Stripe Checkout Session.
 *
 * The fake below behaves like Stripe's idempotency layer: a request carrying a key it has seen
 * gets the stored session back (or the in-flight one, which is what the Stripe library's 409
 * retry reaches); the same key with different parameters is refused, as Stripe refuses it; a
 * request with no key always opens a new session. On main, `createStripeCheckoutForCourse` sent
 * no key, so every click opened its own session.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type CreateOptions = { idempotencyKey?: string; maxNetworkRetries?: number } | undefined;

const stripe = vi.hoisted(() => {
  const state = {
    created: 0,
    byKey: new Map<string, { params: string; result: Promise<{ id: string; url: string }> }>(),
    calls: [] as { params: Record<string, unknown>; options: CreateOptions }[],
    loseNextResponse: false,
  };
  async function create(params: Record<string, unknown>, options?: CreateOptions) {
    state.calls.push({ params, options });
    const serialised = JSON.stringify(params);
    const key = options?.idempotencyKey;
    if (key) {
      const seen = state.byKey.get(key);
      if (seen) {
        if (seen.params !== serialised) {
          throw Object.assign(
            new Error('Keys for idempotent requests can only be used with the same parameters'),
            {
              type: 'StripeIdempotencyError',
            }
          );
        }
        return seen.result;
      }
    }
    const result = (async () => {
      await new Promise((r) => setTimeout(r, 20));
      state.created += 1;
      const id = `cs_test_${state.created}`;
      return { id, url: `https://checkout.stripe.test/${id}` };
    })();
    if (key) state.byKey.set(key, { params: serialised, result });
    const session = await result;
    if (state.loseNextResponse) {
      state.loseNextResponse = false;
      throw Object.assign(new Error('socket hang up'), { type: 'StripeConnectionError' });
    }
    return session;
  }
  return { state, create };
});

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: stripe.create } } }),
}));

// Route-level cover: the real route and the real checkout helper, with the database and catalogue
// faked as in course-checkout-route.test.ts. Only Stripe is the idempotent fake above.
const db = vi.hoisted(() => ({
  findUser: vi.fn(),
  findEnrollment: vi.fn(),
  publishedCourse: vi.fn(),
  dbCourse: vi.fn(),
}));
vi.mock('@/lib/auth/session-jwt', () => ({ verifySessionToken: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseForCheckout: db.publishedCourse,
}));
vi.mock('@/lib/server/entitlements', () => ({ getEntitlements: vi.fn() }));
vi.mock('@/lib/server/course-catalog-sync', () => ({ getOrCreateCourseBySlug: db.dbCourse }));
vi.mock('@/lib/server/user-discounts', () => ({
  findActiveUserDiscount: vi.fn().mockResolvedValue(null),
  audToUnitCents: (n: number) => Math.round(n * 100),
  computeDiscountedAud: (n: number) => n,
  STRIPE_MIN_UNIT_AMOUNT_CENTS: 50,
}));
vi.mock('@/lib/server/first-lesson', () => ({
  getFirstLessonLearnPath: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));
vi.mock('@/lib/server/event-attribution', () => ({
  readAttributionJourneyId: vi.fn().mockReturnValue(null),
  tryRecordAttributedStage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: db.findUser },
    lmsEnrollment: { findUnique: db.findEnrollment },
  },
}));

const { createStripeCheckoutForCourse } = await import('@/lib/server/local-course-checkout');
const { POST } = await import('../../../app/api/lms/checkout/route');

const COURSE = {
  title: 'Water Damage Restoration Fundamentals',
  price_aud: '299',
  short_description: 'Water damage basics',
} as unknown as Parameters<typeof createStripeCheckoutForCourse>[0]['course'];

function purchase(overrides: Partial<Parameters<typeof createStripeCheckoutForCourse>[0]> = {}) {
  return {
    slug: 'water-damage-restoration-fundamentals',
    course: COURSE,
    success_url: 'https://carsi.example.test/dashboard/learn/water?checkout=success',
    cancel_url: 'https://carsi.example.test/courses/water?checkout=cancelled',
    customer_email: 'buyer@example.test',
    student_id: 'student-1',
    unit_amount_cents: 29900,
    extra_metadata: { utm_source: 'newsletter' },
    analytics_consent: true,
    ...overrides,
  };
}

beforeEach(() => {
  stripe.state.created = 0;
  stripe.state.byKey.clear();
  stripe.state.calls.length = 0;
  stripe.state.loseNextResponse = false;
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.PURCHASE_SURVEY_ENABLED;
});

describe('Buy course: one Stripe checkout session per purchase (GP-783)', () => {
  it('a double-click (two identical requests, one after the other) returns the same session', async () => {
    const first = await createStripeCheckoutForCourse(purchase());
    const second = await createStripeCheckoutForCourse(purchase());

    expect(second.checkout_session_id).toBe(first.checkout_session_id);
    expect(second.checkout_url).toBe(first.checkout_url);
    expect(stripe.state.created).toBe(1);
  });

  it('two identical requests in flight at the same time return the same session', async () => {
    const [a, b] = await Promise.all([
      createStripeCheckoutForCourse(purchase()),
      createStripeCheckoutForCourse(purchase()),
    ]);

    expect(b.checkout_session_id).toBe(a.checkout_session_id);
    expect(stripe.state.created).toBe(1);
  });

  it('a retry after Stripe created the session but the response was lost gets that session', async () => {
    stripe.state.loseNextResponse = true;
    await expect(createStripeCheckoutForCourse(purchase())).rejects.toThrow('socket hang up');

    const retry = await createStripeCheckoutForCourse(purchase());

    expect(retry.checkout_session_id).toBe('cs_test_1');
    expect(stripe.state.created).toBe(1);
  });

  it('a team purchase repeated with the same seats returns the same session', async () => {
    const team = purchase({ purchase_mode: 'team', quantity: 5, team_seat_count: 5 });
    const first = await createStripeCheckoutForCourse(team);
    const second = await createStripeCheckoutForCourse(team);

    expect(second.checkout_session_id).toBe(first.checkout_session_id);
    expect(stripe.state.created).toBe(1);
  });

  it('a different purchase gets its own session, and Stripe never sees one key with two requests', async () => {
    const variants = [
      purchase(),
      purchase({
        slug: 'mould-remediation',
        course: { ...COURSE, title: 'Mould' } as typeof COURSE,
      }),
      purchase({ unit_amount_cents: 19900 }),
      purchase({ purchase_mode: 'team', quantity: 3, team_seat_count: 3 }),
      purchase({ purchase_mode: 'team', quantity: 4, team_seat_count: 4 }),
      purchase({ customer_email: 'someone-else@example.test', student_id: 'student-2' }),
      purchase({ extra_metadata: { utm_source: 'newsletter', discount_id: 'disc-1' } }),
      purchase({ analytics_consent: false }),
      purchase({ cancel_url: 'https://carsi.example.test/pricing' }),
    ];
    const ids = [];
    for (const v of variants)
      ids.push((await createStripeCheckoutForCourse(v)).checkout_session_id);

    expect(new Set(ids).size).toBe(variants.length);
    expect(stripe.state.created).toBe(variants.length);
  });

  it('the same purchase after the repeat window gets a fresh session', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T08:00:00Z'));
    const first = await createStripeCheckoutForCourse(purchase());

    vi.setSystemTime(new Date('2026-11-23T09:00:00Z'));
    const later = await createStripeCheckoutForCourse(purchase());

    expect(later.checkout_session_id).not.toBe(first.checkout_session_id);
    expect(stripe.state.created).toBe(2);
  });

  it('named limit: the window is a fixed 10-minute bucket, so two clicks either side of its edge get two sessions', async () => {
    // A repeat t seconds after the first click misses with chance about t/600 (t = 1 s: about
    // 0.17%). The second session is never charged unless the buyer pays it too. Pinned so a
    // change to the window is a deliberate one.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T08:09:59.500Z'));
    const before = await createStripeCheckoutForCourse(purchase());
    vi.setSystemTime(new Date('2026-11-23T08:10:00.100Z'));
    const after = await createStripeCheckoutForCourse(purchase());
    vi.setSystemTime(new Date('2026-11-23T08:19:59.000Z'));
    const sameBucket = await createStripeCheckoutForCourse(purchase());

    expect(after.checkout_session_id).not.toBe(before.checkout_session_id);
    expect(sameBucket.checkout_session_id).toBe(after.checkout_session_id);
    expect(stripe.state.created).toBe(2);
  });

  it('every course checkout call carries a key that names no buyer, and retries a key in use', async () => {
    await createStripeCheckoutForCourse(purchase());

    const { options } = stripe.state.calls[0];
    expect(options?.idempotencyKey).toMatch(/^carsi:course:[0-9a-f]{40}:\d+$/);
    expect(options?.idempotencyKey).not.toContain('buyer@example.test');
    expect(options?.idempotencyKey).not.toContain('student-1');
    // A second click arriving mid-create gets 409 "key in use"; the Stripe library retries it.
    expect(options?.maxNetworkRetries ?? 0).toBeGreaterThanOrEqual(3);
  });
});

describe('POST /api/lms/checkout: a repeated Buy course returns the first session (GP-783)', () => {
  const SLUG = 'water-damage-restoration-fundamentals';
  const BODY = {
    slug: SLUG,
    customer_email: 'guest@example.test',
    guest_checkout: true,
    analytics_consent: 'granted',
  };

  function post(body: Record<string, unknown>) {
    return POST(
      new NextRequest('https://carsi.example.test/api/lms/checkout', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: 'carsi_utm=%7B%22utm_source%22%3A%22newsletter%22%7D',
        },
        body: JSON.stringify(body),
      })
    );
  }

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://configured';
    process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic';
    db.findUser.mockReset().mockResolvedValue(null);
    db.findEnrollment.mockReset().mockResolvedValue(null);
    db.publishedCourse
      .mockReset()
      .mockResolvedValue({ slug: SLUG, title: 'Water', price_aud: 299, is_free: false });
    db.dbCourse
      .mockReset()
      .mockResolvedValue({
        id: 'course-water',
        slug: SLUG,
        meta: null,
        priceAud: 299,
        isFree: false,
      });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('two identical POSTs (a double-click) get the same checkout_url and Stripe opens one session', async () => {
    const [a, b] = await Promise.all([post(BODY), post(BODY)]);
    const [ja, jb] = (await Promise.all([a.json(), b.json()])) as { checkout_url?: string }[];

    expect([a.status, b.status]).toEqual([200, 200]);
    expect(jb.checkout_url).toBe(ja.checkout_url);
    expect(stripe.state.created).toBe(1);
  });

  it('pressing Buy again later in the window, with the survey on and the same tab key, gets the same session', async () => {
    process.env.PURCHASE_SURVEY_ENABLED = 'true';
    const tabKey = '0123456789abcdef0123456789abcdef';
    const first = (await (await post({ ...BODY, survey_key: tabKey })).json()) as {
      checkout_url?: string;
    };
    const again = (await (await post({ ...BODY, survey_key: tabKey })).json()) as {
      checkout_url?: string;
    };

    expect(again.checkout_url).toBe(first.checkout_url);
    expect(stripe.state.created).toBe(1);
  });

  it('a team purchase with different seats is a different purchase', async () => {
    const three = (await (
      await post({ ...BODY, purchase_mode: 'team', team_seat_count: 3 })
    ).json()) as {
      checkout_url?: string;
    };
    const four = (await (
      await post({ ...BODY, purchase_mode: 'team', team_seat_count: 4 })
    ).json()) as {
      checkout_url?: string;
    };

    expect(four.checkout_url).not.toBe(three.checkout_url);
    expect(stripe.state.created).toBe(2);
  });
});

/**
 * GP-760 (Codex review of 995a41a0, P1): checkout acts on ONE credential, chosen by the shared rule
 * in session-credential.ts (Bearer, then auth_token, then carsi_token; the first one the database
 * confirms as current). A stale credential must not hide a current one supplied beside it, and the
 * buyer (student_id) and the payer email must come from the same credential.
 *
 * The real resolveCheckoutEmail is used here (only the Stripe call is mocked), so the payer-email
 * assertions test the route's actual email rule, not a constant.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const L2 = 'level-2-mould-remediation-30ee3492';
const SLUG = 'mould-remediation-fundamentals';

/** Signed tokens this test knows. `sg` is the session generation the token carries. */
const TOKENS: Record<string, { sub: string; email: string; full_name: string; role: string; sg: number }> = {
  'stale-cookie': { sub: 'u-cookie-old', email: 'old-cookie@example.com.au', full_name: 'O', role: 'student', sg: 1 },
  'current-cookie': { sub: 'u-cookie', email: 'cookie@example.com.au', full_name: 'C', role: 'student', sg: 0 },
  'stale-bearer': { sub: 'u-bearer-old', email: 'old-bearer@example.com.au', full_name: 'P', role: 'student', sg: 1 },
  'current-bearer': { sub: 'u-bearer', email: 'bearer@example.com.au', full_name: 'B', role: 'student', sg: 0 },
};

const mocks = vi.hoisted(() => ({
  createStripe: vi.fn(),
  completed: vi.fn(),
  dbCourse: vi.fn(),
  activeLearner: vi.fn(),
}));

vi.mock('@/lib/auth/session-jwt', () => ({
  verifySessionToken: vi.fn(async (token: string) => TOKENS[token] ?? null),
}));
vi.mock('@/lib/server/local-course-checkout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/local-course-checkout')>()),
  createStripeCheckoutForCourse: mocks.createStripe,
}));
vi.mock('@/lib/server/lms-admin-now', () => ({ isLmsSessionAdminNow: vi.fn(async () => false) }));
vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseForCheckout: vi.fn(async () => ({
    slug: SLUG,
    title: 'CARSI Mould Remediation Practitioner',
    price_aud: 99,
    is_free: false,
  })),
}));
vi.mock('@/lib/server/entitlements', () => ({
  getEntitlements: vi.fn(async () => ({ entitledCourseIds: null })),
}));
vi.mock('@/lib/server/course-catalog-sync', () => ({ getOrCreateCourseBySlug: mocks.dbCourse }));
vi.mock('@/lib/server/user-discounts', () => ({
  findActiveUserDiscount: vi.fn(async () => null),
  audToUnitCents: (n: number) => Math.round(n * 100),
  computeDiscountedAud: (n: number) => n,
  STRIPE_MIN_UNIT_AMOUNT_CENTS: 50,
}));
vi.mock('@/lib/server/guest-checkout', () => ({
  isActiveLearnerId: mocks.activeLearner,
  isInactiveAccountEmail: vi.fn(async () => false),
  isReservedGuestCheckoutEmail: vi.fn(async () => false),
}));
vi.mock('@/lib/server/paid-course-ownership', () => ({
  findActivePaidCourseOwnership: vi.fn(async () => null),
  alreadyEnrolledCheckoutPayload: vi.fn(() => ({})),
}));
vi.mock('@/lib/server/first-lesson', () => ({ getFirstLessonLearnPath: vi.fn(async () => null) }));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));
vi.mock('@/lib/server/event-attribution', () => ({
  readAttributionJourneyId: vi.fn().mockReturnValue(null),
  tryRecordAttributedStage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: {
      findMany: vi.fn(async () => [{ id: 'crs-l2', slug: L2, title: 'Level 2 — Mould Remediation' }]),
    },
    lmsEnrollment: { findMany: mocks.completed },
    // The database has every user active at session generation 0 (readLmsUserNow).
    $queryRaw: vi.fn(async (_s: TemplateStringsArray, userId: string) => [
      {
        id: userId,
        email: `${userId}@example.com.au`,
        full_name: 'U',
        is_active: true,
        role: null,
        session_generation: 0,
        role_names: ['student'],
      },
    ]),
  },
}));

const { POST } = await import('../../../app/api/lms/checkout/route');

function request(opts: { cookie?: string; bearer?: string; email?: string }): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/checkout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(opts.cookie ? { cookie: `auth_token=${opts.cookie}` } : {}),
      ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
    },
    body: JSON.stringify({ slug: SLUG, customer_email: opts.email ?? 'typed@example.com.au' }),
  });
}

function stripeCall(): { student_id?: string; customer_email?: string } {
  expect(mocks.createStripe).toHaveBeenCalledTimes(1);
  return mocks.createStripe.mock.calls[0][0] as { student_id?: string; customer_email?: string };
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic';
  vi.clearAllMocks();
  mocks.createStripe.mockResolvedValue({ checkout_url: 'https://checkout.stripe.test/cs_new', checkout_session_id: 'cs_new' });
  // The buyer has completed the prerequisite (Codex reproduction).
  mocks.completed.mockResolvedValue([{ courseId: 'crs-l2' }]);
  mocks.activeLearner.mockResolvedValue(true);
  mocks.dbCourse.mockResolvedValue({
    id: 'crs-mould',
    slug: SLUG,
    priceAud: 99,
    isFree: false,
    meta: { prerequisites: [{ courseSlug: L2 }] },
  });
});

describe('GP-760 checkout: one rule for which session credential wins', () => {
  it('a stale cookie does not block a current Bearer buyer; buyer and payer are the Bearer user', async () => {
    const res = await POST(request({ cookie: 'stale-cookie', bearer: 'current-bearer' }));
    expect(res.status).toBe(200);
    const call = stripeCall();
    expect(call.student_id).toBe('u-bearer');
    expect(call.customer_email).toBe('bearer@example.com.au');
  });

  it('a stale Bearer does not block a current cookie buyer; buyer and payer are the cookie user', async () => {
    const res = await POST(request({ cookie: 'current-cookie', bearer: 'stale-bearer' }));
    expect(res.status).toBe(200);
    const call = stripeCall();
    expect(call.student_id).toBe('u-cookie');
    expect(call.customer_email).toBe('cookie@example.com.au');
  });

  it('both stale: 401 inactive_account, no Stripe session', async () => {
    const res = await POST(request({ cookie: 'stale-cookie', bearer: 'stale-bearer' }));
    const body = (await res.json()) as { code?: string };
    expect(res.status).toBe(401);
    expect(body.code).toBe('inactive_account');
    expect(mocks.createStripe).not.toHaveBeenCalled();
  });

  it('both current: the Bearer credential wins (the shared order), identity and email together', async () => {
    const res = await POST(request({ cookie: 'current-cookie', bearer: 'current-bearer' }));
    expect(res.status).toBe(200);
    const call = stripeCall();
    expect(call.student_id).toBe('u-bearer');
    expect(call.customer_email).toBe('bearer@example.com.au');
  });

  it('a current Bearer buyer pays as themselves, not as a typed email', async () => {
    const res = await POST(request({ bearer: 'current-bearer', email: 'someone-else@example.com.au' }));
    expect(res.status).toBe(200);
    const call = stripeCall();
    expect(call.student_id).toBe('u-bearer');
    expect(call.customer_email).toBe('bearer@example.com.au');
  });

  it('no credentials: guest checkout is unchanged (typed email, no student id)', async () => {
    mocks.dbCourse.mockResolvedValue({ id: 'crs-x', slug: 'x', priceAud: 99, isFree: false, meta: null });
    const res = await POST(request({ email: 'guest@example.com.au' }));
    expect(res.status).toBe(200);
    const call = stripeCall();
    expect(call.student_id).toBeUndefined();
    expect(call.customer_email).toBe('guest@example.com.au');
  });

  it('a token without a valid signature is not a session: guest checkout with the typed email', async () => {
    mocks.dbCourse.mockResolvedValue({ id: 'crs-x', slug: 'x', priceAud: 99, isFree: false, meta: null });
    const res = await POST(request({ cookie: 'not-a-signed-token', email: 'guest@example.com.au' }));
    expect(res.status).toBe(200);
    const call = stripeCall();
    expect(call.student_id).toBeUndefined();
    expect(call.customer_email).toBe('guest@example.com.au');
  });
});

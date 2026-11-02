/**
 * DECISIONS #41 — `POST /api/lms/checkout` is the PAID prerequisite gate: it must refuse
 * BEFORE any Stripe session is opened, because the paid fulfilment path does not refuse
 * after the money is taken. Uses the real prerequisite adapter over a mocked Prisma.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const L2 = 'level-2-mould-remediation-30ee3492';
const SLUG = 'mould-remediation-fundamentals';

const mocks = vi.hoisted(() => ({
  createStripe: vi.fn(),
  verifySession: vi.fn(),
  completed: vi.fn(),
  dbCourse: vi.fn(),
}));

vi.mock('@/lib/auth/session-jwt', () => ({ verifySessionToken: mocks.verifySession }));
vi.mock('@/lib/server/local-course-checkout', () => ({
  resolveCheckoutEmail: vi.fn(async () => 'learner@example.com.au'),
  createStripeCheckoutForCourse: mocks.createStripe,
}));
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
  isActiveLearnerId: vi.fn(async () => true),
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
  },
}));

const { POST } = await import('../../../app/api/lms/checkout/route');

function request(signedIn: boolean): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/checkout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(signedIn ? { cookie: 'auth_token=tok' } : {}),
    },
    body: JSON.stringify({ slug: SLUG, customer_email: 'learner@example.com.au' }),
  });
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic';
  vi.clearAllMocks();
  mocks.createStripe.mockResolvedValue({ checkout_url: 'https://checkout.stripe.test/cs_new', checkout_session_id: 'cs_new' });
  mocks.verifySession.mockResolvedValue({ sub: 'stu', email: 'learner@example.com.au', full_name: 'L', role: 'student' });
  mocks.completed.mockResolvedValue([]);
  mocks.dbCourse.mockResolvedValue({
    id: 'crs-mould',
    slug: SLUG,
    priceAud: 99,
    isFree: false,
    meta: { prerequisites: [{ courseSlug: L2 }] },
  });
});

describe('checkout — prerequisite gate', () => {
  it('refuses (403) and opens no Stripe session when the prerequisite is not completed', async () => {
    const res = await POST(request(true));
    const body = (await res.json()) as { code?: string; detail?: string; prerequisites?: { slug: string }[] };
    expect(res.status).toBe(403);
    expect(body.code).toBe('prerequisite_not_met');
    expect(body.detail).toMatch(/^Complete Level 2 — Mould Remediation first\./);
    expect(body.prerequisites?.[0]?.slug).toBe(L2);
    expect(mocks.createStripe).not.toHaveBeenCalled();
  });

  it('a guest (no session) must sign in first (401), no Stripe session', async () => {
    const res = await POST(request(false));
    const body = (await res.json()) as { code?: string };
    expect(res.status).toBe(401);
    expect(body.code).toBe('prerequisite_sign_in_required');
    expect(mocks.createStripe).not.toHaveBeenCalled();
  });

  it('reaches Stripe once the prerequisite is completed', async () => {
    mocks.completed.mockResolvedValue([{ courseId: 'crs-l2' }]);
    const res = await POST(request(true));
    expect(res.status).toBe(200);
    expect(mocks.createStripe).toHaveBeenCalledTimes(1);
  });

  it('an admin reaches Stripe without the prerequisite', async () => {
    mocks.verifySession.mockResolvedValue({ sub: 'adm', email: 'a@carsi.com.au', full_name: 'A', role: 'admin' });
    const res = await POST(request(true));
    expect(res.status).toBe(200);
    expect(mocks.createStripe).toHaveBeenCalledTimes(1);
  });

  it('a course with no prerequisites is unaffected (no prerequisite lookups)', async () => {
    mocks.dbCourse.mockResolvedValue({ id: 'crs-x', slug: 'x', priceAud: 99, isFree: false, meta: null });
    const res = await POST(request(false));
    expect(res.status).toBe(200);
    expect(mocks.completed).not.toHaveBeenCalled();
  });

  it('a lookup failure is a 503, never a charge on doubt', async () => {
    mocks.completed.mockRejectedValue(new Error('db down'));
    const res = await POST(request(true));
    expect(res.status).toBe(503);
    expect(mocks.createStripe).not.toHaveBeenCalled();
  });
});

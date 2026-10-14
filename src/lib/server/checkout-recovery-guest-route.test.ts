/**
 * Review P1 (abuse): POST /api/lms/checkout accepts `customer_email` from unauthenticated
 * callers. With CHECKOUT_RECOVERY_ENABLED on, recovery must NOT be attached to such a session,
 * or anyone could make CARSI email recovery links to any address. Only a signed-in user whose
 * account is verified and whose stored email is the checkout email gets recovery.
 * Uses the real checkout-session builder; only Stripe, auth and data access are stubbed.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  verifySession: vi.fn(),
  findUser: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.createSession } } }),
}));
vi.mock('@/lib/auth/session-jwt', () => ({ verifySessionToken: mocks.verifySession }));
vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseForCheckout: vi.fn().mockResolvedValue({
    slug: 'water-damage-essentials',
    title: 'Water Damage Restoration — Essentials',
    price_aud: 29,
    is_free: false,
  }),
}));
vi.mock('@/lib/server/entitlements', () => ({
  getEntitlements: vi.fn().mockResolvedValue({ entitledCourseIds: null }),
}));
vi.mock('@/lib/server/first-lesson', () => ({ getFirstLessonLearnPath: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));
vi.mock('@/lib/server/event-attribution', () => ({
  readAttributionJourneyId: vi.fn().mockReturnValue(null),
  tryRecordAttributedStage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/server/user-discounts', () => ({
  findActiveUserDiscount: vi.fn().mockResolvedValue(null),
  audToUnitCents: (n: number) => Math.round(n * 100),
  computeDiscountedAud: (n: number) => n,
  STRIPE_MIN_UNIT_AMOUNT_CENTS: 50,
}));
vi.mock('@/lib/prisma', () => ({ prisma: { lmsUser: { findUnique: mocks.findUser } } }));

const { POST } = await import('../../../app/api/lms/checkout/route');

const ORIGINAL_ENV = { ...process.env };

function request(body: Record<string, unknown>, cookie?: string): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function sessionParams() {
  expect(mocks.createSession).toHaveBeenCalledTimes(1);
  return mocks.createSession.mock.calls[0][0] as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.DATABASE_URL; // skip the ownership/DB-price path; not under test here
  process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic';
  process.env.CHECKOUT_RECOVERY_ENABLED = 'true';
  mocks.createSession.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' });
  mocks.verifySession.mockResolvedValue(null);
  mocks.findUser.mockResolvedValue(null);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('POST /api/lms/checkout — recovery only for verified signed-in buyers', () => {
  it('an unauthenticated request with an arbitrary customer_email gets no recovery', async () => {
    const res = await POST(
      request({ slug: 'water-damage-essentials', customer_email: 'victim@example.com', guest_checkout: true })
    );
    expect(res.status).toBe(200);
    const params = sessionParams();
    expect(params.customer_email).toBe('victim@example.com');
    expect(params).not.toHaveProperty('after_expiration');
    expect(mocks.findUser).not.toHaveBeenCalled();
  });

  it('a signed-in, verified user checking out with their own email gets recovery', async () => {
    mocks.verifySession.mockResolvedValue({ sub: 'user-1', email: 'buyer@example.com' });
    mocks.findUser.mockResolvedValue({ email: 'Buyer@example.com', isVerified: true });
    const res = await POST(request({ slug: 'water-damage-essentials' }, 'auth_token=signed'));
    expect(res.status).toBe(200);
    expect(sessionParams().after_expiration).toEqual({
      recovery: { enabled: true, allow_promotion_codes: false },
    });
  });

  it('a signed-in but unverified account gets no recovery', async () => {
    mocks.verifySession.mockResolvedValue({ sub: 'user-1', email: 'buyer@example.com' });
    mocks.findUser.mockResolvedValue({ email: 'buyer@example.com', isVerified: false });
    await POST(request({ slug: 'water-damage-essentials' }, 'auth_token=signed'));
    expect(sessionParams()).not.toHaveProperty('after_expiration');
  });

  it('a verified user paying with a different (body) email gets no recovery', async () => {
    mocks.verifySession.mockResolvedValue({ sub: 'user-1' }); // token carries no email
    mocks.findUser.mockResolvedValue({ email: 'buyer@example.com', isVerified: true });
    await POST(
      request({ slug: 'water-damage-essentials', customer_email: 'victim@example.com' }, 'auth_token=signed')
    );
    const params = sessionParams();
    expect(params.customer_email).toBe('victim@example.com');
    expect(params).not.toHaveProperty('after_expiration');
  });

  it('with the flag off, nobody gets recovery', async () => {
    delete process.env.CHECKOUT_RECOVERY_ENABLED;
    mocks.verifySession.mockResolvedValue({ sub: 'user-1', email: 'buyer@example.com' });
    mocks.findUser.mockResolvedValue({ email: 'buyer@example.com', isVerified: true });
    await POST(request({ slug: 'water-damage-essentials' }, 'auth_token=signed'));
    expect(sessionParams()).not.toHaveProperty('after_expiration');
  });
});

/**
 * Route-level cover for `POST /api/lms/subscription/checkout`.
 *
 * The guard's own branches are unit-tested in `membership-checkout-guard.test.ts`;
 * what matters here is that the route consults it BEFORE Stripe is called on
 * either path. A guard that runs after `checkout.sessions.create` would still
 * return a tidy 409 while having already opened the duplicate subscription.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sessionsCreate: vi.fn(),
  claims: vi.fn(),
  eligible: vi.fn(),
  findUnique: vi.fn(),
  proAnnualPriceId: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.sessionsCreate } } }),
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: mocks.claims,
}));

vi.mock('@/lib/server/ccw-attendance/attendee-offer', () => ({
  learnerIsCcwAttendeeOfferEligible: mocks.eligible,
}));

vi.mock('@/lib/server/subscription-price', () => ({
  resolveProAnnualPriceId: mocks.proAnnualPriceId,
}));

vi.mock('@/lib/server/event-attribution', () => ({
  readAttributionJourneyId: vi.fn().mockReturnValue(null),
  tryRecordAttributedStage: vi.fn().mockResolvedValue(undefined),
}));

// The guard itself is NOT mocked — only the database under it — so this exercises
// the real decision path the route depends on.
vi.mock('@/lib/prisma', () => ({
  prisma: { lmsSubscription: { findUnique: mocks.findUnique } },
}));

const { POST } = await import('../../../app/api/lms/subscription/checkout/route');

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/subscription/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic';
  process.env.SUBSCRIPTIONS_ENABLED = 'true';
  mocks.sessionsCreate.mockReset();
  mocks.sessionsCreate.mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.example/session' });
  mocks.claims.mockReset();
  mocks.claims.mockResolvedValue({ sub: 'user-1', email: 'attendee@example.test' });
  mocks.eligible.mockReset();
  mocks.eligible.mockResolvedValue(true);
  mocks.findUnique.mockReset();
  mocks.findUnique.mockResolvedValue(null);
  mocks.proAnnualPriceId.mockReset();
  mocks.proAnnualPriceId.mockResolvedValue('price_synthetic_annual');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('a learner who already holds a live membership', () => {
  it('is refused the $295 attendee checkout, and Stripe is never called', async () => {
    mocks.findUnique.mockResolvedValue({ status: 'active', currentPeriodEnd: null });

    const res = await POST(request({ attendeeOffer: true }));

    expect(res.status).toBe(409);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('is refused the regular $795 checkout, and Stripe is never called', async () => {
    mocks.findUnique.mockResolvedValue({ status: 'active', currentPeriodEnd: null });

    const res = await POST(request({}));

    expect(res.status).toBe(409);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('is refused before eligibility is even consulted', async () => {
    mocks.findUnique.mockResolvedValue({ status: 'trialing', currentPeriodEnd: null });

    await POST(request({ attendeeOffer: true }));

    expect(mocks.eligible).not.toHaveBeenCalled();
  });
});

describe('an unverifiable membership state', () => {
  it('opens no checkout when the subscription lookup throws', async () => {
    mocks.findUnique.mockRejectedValue(new Error('connection refused'));

    const res = await POST(request({ attendeeOffer: true }));

    expect(res.status).toBe(503);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('a learner with no membership', () => {
  it('still reaches the attendee checkout', async () => {
    const res = await POST(request({ attendeeOffer: true }));

    expect(res.status).toBe(200);
    expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
    const params = mocks.sessionsCreate.mock.calls[0][0];
    expect(params.mode).toBe('subscription');
    // AC-4 / AC-8: bound to the authenticated learner, never a supplied email.
    expect(params.metadata.carsi_user_id).toBe('user-1');
    // AC-10: the discount is never reachable as a public promotion code.
    expect(params.allow_promotion_codes).toBe(false);
  });

  it('still reaches the regular checkout', async () => {
    const res = await POST(request({}));

    expect(res.status).toBe(200);
    expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
    expect(mocks.sessionsCreate.mock.calls[0][0].metadata.plan).toBe('pro_annual');
  });

  it('is still refused the attendee price when not offer-eligible', async () => {
    mocks.eligible.mockResolvedValue(false);

    const res = await POST(request({ attendeeOffer: true }));

    expect(res.status).toBe(403);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('an unauthenticated caller', () => {
  it('is refused before any membership lookup', async () => {
    mocks.claims.mockResolvedValue(null);

    const res = await POST(request({ attendeeOffer: true }));

    expect(res.status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});

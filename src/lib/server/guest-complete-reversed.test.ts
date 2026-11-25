/**
 * Route-level cover for `POST /api/lms/enrollments/guest-complete` (GP-790).
 *
 * A reversed (refunded, or disputed and not won) Checkout Session answers PAYMENT_REVERSED
 * (HTTP 403) on every branch of the route, never "ok, sign in". The established-account branch
 * used to return before any fulfilment ran, so the guard added to the enrolment writer never
 * reached it. The marker is read before any account is found or claimed, self or team.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  retrieve: vi.fn(),
  reversed: vi.fn(),
  findOrCreateGuestUser: vi.fn(),
  fulfil: vi.fn(),
  sign: vi.fn(),
  resolved: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { retrieve: mocks.retrieve } } }),
}));
vi.mock('@/lib/server/payment-integrity-ledger', () => ({
  PAYMENT_REVERSED: 'PAYMENT_REVERSED',
  PAYMENT_REVERSED_BODY: { detail: 'This payment was reversed.', code: 'PAYMENT_REVERSED' },
  isCheckoutPaymentReversed: mocks.reversed,
  markUnfulfilledPaymentResolved: mocks.resolved,
}));
vi.mock('@/lib/server/guest-checkout', () => ({ findOrCreateGuestUser: mocks.findOrCreateGuestUser }));
vi.mock('@/lib/server/team-course-purchase', () => ({ fulfillCourseCheckoutForUser: mocks.fulfil }));
vi.mock('@/lib/auth/session-jwt', () => ({ signSessionToken: mocks.sign }));
vi.mock('@/lib/server/crm-enrollment-notify', () => ({ notifyCrmEnrollmentCreated: vi.fn() }));
vi.mock('@/lib/server/enrollment-email', () => ({
  sendEnrollmentWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/server/teams', () => ({ getTeamForUser: vi.fn() }));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));

const { POST } = await import('../../../app/api/lms/enrollments/guest-complete/route');

const SESSION_ID = 'cs_test_refunded_1';

function request(): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/enrollments/guest-complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session_id: SESSION_ID, password: 'a-long-enough-password' }),
  });
}

function paidSession(purchaseMode: 'self' | 'team') {
  return {
    payment_status: 'paid',
    customer_email: 'buyer@example.test',
    metadata: { course_slug: 'water-damage-basics', purchase_mode: purchaseMode },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DATABASE_URL = 'postgres://test.invalid/carsi';
  process.env.STRIPE_SECRET_KEY = 'stripe-not-configured-test-value';
  mocks.reversed.mockResolvedValue(false);
  mocks.sign.mockResolvedValue('signed-token');
  mocks.resolved.mockResolvedValue(undefined);
  mocks.fulfil.mockResolvedValue({
    kind: 'self',
    alreadyEnrolled: true,
    redirectPath: '/dashboard/learn/water-damage-basics',
  });
});

describe('POST /api/lms/enrollments/guest-complete — reversed session', () => {
  it.each(['self', 'team'] as const)(
    'refuses a reversed %s session for an established account, before any account is found',
    async (mode) => {
      mocks.retrieve.mockResolvedValue(paidSession(mode));
      mocks.reversed.mockResolvedValue(true);
      mocks.findOrCreateGuestUser.mockResolvedValue({ status: 'exists' });

      const res = await POST(request());

      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ code: 'PAYMENT_REVERSED' });
      expect(mocks.reversed).toHaveBeenCalledWith(expect.anything(), SESSION_ID);
      expect(mocks.findOrCreateGuestUser).not.toHaveBeenCalled();
      expect(mocks.fulfil).not.toHaveBeenCalled();
      expect(res.headers.get('set-cookie')).toBeNull();
    },
  );

  it('refuses a reversed session for a new account: nothing is created, claimed or signed in', async () => {
    mocks.retrieve.mockResolvedValue(paidSession('self'));
    mocks.reversed.mockResolvedValue(true);
    mocks.findOrCreateGuestUser.mockResolvedValue({
      status: 'created',
      claims: { sub: 'student-1', email: 'buyer@example.test' },
    });

    const res = await POST(request());

    expect(res.status).toBe(403);
    expect(mocks.findOrCreateGuestUser).not.toHaveBeenCalled();
    expect(mocks.fulfil).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('still tells an established account with a paid, not-reversed session to sign in', async () => {
    mocks.retrieve.mockResolvedValue(paidSession('self'));
    mocks.findOrCreateGuestUser.mockResolvedValue({ status: 'exists' });

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, requires_sign_in: true });
    expect(mocks.findOrCreateGuestUser).toHaveBeenCalledTimes(1);
  });
});

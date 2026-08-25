/**
 * Route-level cover for `POST /api/lms/subscription/checkout`.
 *
 * The guard's own branches are unit-tested in `membership-checkout-guard.test.ts`;
 * what matters here is that the route consults it BEFORE Stripe is called. A
 * guard that runs after `checkout.sessions.create` would still return a tidy 409
 * while having already opened the duplicate subscription.
 *
 * There is ONE checkout path. The CCW attendee A$295 branch was removed on
 * 2026-08-25 — see the regression block at the end, which keeps
 * `CCW_MEMBERSHIP_COUPON_ID` set precisely to prove it no longer does anything.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sessionsCreate: vi.fn(),
  claims: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  proAnnualPriceId: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.sessionsCreate } } }),
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: mocks.claims,
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
  prisma: {
    lmsSubscription: {
      findUnique: mocks.findUnique,
      create: mocks.create,
      updateMany: mocks.updateMany,
      deleteMany: mocks.deleteMany,
    },
  },
}));

/** What Prisma throws when the unique `userId` already has a row. */
function uniqueViolation() {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
}

/**
 * A `create` that behaves like the real unique constraint: the first caller
 * wins, everyone after it gets P2002.
 */
function oneWinnerCreate() {
  let taken = false;
  return vi.fn(async () => {
    if (taken) throw uniqueViolation();
    taken = true;
    return {};
  });
}

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
  process.env.CCW_MEMBERSHIP_COUPON_ID = 'coupon_synthetic_once';
  mocks.sessionsCreate.mockReset();
  mocks.sessionsCreate.mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.example/session' });
  mocks.claims.mockReset();
  mocks.claims.mockResolvedValue({ sub: 'user-1', email: 'attendee@example.test' });
  mocks.findUnique.mockReset();
  mocks.findUnique.mockResolvedValue(null);
  mocks.create.mockReset();
  mocks.create.mockResolvedValue({});
  mocks.updateMany.mockReset();
  mocks.updateMany.mockResolvedValue({ count: 0 });
  mocks.deleteMany.mockReset();
  mocks.deleteMany.mockResolvedValue({ count: 0 });
  mocks.proAnnualPriceId.mockReset();
  mocks.proAnnualPriceId.mockResolvedValue('price_synthetic_annual');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('a learner who already holds a live membership', () => {
  it('is refused the $795 checkout, and Stripe is never called', async () => {
    mocks.findUnique.mockResolvedValue({ status: 'active', currentPeriodEnd: null });

    const res = await POST(request({}));

    expect(res.status).toBe(409);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('is refused on a trialing membership too, before Stripe is called', async () => {
    mocks.findUnique.mockResolvedValue({ status: 'trialing', currentPeriodEnd: null });

    const res = await POST(request({}));

    expect(res.status).toBe(409);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('an unverifiable membership state', () => {
  it('opens no checkout when the subscription lookup throws', async () => {
    mocks.findUnique.mockRejectedValue(new Error('connection refused'));

    const res = await POST(request({}));

    expect(res.status).toBe(503);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('a learner with no membership', () => {
  it('reaches the checkout', async () => {
    const res = await POST(request({}));

    expect(res.status).toBe(200);
    expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
    const params = mocks.sessionsCreate.mock.calls[0][0];
    expect(params.mode).toBe('subscription');
    expect(params.metadata.plan).toBe('pro_annual');
    // AC-4 / AC-8: bound to the authenticated learner, never a supplied email.
    expect(params.metadata.carsi_user_id).toBe('user-1');
    // Public checkout: promotion codes ARE allowed here. The attendee branch
    // had to omit this because Stripe rejects a session carrying both it and
    // `discounts`; with that branch gone, the ordinary behaviour stands.
    expect(params.allow_promotion_codes).toBe(true);
  });
});

describe('the removed CCW attendee discount stays removed', () => {
  // `CCW_MEMBERSHIP_COUPON_ID` is still set by `beforeEach`, deliberately: these
  // pass only because nothing reads it any more. If the attendee branch is ever
  // reintroduced, the env var is already present and these fail immediately.
  it('never sends a discount to Stripe, even with the coupon env var set', async () => {
    await POST(request({}));

    const params = mocks.sessionsCreate.mock.calls[0][0];
    expect(params.discounts).toBeUndefined();
    expect(params.line_items).toEqual([{ price: 'price_synthetic_annual', quantity: 1 }]);
  });

  it('ignores a legacy attendeeOffer body rather than honouring it', async () => {
    // Old clients and the old email link can still post this. It must buy the
    // standing A$795 membership at full price, never a discounted one.
    const res = await POST(request({ attendeeOffer: true, offer: 'ccw-attendee' }));

    expect(res.status).toBe(200);
    const params = mocks.sessionsCreate.mock.calls[0][0];
    expect(params.discounts).toBeUndefined();
    expect(params.metadata.plan).toBe('pro_annual');
  });

  it('never builds an inline recurring price', async () => {
    await POST(request({}));

    // A `price_data` line item with a recurring interval is what would make a
    // subscription renew at the discounted rate forever. It must not come back.
    expect(mocks.sessionsCreate.mock.calls[0][0].line_items[0].price_data).toBeUndefined();
  });

  it('refuses the checkout when the annual price cannot be resolved', async () => {
    mocks.proAnnualPriceId.mockResolvedValue(null);

    const res = await POST(request({}));

    expect(res.status).toBe(503);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('a second checkout while one is already open', () => {
  /**
   * What a mocked-Prisma test CAN prove: the route asks for a reservation before
   * calling Stripe, and honours a refusal by opening no session. What it CANNOT
   * prove is atomicity — that rests on the `userId` unique constraint and a
   * single conditional UPDATE, which are properties of Postgres, not of this
   * suite. `oneWinnerCreate` models the constraint (first insert wins, the rest
   * raise P2002) so the route is exercised against the behaviour the database
   * will actually give it.
   *
   * Deliberately sequential. A `Promise.all` version reads like a concurrency
   * test but proves no more than this one, and races Vitest's module registry:
   * two simultaneous `await import('@/lib/prisma')` calls from the guard let one
   * side resolve the REAL client, which then fails on a fake DATABASE_URL. A
   * test that fails for harness reasons is worse than one that is honest about
   * its scope.
   */
  it('is refused, and opens no second Stripe session', async () => {
    mocks.create.mockImplementation(oneWinnerCreate());

    const first = await POST(request({}));
    const second = await POST(request({}));

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
  });

  it('takes the reservation BEFORE calling Stripe, not after', async () => {
    const order: string[] = [];
    mocks.create.mockImplementation(async () => {
      order.push('reserve');
      return {};
    });
    mocks.sessionsCreate.mockImplementation(async () => {
      order.push('stripe');
      return { id: 'cs_test_1', url: 'https://checkout.example/session' };
    });

    await POST(request({}));

    // Reversed, the loser of a real race would already have a paid-for session.
    expect(order).toEqual(['reserve', 'stripe']);
  });

  it('refuses rather than guessing when the reservation cannot be taken', async () => {
    mocks.create.mockRejectedValue(new Error('connection refused'));

    const res = await POST(request({}));

    expect(res.status).toBe(503);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('a reservation is never left stranded', () => {
  it('is released when Stripe throws', async () => {
    mocks.sessionsCreate.mockRejectedValue(new Error('stripe is down'));

    const res = await POST(request({}));

    expect(res.status).toBe(500);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'checkout_pending' },
    });
  });

  it('is released when Stripe returns a session with no URL', async () => {
    mocks.sessionsCreate.mockResolvedValue({ id: 'cs_test_1', url: null });

    const res = await POST(request({}));

    expect(res.status).toBe(500);
    expect(mocks.deleteMany).toHaveBeenCalled();
  });

  it('is NOT released after a session is successfully opened', async () => {
    const res = await POST(request({}));

    expect(res.status).toBe(200);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it('is not taken at all when the request is rejected before checkout', async () => {
    mocks.findUnique.mockResolvedValue({ status: 'active', currentPeriodEnd: null });

    await POST(request({}));

    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe('the Checkout Session expires with the reservation', () => {
  it('sets expires_at', async () => {
    await POST(request({}));
    expect(typeof mocks.sessionsCreate.mock.calls[0][0].expires_at).toBe('number');
  });
});

describe('an unauthenticated caller', () => {
  it('is refused before any membership lookup', async () => {
    mocks.claims.mockResolvedValue(null);

    const res = await POST(request({}));

    expect(res.status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-759 (c): adding Teams seats must not charge twice when the request is retried.
 *
 * The page's API client retries a POST that answered 5xx. If Stripe applied the quantity change
 * but the response was lost, and the `customer.subscription.updated` webhook raised the stored
 * seat count before the retry, the retry computed a higher quantity and Stripe prorated and
 * charged again. The fake Stripe below behaves like the real one: a request carrying an
 * idempotency key already used is not applied again.
 */

const h = vi.hoisted(() => ({
  sub: { teamId: 'team-1', stripeSubscriptionId: 'sub_test_teams', status: 'active', seatLimit: 5, currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z') },
  stripeQuantity: 5,
  applied: [] as number[],
  keys: new Map<string, number>(),
  inFlight: new Set<string>(),
  updateCalls: [] as Array<{ quantity: number; idempotencyKey?: string }>,
}));

vi.mock('@/lib/server/subscriptions-flag', () => ({ teamSubscriptionsEnabled: () => true }));
vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: vi.fn(async () => ({ sub: 'owner', email: 'owner@seats-test.invalid', role: null })),
}));
vi.mock('@/lib/server/teams', () => ({
  getTeamForUser: vi.fn(async () => ({ id: 'team-1', ownerId: 'owner' })),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsTeamSubscription: {
      findUnique: vi.fn(async () => ({ ...h.sub })),
      update: vi.fn(async (args: { data: { seatLimit: number } }) => {
        h.sub.seatLimit = args.data.seatLimit;
        return h.sub;
      }),
    },
  },
}));
// GP-773 seat billing: a Teams subscription is the A$1,295 owner plan item (quantity 1, the
// owner's seat) plus one A$695 extra-seat item. `h.stripeQuantity` stays the TOTAL seat count
// (owner + extra seats), so this file's GP-759 expectations read unchanged; the fake converts.
const yearly = (id: string, unit_amount: number) => ({
  id,
  active: true,
  billing_scheme: 'per_unit',
  currency: 'aud',
  unit_amount,
  recurring: { interval: 'year', interval_count: 1 },
});
const PAID = { id: 'sub_test_teams', latest_invoice: { id: 'in_test', status: 'paid' } };
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    prices: {
      retrieve: vi.fn(async (id: string) => yearly(id, 69_500)),
      list: vi.fn(async () => ({ data: [] })),
    },
    subscriptions: {
      retrieve: vi.fn(async () => ({
        collection_method: 'charge_automatically',
        metadata: { plan: 'business_owner' },
        items: {
          data: [
            { id: 'si_owner', quantity: 1, price: yearly('price_owner', 129_500) },
            { id: 'si_test', quantity: h.stripeQuantity - 1, price: yearly('price_extra_seat', 69_500) },
          ],
        },
      })),
      update: vi.fn(
        async (
          _id: string,
          params: { items: Array<{ quantity: number }> },
          options?: { idempotencyKey?: string },
        ) => {
          // Total seats after the update: the owner's seat + the seat item's new quantity.
          const quantity = 1 + params.items[0]!.quantity;
          h.updateCalls.push({ quantity, idempotencyKey: options?.idempotencyKey });
          const key = options?.idempotencyKey;
          if (key && h.inFlight.has(key)) {
            // Stripe is still executing the first request with this key.
            throw Object.assign(new Error('There is currently another in-progress request using this Idempotent Key'), {
              type: 'StripeIdempotencyError',
              rawType: 'idempotency_error',
              code: 'idempotency_key_in_use',
            });
          }
          if (key && h.keys.has(key)) {
            if (h.keys.get(key) !== quantity) {
              throw Object.assign(new Error('Keys for idempotent requests can only be used with the same parameters'), {
                type: 'StripeIdempotencyError',
                rawType: 'idempotency_error',
              });
            }
            return PAID; // replayed response, nothing applied
          }
          if (key) h.keys.set(key, quantity);
          h.applied.push(quantity);
          h.stripeQuantity = quantity;
          return PAID; // charge first: the seat invoice is paid
        },
      ),
    },
  }),
}));

const { POST } = await import('../../../app/api/lms/subscription/teams/expand-seats/route');
const { createSeatExpansionRequests } = await import('@/lib/lms/seat-expansion-request');

function expand(body: Record<string, unknown>) {
  return POST(
    new NextRequest('https://carsi.com.au/api/lms/subscription/teams/expand-seats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'gp759-test-placeholder-not-a-key';
  process.env.STRIPE_PRICE_TEAMS_EXTRA_SEAT = 'price_extra_seat';
  h.sub.seatLimit = 5;
  h.stripeQuantity = 5;
  h.applied = [];
  h.keys.clear();
  h.inFlight.clear();
  h.updateCalls = [];
});

describe('GP-759 (c): Teams seat expansion is idempotent per click', () => {
  it('a retried request after the webhook raised the seat count adds the seats only once', async () => {
    const click = { additional_seats: 2, request_id: 'click-0001-abcdef' };

    const first = await expand(click);
    expect(first.status).toBe(200);

    // The response was lost and the subscription.updated webhook already stored 7 seats.
    h.sub.seatLimit = 7;
    const retry = await expand(click);

    expect(h.applied).toEqual([7]);
    expect(retry.status).toBe(409);
    expect(h.updateCalls.every((c) => c.idempotencyKey === h.updateCalls[0]!.idempotencyKey)).toBe(true);
    expect(h.updateCalls[0]!.idempotencyKey).toContain('click-0001-abcdef');
  });

  it('control: two separate clicks add seats twice, as the owner asked', async () => {
    await expand({ additional_seats: 1, request_id: 'click-aaaa-000001' });
    await expand({ additional_seats: 1, request_id: 'click-bbbb-000002' });

    expect(h.applied).toEqual([6, 7]);
  });

  it("the buyer's own retry after a lost response (timeout) reuses the id, so seats are added once", async () => {
    let n = 0;
    const requests = createSeatExpansionRequests(() => `purchase-${String(++n).padStart(4, '0')}-id`);

    // Attempt 1 reached Stripe, but the browser timed out (the API client reports 408).
    const first = await expand({ additional_seats: 2, request_id: requests.currentId() });
    expect(first.status).toBe(200);
    requests.settle(408);
    h.sub.seatLimit = 7; // the webhook stored the new count

    // The buyer clicks Add again.
    const retry = await expand({ additional_seats: 2, request_id: requests.currentId() });
    requests.settle(retry.status, ((await retry.clone().json()) as { error_code?: string }).error_code);

    expect(h.applied).toEqual([7]);
    expect(retry.status).toBe(409);

    // A known outcome ends that purchase: the next one gets a new id and is applied.
    const next = await expand({ additional_seats: 1, request_id: requests.currentId() });
    expect(next.status).toBe(200);
    expect(h.applied).toEqual([7, 8]);
  });

  it('a retry that meets the first attempt still running at Stripe keeps the id, so seats are added once', async () => {
    let n = 0;
    const requests = createSeatExpansionRequests(() => `purchase-${String(++n).padStart(4, '0')}-id`);
    const id = requests.currentId();
    const key = `carsi-expand-seats:sub_test_teams:${id}`;

    // Attempt 1 is executing at Stripe; the browser times out.
    h.inFlight.add(key);
    requests.settle(408);

    // The buyer retries while attempt 1 is still running.
    const during = await expand({ additional_seats: 2, request_id: requests.currentId() });
    const duringBody = (await during.json()) as { error_code?: string };
    expect(during.status).toBe(409);
    expect(duringBody.error_code).toBe('SEAT_ADD_IN_PROGRESS');
    requests.settle(during.status, duringBody.error_code);

    // Attempt 1 completes: Stripe applies 7 and the webhook stores it.
    h.inFlight.delete(key);
    h.keys.set(key, 7);
    h.applied.push(7);
    h.stripeQuantity = 7; // GP-773: the route reads seats from the Stripe items, which moved
    h.sub.seatLimit = 7;

    // The buyer tries once more: same purchase id, so nothing is charged again.
    const after = await expand({ additional_seats: 2, request_id: requests.currentId() });
    const afterBody = (await after.json()) as { error_code?: string };
    expect(after.status).toBe(409);
    expect(afterBody.error_code).toBe('SEATS_ALREADY_ADDED');
    expect(h.applied).toEqual([7]);
  });

  it('a request without a click id is refused before Stripe is called', async () => {
    const res = await expand({ additional_seats: 1 });

    expect(res.status).toBe(400);
    expect(h.updateCalls).toHaveLength(0);
  });
});

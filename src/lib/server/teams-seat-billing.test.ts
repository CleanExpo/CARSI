/**
 * GP-773 seat billing for CARSI Teams.
 *
 * Founder rulings, 23/11/2026: "Build seat billing now", "Charge first, one more review" and
 * "Your 20/10 prices only". The model under test:
 *  - a Teams subscription is the business owner plan: its base item is the verified A$1,295
 *    yearly owner Price (the same Price the organisation checkout verifies), at quantity 1;
 *  - each extra staff member is one unit of a SEPARATE item on the verified A$695 yearly seat
 *    Price, each with their own login;
 *  - the plan includes TEAMS_OWNER_PLAN_INCLUDED_SEATS seats (1: the owner; UNVERIFIED, nothing
 *    in the repo records more);
 *  - checkout sends the seat item only when extra seats are bought (never a zero quantity) and
 *    stamps both verified Price ids into the subscription metadata;
 *  - expand-seats changes (or adds) only the seat item, and is charged first: Stripe invoices the
 *    added seats at once and seats are granted only when that invoice is paid;
 *  - the webhook's seat count is included seats (base item present) + seat item quantity;
 *  - a missing or mismatched owner or seat Price fails closed: 503, no checkout, no Stripe update.
 *
 * Only the Stripe client is mocked. The Price resolvers and the shape check run for real.
 */
import { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sessionsCreate: vi.fn(),
  pricesRetrieve: vi.fn(),
  pricesList: vi.fn(),
  subsRetrieve: vi.fn(),
  subsUpdate: vi.fn(),
  teamSubFind: vi.fn(),
  teamSubUpdate: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    checkout: { sessions: { create: mocks.sessionsCreate } },
    prices: { retrieve: mocks.pricesRetrieve, list: mocks.pricesList },
    subscriptions: { retrieve: mocks.subsRetrieve, update: mocks.subsUpdate },
  }),
}));
vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => ({ sub: 'user-1', email: 'owner@example.test' }),
}));
vi.mock('@/lib/server/membership-checkout-reservation', () => ({
  reserveTeamCheckout: async () => 'reserved',
  checkoutSessionExpiresAt: () => 1900000000,
  checkoutSessionIdempotencyKey: () => 'test-reservation',
}));
vi.mock('@/lib/server/teams', () => ({
  getTeamForUser: async () => ({ id: 'team-1', ownerId: 'user-1' }),
  ensureContainerTeamForOwner: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsTeamSubscription: { findUnique: mocks.teamSubFind, update: mocks.teamSubUpdate },
  },
}));

import { POST as teamsCheckout } from '../../../app/api/lms/subscription/teams/checkout/route';
import { POST as expandSeats } from '../../../app/api/lms/subscription/teams/expand-seats/route';
import { __resetOrgSubscriptionPriceCache } from './org-subscription-price';
import { __resetTeamSubscriptionPriceCache } from './team-subscription-price';
import { readSubscriptionSeatQuantity } from './team-subscription-store-pure';

type PriceShape = {
  id: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  type: 'recurring';
  recurring: { interval: 'month' | 'year'; interval_count: number };
  billing_scheme: 'per_unit';
  transform_quantity: null;
};

function price(id: string, cents: number, interval: 'month' | 'year' = 'year'): PriceShape {
  return {
    id,
    active: true,
    currency: 'aud',
    unit_amount: cents,
    type: 'recurring',
    recurring: { interval, interval_count: 1 },
    billing_scheme: 'per_unit',
    transform_quantity: null,
  };
}

let catalogue: Record<string, PriceShape> = {};

beforeEach(() => {
  vi.clearAllMocks();
  __resetTeamSubscriptionPriceCache();
  __resetOrgSubscriptionPriceCache();
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_synthetic');
  vi.stubEnv('SUBSCRIPTIONS_ENABLED', 'true');
  vi.stubEnv('TEAMS_SUBSCRIPTIONS_ENABLED', 'true');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://carsi.example.test');
  vi.stubEnv('STRIPE_PRICE_ORG_ANNUAL', 'price_owner');
  vi.stubEnv('STRIPE_PRICE_TEAMS_EXTRA_SEAT', 'price_extra_seat');
  catalogue = {
    // The founder's business owner plan: A$1,295 per year, billed once (quantity 1).
    price_owner: price('price_owner', 129_500),
    // The founder's extra staff seat: A$695 per year.
    price_extra_seat: price('price_extra_seat', 69_500),
  };
  mocks.pricesRetrieve.mockImplementation(async (id: string) => {
    const p = catalogue[id];
    if (!p) throw new Error(`No such price: '${id}'`);
    return p;
  });
  mocks.pricesList.mockResolvedValue({ data: [] });
  mocks.sessionsCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.example.test/s' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

function request(body: Record<string, unknown> = {}) {
  return new NextRequest('https://carsi.example.test/api/teams', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function sessionArgs() {
  expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
  return mocks.sessionsCreate.mock.calls[0][0] as {
    line_items: unknown;
    metadata: Record<string, string>;
    subscription_data: { metadata: Record<string, string> };
  };
}

describe('Teams checkout: the A$1,295 owner plan plus a separate A$695 seat item', () => {
  it('2 extra staff: owner Price at quantity 1, seat item at quantity 2', async () => {
    const res = await teamsCheckout(request({ tier: 'business_owner', extra_seats: 2 }));
    expect(res.status).toBe(200);
    const args = sessionArgs();
    expect(args.line_items).toEqual([
      { price: 'price_owner', quantity: 1 },
      { price: 'price_extra_seat', quantity: 2 },
    ]);
    expect(args.subscription_data.metadata).toMatchObject({
      plan: 'business_owner',
      base_price_id: 'price_owner',
      seat_price_id: 'price_extra_seat',
      extra_seats: '2',
      seat_count: '3',
    });
  });

  it('no extra staff: owner item only (never a zero quantity), seat Price id still stamped', async () => {
    const res = await teamsCheckout(request({}));
    expect(res.status).toBe(200);
    const args = sessionArgs();
    expect(args.line_items).toEqual([{ price: 'price_owner', quantity: 1 }]);
    expect(args.subscription_data.metadata).toMatchObject({
      plan: 'business_owner',
      base_price_id: 'price_owner',
      seat_price_id: 'price_extra_seat',
      extra_seats: '0',
      seat_count: '1',
    });
  });

  for (const retired of ['starter', 'growth', 'full_library']) {
    it(`the retired ${retired} bundle is refused (400) and opens no checkout`, async () => {
      const res = await teamsCheckout(request({ tier: retired }));
      expect(res.status).toBe(400);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }

  it('missing seat Price: 503 and no checkout, even with no extra seats bought', async () => {
    vi.stubEnv('STRIPE_PRICE_TEAMS_EXTRA_SEAT', '');
    const res = await teamsCheckout(request({}));
    expect(res.status).toBe(503);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  for (const [label, wrong] of [
    ['the old $49 seat', price('price_extra_seat', 4_900)],
    ['a monthly A$695', price('price_extra_seat', 69_500, 'month')],
  ] as const) {
    it(`seat Price that is ${label}: 503 and no checkout`, async () => {
      catalogue.price_extra_seat = wrong;
      const res = await teamsCheckout(request({ extra_seats: 1 }));
      expect(res.status).toBe(503);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }

  for (const [label, wrong] of [
    ['a monthly A$1,295', price('price_owner', 129_500, 'month')],
    ['an old bundle amount', price('price_owner', 249_900)],
  ] as const) {
    it(`owner Price that is ${label}: 503 and no checkout`, async () => {
      catalogue.price_owner = wrong;
      const res = await teamsCheckout(request({}));
      expect(res.status).toBe(503);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }

  it('missing owner Price: 503 and no checkout', async () => {
    vi.stubEnv('STRIPE_PRICE_ORG_ANNUAL', '');
    const res = await teamsCheckout(request({}));
    expect(res.status).toBe(503);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  for (const bad of [-1, 51, 1.5, 'two']) {
    it(`extra_seats ${JSON.stringify(bad)} is refused (400) before any checkout`, async () => {
      const res = await teamsCheckout(request({ extra_seats: bad }));
      expect(res.status).toBe(400);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }
});

describe('expand-seats: charged first, changes the seat item, never the base item', () => {
  const META = { plan: 'business_owner', base_price_id: 'price_owner', seat_price_id: 'price_extra_seat' };
  const BASE_ITEM = { id: 'si_base', quantity: 1, price: price('price_owner', 129_500) };
  const live = (extra: Record<string, unknown> = {}) => ({
    collection_method: 'charge_automatically',
    metadata: META,
    items: { data: [BASE_ITEM] },
    ...extra,
  });

  beforeEach(() => {
    mocks.teamSubFind.mockResolvedValue({
      teamId: 'team-1',
      stripeSubscriptionId: 'sub_1',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      seatLimit: 3,
    });
    mocks.teamSubUpdate.mockResolvedValue({});
    // Charge first: Stripe returns the subscription with its proration invoice already paid.
    mocks.subsUpdate.mockResolvedValue({ id: 'sub_1', latest_invoice: { id: 'in_1', status: 'paid' } });
  });

  it('charges first: always_invoice + error_if_incomplete, and reads back the invoice', async () => {
    mocks.subsRetrieve.mockResolvedValue(
      live({ items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: price('price_extra_seat', 69_500) }] } }),
    );
    const res = await expandSeats(request({ additional_seats: 1 }));
    expect(res.status).toBe(200);
    const [, params] = mocks.subsUpdate.mock.calls[0];
    expect(params.proration_behavior).toBe('always_invoice');
    expect(params.payment_behavior).toBe('error_if_incomplete');
    expect(params.expand).toContain('latest_invoice');
  });

  it('declined payment: clear 402 refusal, seats unchanged', async () => {
    mocks.subsRetrieve.mockResolvedValue(live());
    mocks.subsUpdate.mockRejectedValue(
      Object.assign(new Error('Your card was declined.'), {
        type: 'StripeCardError',
        statusCode: 402,
        code: 'card_declined',
      }),
    );
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.reason).toBe('seat_payment_failed');
    expect(body.detail).toMatch(/no seats were added/i);
    expect(mocks.teamSubUpdate).not.toHaveBeenCalled();
  });

  it('payment needing customer action (incomplete): 402, seats unchanged', async () => {
    mocks.subsRetrieve.mockResolvedValue(live());
    mocks.subsUpdate.mockRejectedValue(
      Object.assign(new Error('This payment requires additional user action.'), {
        type: 'StripeInvalidRequestError',
        statusCode: 402,
        code: 'subscription_payment_intent_requires_action',
      }),
    );
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(402);
    expect(mocks.teamSubUpdate).not.toHaveBeenCalled();
  });

  it('update returned but the invoice is not paid: no seats granted', async () => {
    mocks.subsRetrieve.mockResolvedValue(live());
    mocks.subsUpdate.mockResolvedValue({ id: 'sub_1', latest_invoice: { id: 'in_1', status: 'open' } });
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(402);
    expect(mocks.teamSubUpdate).not.toHaveBeenCalled();
  });

  it('a subscription not charged automatically is refused before any change', async () => {
    mocks.subsRetrieve.mockResolvedValue(live({ collection_method: 'send_invoice' }));
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(409);
    expect(mocks.subsUpdate).not.toHaveBeenCalled();
    expect(mocks.teamSubUpdate).not.toHaveBeenCalled();
  });

  it('successful payment grants the paid seats (owner + 3 staff = 4)', async () => {
    mocks.subsRetrieve.mockResolvedValue(live());
    const res = await expandSeats(request({ additional_seats: 3 }));
    expect(res.status).toBe(200);
    expect((await res.json()).seat_limit).toBe(4);
    expect(mocks.teamSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { seatLimit: 4 } }),
    );
  });

  it('raises the existing seat item quantity (2 -> 4) and the seat limit to 1 + 4', async () => {
    mocks.subsRetrieve.mockResolvedValue(
      live({ items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: price('price_extra_seat', 69_500) }] } }),
    );
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(200);
    expect(mocks.subsUpdate).toHaveBeenCalledTimes(1);
    const [subId, params] = mocks.subsUpdate.mock.calls[0];
    expect(subId).toBe('sub_1');
    expect(params.items).toEqual([{ id: 'si_seat', quantity: 4 }]);
    expect(params.proration_behavior).toBe('always_invoice');
    expect(mocks.teamSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { seatLimit: 5 } }),
    );
  });

  it('adds the seat item at the verified A$695 Price when the subscription has none', async () => {
    mocks.subsRetrieve.mockResolvedValue(live());
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(200);
    const [, params] = mocks.subsUpdate.mock.calls[0];
    expect(params.items).toEqual([{ price: 'price_extra_seat', quantity: 2 }]);
    expect(params.metadata).toMatchObject({ seat_price_id: 'price_extra_seat' });
    expect(mocks.teamSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { seatLimit: 3 } }),
    );
  });

  it('seat Price unresolvable: 503, no Stripe update, no seat change', async () => {
    vi.stubEnv('STRIPE_PRICE_TEAMS_EXTRA_SEAT', '');
    mocks.subsRetrieve.mockResolvedValue(live());
    const res = await expandSeats(request({ additional_seats: 1 }));
    expect(res.status).toBe(503);
    expect(mocks.subsUpdate).not.toHaveBeenCalled();
    expect(mocks.teamSubUpdate).not.toHaveBeenCalled();
  });

  it('no recognised base item (old single per-unit item): 409, nothing charged', async () => {
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically',
      metadata: { plan: 'starter' },
      items: { data: [{ id: 'si_1', quantity: 5, price: price('price_team_starter', 5_980) }] },
    });
    const res = await expandSeats(request({ additional_seats: 1 }));
    expect(res.status).toBe(409);
    expect(mocks.subsUpdate).not.toHaveBeenCalled();
    expect(mocks.teamSubUpdate).not.toHaveBeenCalled();
  });

  it('existing seat item on a Price other than the verified seat Price: 409, nothing charged', async () => {
    mocks.subsRetrieve.mockResolvedValue(
      live({
        metadata: { ...META, seat_price_id: 'price_old_seat' },
        items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: price('price_old_seat', 4_900) }] },
      }),
    );
    const res = await expandSeats(request({ additional_seats: 1 }));
    expect(res.status).toBe(409);
    expect(mocks.subsUpdate).not.toHaveBeenCalled();
  });

  it('seat item on a lookalike A$695 Price that is not the verified seat Price: 409', async () => {
    mocks.subsRetrieve.mockResolvedValue(
      live({
        metadata: { ...META, seat_price_id: 'price_lookalike' },
        items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: price('price_lookalike', 69_500) }] },
      }),
    );
    const res = await expandSeats(request({ additional_seats: 1 }));
    expect(res.status).toBe(409);
    expect(mocks.subsUpdate).not.toHaveBeenCalled();
  });
});

describe('webhook seat count across both items', () => {
  const sub = (metadata: Record<string, string>, items: Array<{ quantity: number; price: { id: string } }>) =>
    ({ metadata, items: { data: items } }) as unknown as Stripe.Subscription;
  const META = { plan: 'business_owner', base_price_id: 'price_owner', seat_price_id: 'price_extra_seat' };

  it('owner plan + 3 extra staff = 4 seats', () => {
    expect(
      readSubscriptionSeatQuantity(
        sub(META, [
          { quantity: 1, price: { id: 'price_owner' } },
          { quantity: 3, price: { id: 'price_extra_seat' } },
        ]),
      ),
    ).toBe(4);
  });

  it('item order does not matter', () => {
    expect(
      readSubscriptionSeatQuantity(
        sub(META, [
          { quantity: 3, price: { id: 'price_extra_seat' } },
          { quantity: 1, price: { id: 'price_owner' } },
        ]),
      ),
    ).toBe(4);
  });

  it('a base item quantity above 1 grants no extra seats (only seat item units are seats)', () => {
    expect(
      readSubscriptionSeatQuantity(
        sub(META, [
          { quantity: 3, price: { id: 'price_owner' } },
          { quantity: 2, price: { id: 'price_extra_seat' } },
        ]),
      ),
    ).toBe(3);
  });

  it('owner plan only = the owner seat', () => {
    expect(readSubscriptionSeatQuantity(sub(META, [{ quantity: 1, price: { id: 'price_owner' } }]))).toBe(1);
  });

  it('an unrecognised item grants nothing; a missing base grants no included seats', () => {
    expect(
      readSubscriptionSeatQuantity(
        sub(META, [
          { quantity: 9, price: { id: 'price_something_else' } },
          { quantity: 2, price: { id: 'price_extra_seat' } },
        ]),
      ),
    ).toBe(2);
  });

  for (const plan of ['platinum', 'starter', 'full_library']) {
    it(`plan "${plan}" on a two-item subscription grants 0 (fail closed)`, () => {
      expect(
        readSubscriptionSeatQuantity(
          sub({ ...META, plan }, [
            { quantity: 1, price: { id: 'price_owner' } },
            { quantity: 3, price: { id: 'price_extra_seat' } },
          ]),
        ),
      ).toBe(0);
    });
  }
});

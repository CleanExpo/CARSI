/**
 * GP-773 seat billing for CARSI Teams (founder ruling 23/11/2026: "Build seat billing now").
 *
 * The model under test:
 *  - a Teams subscription carries a verified flat tier base Price at quantity 1 (Starter
 *    A$299 / 5 seats, Growth A$799 / 15, Full Library A$2,499 / 25, all yearly AUD);
 *  - extra staff seats are a SEPARATE subscription item on the verified A$695 yearly seat Price;
 *  - checkout sends both items (the seat item only when extra seats are bought: Stripe Checkout
 *    is never sent a zero quantity), and stamps both verified Price ids into the subscription
 *    metadata so the webhook can tell the items apart even after a reprice;
 *  - expand-seats changes the seat item's quantity, or adds the seat item when there is none,
 *    and never touches the base item;
 *  - the webhook's seat count is included seats (from the base item) + the seat item quantity;
 *  - a missing or mismatched base or seat Price fails closed: 503, no checkout, no Stripe update.
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
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_synthetic');
  vi.stubEnv('SUBSCRIPTIONS_ENABLED', 'true');
  vi.stubEnv('TEAMS_SUBSCRIPTIONS_ENABLED', 'true');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://carsi.example.test');
  vi.stubEnv('STRIPE_PRICE_TEAMS_STARTER', 'price_team_starter');
  vi.stubEnv('STRIPE_PRICE_TEAMS_FULL_LIBRARY', 'price_team_full');
  vi.stubEnv('STRIPE_PRICE_TEAMS_EXTRA_SEAT', 'price_extra_seat');
  catalogue = {
    // Flat tier base Prices: the tier total shown on /pricing, billed once (quantity 1).
    price_team_starter: price('price_team_starter', 29_900),
    price_team_full: price('price_team_full', 249_900),
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

describe('Teams checkout: verified base Price plus a separate A$695 seat item', () => {
  it('Starter with 2 extra seats: base at quantity 1, seat item at quantity 2', async () => {
    const res = await teamsCheckout(request({ tier: 'starter', extra_seats: 2 }));
    expect(res.status).toBe(200);
    const args = sessionArgs();
    expect(args.line_items).toEqual([
      { price: 'price_team_starter', quantity: 1 },
      { price: 'price_extra_seat', quantity: 2 },
    ]);
    expect(args.subscription_data.metadata).toMatchObject({
      plan: 'starter',
      base_price_id: 'price_team_starter',
      seat_price_id: 'price_extra_seat',
      extra_seats: '2',
      seat_count: '7',
    });
  });

  it('no extra seats: base item only (never a zero quantity), seat Price id still stamped', async () => {
    const res = await teamsCheckout(request({ tier: 'starter' }));
    expect(res.status).toBe(200);
    const args = sessionArgs();
    expect(args.line_items).toEqual([{ price: 'price_team_starter', quantity: 1 }]);
    expect(args.subscription_data.metadata).toMatchObject({
      base_price_id: 'price_team_starter',
      seat_price_id: 'price_extra_seat',
      extra_seats: '0',
      seat_count: '5',
    });
  });

  it('Full Library bills its A$2,499 base once', async () => {
    const res = await teamsCheckout(request({ tier: 'full_library', extra_seats: 1 }));
    expect(res.status).toBe(200);
    expect(sessionArgs().line_items).toEqual([
      { price: 'price_team_full', quantity: 1 },
      { price: 'price_extra_seat', quantity: 1 },
    ]);
  });

  it('missing seat Price: 503 and no checkout, even with no extra seats bought', async () => {
    vi.stubEnv('STRIPE_PRICE_TEAMS_EXTRA_SEAT', '');
    const res = await teamsCheckout(request({ tier: 'starter' }));
    expect(res.status).toBe(503);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  for (const [label, wrong] of [
    ['the old $49 seat', price('price_extra_seat', 4_900)],
    ['a monthly A$695', price('price_extra_seat', 69_500, 'month')],
  ] as const) {
    it(`seat Price that is ${label}: 503 and no checkout`, async () => {
      catalogue.price_extra_seat = wrong;
      const res = await teamsCheckout(request({ tier: 'starter', extra_seats: 1 }));
      expect(res.status).toBe(503);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }

  it('old per-unit tier Price (A$59.80 x 5) is refused as a base: 503 and no checkout', async () => {
    catalogue.price_team_starter = price('price_team_starter', 5_980);
    const res = await teamsCheckout(request({ tier: 'starter' }));
    expect(res.status).toBe(503);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('missing base Price: 503 and no checkout', async () => {
    vi.stubEnv('STRIPE_PRICE_TEAMS_STARTER', '');
    const res = await teamsCheckout(request({ tier: 'starter' }));
    expect(res.status).toBe(503);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  for (const bad of [-1, 51, 1.5, 'two']) {
    it(`extra_seats ${JSON.stringify(bad)} is refused (400) before any checkout`, async () => {
      const res = await teamsCheckout(request({ tier: 'starter', extra_seats: bad }));
      expect(res.status).toBe(400);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }
});

describe('expand-seats: changes the seat item, never the base item', () => {
  const META = { plan: 'starter', base_price_id: 'price_team_starter', seat_price_id: 'price_extra_seat' };
  const BASE_ITEM = { id: 'si_base', quantity: 1, price: price('price_team_starter', 29_900) };

  beforeEach(() => {
    mocks.teamSubFind.mockResolvedValue({
      teamId: 'team-1',
      stripeSubscriptionId: 'sub_1',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      seatLimit: 7,
    });
    mocks.teamSubUpdate.mockResolvedValue({});
    // Charge first: Stripe returns the subscription with its proration invoice already paid.
    mocks.subsUpdate.mockResolvedValue({ id: 'sub_1', latest_invoice: { id: 'in_1', status: 'paid' } });
  });

  it('charges first: always_invoice + error_if_incomplete, and reads back the invoice', async () => {
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically',
      metadata: META,
      items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: price('price_extra_seat', 69_500) }] },
    });
    const res = await expandSeats(request({ additional_seats: 1 }));
    expect(res.status).toBe(200);
    const [, params] = mocks.subsUpdate.mock.calls[0];
    expect(params.proration_behavior).toBe('always_invoice');
    expect(params.payment_behavior).toBe('error_if_incomplete');
    expect(params.expand).toContain('latest_invoice');
  });

  it('declined payment: clear 402 refusal, seats unchanged', async () => {
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically', metadata: META, items: { data: [BASE_ITEM] } });
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
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically', metadata: META, items: { data: [BASE_ITEM] } });
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
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically', metadata: META, items: { data: [BASE_ITEM] } });
    mocks.subsUpdate.mockResolvedValue({ id: 'sub_1', latest_invoice: { id: 'in_1', status: 'open' } });
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(402);
    expect(mocks.teamSubUpdate).not.toHaveBeenCalled();
  });

  it('a subscription not charged automatically is refused before any change', async () => {
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'send_invoice', metadata: META, items: { data: [BASE_ITEM] } });
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(409);
    expect(mocks.subsUpdate).not.toHaveBeenCalled();
    expect(mocks.teamSubUpdate).not.toHaveBeenCalled();
  });

  it('successful payment grants the paid seats', async () => {
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically', metadata: META, items: { data: [BASE_ITEM] } });
    const res = await expandSeats(request({ additional_seats: 3 }));
    expect(res.status).toBe(200);
    expect((await res.json()).seat_limit).toBe(8);
    expect(mocks.teamSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { seatLimit: 8 } }),
    );
  });

  it('raises the existing seat item quantity (2 -> 4) and the seat limit to 5 + 4', async () => {
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically',
      metadata: META,
      items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: price('price_extra_seat', 69_500) }] },
    });
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(200);
    expect(mocks.subsUpdate).toHaveBeenCalledTimes(1);
    const [subId, params] = mocks.subsUpdate.mock.calls[0];
    expect(subId).toBe('sub_1');
    expect(params.items).toEqual([{ id: 'si_seat', quantity: 4 }]);
    expect(params.proration_behavior).toBe('always_invoice');
    expect(mocks.teamSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { seatLimit: 9 } }),
    );
  });

  it('adds the seat item at the verified A$695 Price when the subscription has none', async () => {
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically', metadata: META, items: { data: [BASE_ITEM] } });
    mocks.teamSubFind.mockResolvedValueOnce({
      teamId: 'team-1',
      stripeSubscriptionId: 'sub_1',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      seatLimit: 5,
    });
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(200);
    const [, params] = mocks.subsUpdate.mock.calls[0];
    expect(params.items).toEqual([{ price: 'price_extra_seat', quantity: 2 }]);
    expect(params.metadata).toMatchObject({ seat_price_id: 'price_extra_seat' });
    expect(mocks.teamSubUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { seatLimit: 7 } }),
    );
  });

  it('seat Price unresolvable: 503, no Stripe update, no seat change', async () => {
    vi.stubEnv('STRIPE_PRICE_TEAMS_EXTRA_SEAT', '');
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically', metadata: META, items: { data: [BASE_ITEM] } });
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
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically',
      metadata: { ...META, seat_price_id: 'price_old_seat' },
      items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: price('price_old_seat', 4_900) }] },
    });
    const res = await expandSeats(request({ additional_seats: 1 }));
    expect(res.status).toBe(409);
    expect(mocks.subsUpdate).not.toHaveBeenCalled();
  });

  it('seat item on a lookalike A$695 Price that is not the verified seat Price: 409', async () => {
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically',
      metadata: { ...META, seat_price_id: 'price_lookalike' },
      items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: price('price_lookalike', 69_500) }] },
    });
    const res = await expandSeats(request({ additional_seats: 1 }));
    expect(res.status).toBe(409);
    expect(mocks.subsUpdate).not.toHaveBeenCalled();
  });
});

describe('webhook seat count across both items', () => {
  const sub = (metadata: Record<string, string>, items: Array<{ quantity: number; price: { id: string } }>) =>
    ({ metadata, items: { data: items } }) as unknown as Stripe.Subscription;
  const META = { plan: 'starter', base_price_id: 'price_team_starter', seat_price_id: 'price_extra_seat' };

  it('Starter base + 3 seat items = 8 seats (not the base quantity of 1)', () => {
    expect(
      readSubscriptionSeatQuantity(
        sub(META, [
          { quantity: 1, price: { id: 'price_team_starter' } },
          { quantity: 3, price: { id: 'price_extra_seat' } },
        ]),
      ),
    ).toBe(8);
  });

  it('item order does not matter', () => {
    expect(
      readSubscriptionSeatQuantity(
        sub(META, [
          { quantity: 3, price: { id: 'price_extra_seat' } },
          { quantity: 1, price: { id: 'price_team_starter' } },
        ]),
      ),
    ).toBe(8);
  });

  it('base only = the tier included seats', () => {
    expect(readSubscriptionSeatQuantity(sub(META, [{ quantity: 1, price: { id: 'price_team_starter' } }]))).toBe(5);
    expect(
      readSubscriptionSeatQuantity(
        sub({ ...META, plan: 'full_library', base_price_id: 'price_team_full' }, [
          { quantity: 1, price: { id: 'price_team_full' } },
        ]),
      ),
    ).toBe(25);
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

  it('unknown plan on a two-item subscription grants 0 (fail closed)', () => {
    expect(
      readSubscriptionSeatQuantity(
        sub({ ...META, plan: 'platinum' }, [
          { quantity: 1, price: { id: 'price_team_starter' } },
          { quantity: 3, price: { id: 'price_extra_seat' } },
        ]),
      ),
    ).toBe(0);
  });
});

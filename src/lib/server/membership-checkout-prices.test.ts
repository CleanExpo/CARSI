/**
 * GP-773: what each membership checkout actually sends to Stripe.
 *
 * The price resolvers are NOT mocked. Only the Stripe client is, so each case drives the real
 * chain: env var or lookup key -> Stripe Price -> amount/currency/interval check against
 * `membership-prices.ts` -> `checkout.sessions.create`.
 *
 * - individual: only a A$795 per year Price reaches checkout;
 * - business owner (org checkout and the onboarding org path): only a A$1,295 per YEAR Price;
 *   the old monthly env var is no longer read;
 * - onboarding with Teams off: the same verified A$1,295 yearly Price, or no checkout (no inline price);
 * - extra staff seats: refused unless the subscription's seat Price is A$695 per year;
 * - no membership checkout accepts promotion codes ("no further discounts").
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { NextRequest } from 'next/server';
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
vi.mock('@/lib/server/membership-checkout-guard', () => ({
  membershipCheckoutDecisionFor: async () => ({ allowed: true }),
}));
vi.mock('@/lib/server/membership-checkout-reservation', () => ({
  reserveMembershipCheckout: async () => 'reserved',
  reserveTeamCheckout: async () => 'reserved',
  releaseMembershipCheckout: vi.fn(),
  checkoutSessionExpiresAt: () => 1900000000,
  checkoutSessionIdempotencyKey: () => 'test-reservation',
}));
vi.mock('@/lib/server/org-subscription-provision', () => ({
  provisionOrgSubscriptionContainer: async () => ({ ok: true, result: { teamId: 'team-1' } }),
}));
vi.mock('@/lib/server/teams', () => ({
  getTeamForUser: async () => ({ id: 'team-1', ownerId: 'user-1' }),
  ensureContainerTeamForOwner: vi.fn(),
}));
vi.mock('@/lib/server/event-attribution', () => ({
  readAttributionJourneyId: () => null,
  tryRecordAttributedStage: async () => {},
}));
vi.mock('@/lib/server/onboarding-programs', () => ({
  getOnboardingCourseBySlug: async () => ({
    id: 'course-1',
    title: 'Test onboarding',
    shortDescription: '',
    // Stale course meta: the catalogue still says monthly. It must not decide the bill.
    meta: { pricing: { amountAud: 999, billingCycle: 'monthly', gst: 'exclusive' } },
  }),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: { findUnique: async () => null },
    lmsTeamSubscription: { findUnique: mocks.teamSubFind, update: mocks.teamSubUpdate },
  },
}));

import { POST as individual } from '../../../app/api/lms/subscription/checkout/route';
import { POST as teams } from '../../../app/api/lms/subscription/teams/checkout/route';
import { POST as org } from '../../../app/api/lms/subscription/org/checkout/route';
import { POST as onboarding } from '../../../app/api/lms/onboarding/[slug]/checkout/route';
import { POST as expandSeats } from '../../../app/api/lms/subscription/teams/expand-seats/route';
import { __resetOrgSubscriptionPriceCache } from './org-subscription-price';
import { __resetSubscriptionPriceCache } from './subscription-price';
import { __resetTeamSubscriptionPriceCache } from './team-subscription-price';
import { createOnboardingStripeCheckout } from './onboarding-checkout';

type StripePriceShape = {
  id: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  type: 'recurring' | 'one_time';
  recurring: { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number } | null;
  billing_scheme: 'per_unit' | 'tiered';
  transform_quantity: { divide_by: number; round: 'up' | 'down' } | null;
};

function price(id: string, cents: number, interval: 'month' | 'year' = 'year', currency = 'aud'): StripePriceShape {
  return {
    id,
    active: true,
    currency,
    unit_amount: cents,
    type: 'recurring',
    recurring: { interval, interval_count: 1 },
    billing_scheme: 'per_unit',
    transform_quantity: null,
  };
}

/** A Price that bills a different amount than its unit_amount suggests (GP-773 rebind P1). */
function transformed(p: StripePriceShape): StripePriceShape {
  return { ...p, transform_quantity: { divide_by: 2, round: 'up' } };
}
function tiered(p: StripePriceShape): StripePriceShape {
  return { ...p, billing_scheme: 'tiered' };
}

/** Stripe answers `prices.retrieve` from this table. */
let catalogue: Record<string, StripePriceShape> = {};

beforeEach(() => {
  vi.clearAllMocks();
  __resetSubscriptionPriceCache();
  __resetOrgSubscriptionPriceCache();
  __resetTeamSubscriptionPriceCache();
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_synthetic');
  vi.stubEnv('DATABASE_URL', 'postgres://configured');
  vi.stubEnv('SUBSCRIPTIONS_ENABLED', 'true');
  vi.stubEnv('TEAMS_SUBSCRIPTIONS_ENABLED', 'true');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://carsi.example.test');
  vi.stubEnv('STRIPE_PRICE_PRO_ANNUAL', 'price_individual');
  vi.stubEnv('STRIPE_PRICE_ORG_ANNUAL', 'price_owner');
  vi.stubEnv('STRIPE_PRICE_ORG_MONTHLY', 'price_owner_monthly_old');
  vi.stubEnv('STRIPE_PRICE_TEAMS_STARTER', 'price_team_starter');
  vi.stubEnv('STRIPE_PRICE_TEAMS_EXTRA_SEAT', 'price_seat');
  catalogue = {
    price_individual: price('price_individual', 79_500),
    price_owner: price('price_owner', 129_500),
    price_owner_monthly_old: price('price_owner_monthly_old', 129_500, 'month'),
    // Teams Starter shows $299 a year for 5 seats: a flat base Price billed once (GP-773 seat billing).
    price_team_starter: price('price_team_starter', 29_900),
    // Each extra staff seat: A$695 a year, its own subscription item.
    price_seat: price('price_seat', 69_500),
  };
  mocks.pricesRetrieve.mockImplementation(async (id: string) => {
    const p = catalogue[id];
    if (!p) throw new Error(`No such price: '${id}'`);
    return p;
  });
  mocks.pricesList.mockResolvedValue({ data: [] });
  mocks.sessionsCreate.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.example.test/s' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

function request(body: Record<string, unknown> = {}) {
  return new NextRequest('https://carsi.example.test/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const onboardingCtx = { params: Promise.resolve({ slug: 'floor-care' }) };

function lastSessionArgs(): Record<string, unknown> {
  expect(mocks.sessionsCreate).toHaveBeenCalledTimes(1);
  return mocks.sessionsCreate.mock.calls[0][0] as Record<string, unknown>;
}

describe('individual membership checkout: A$795 per year', () => {
  it('sends the verified A$795 yearly Price and no promotion codes', async () => {
    const res = await individual(request());
    expect(res.status).toBe(200);
    const args = lastSessionArgs();
    expect(args.line_items).toEqual([{ price: 'price_individual', quantity: 1 }]);
    expect(args).not.toHaveProperty('allow_promotion_codes');
    expect(args).not.toHaveProperty('discounts');
  });

  for (const [label, wrong] of [
    ['a different amount', price('price_individual', 49_500)],
    ['a monthly interval', price('price_individual', 79_500, 'month')],
    ['another currency', price('price_individual', 79_500, 'year', 'usd')],
    ['a quantity transform', transformed(price('price_individual', 79_500))],
    ['tiered billing', tiered(price('price_individual', 79_500))],
  ] as const) {
    it(`refuses a Price with ${label}, and Stripe Checkout is never opened`, async () => {
      catalogue.price_individual = wrong;
      const res = await individual(request());
      expect(res.status).toBe(503);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }
});

describe('business owner plan (org checkout): A$1,295 per YEAR', () => {
  it('sends the verified A$1,295 yearly Price, never the old monthly one, and no promotion codes', async () => {
    const res = await org(request({ organisation_name: 'Acme Restoration' }));
    expect(res.status).toBe(200);
    const args = lastSessionArgs();
    expect(args.line_items).toEqual([{ price: 'price_owner', quantity: 1 }]);
    expect(args).not.toHaveProperty('allow_promotion_codes');
  });

  it('refuses a monthly A$1,295 Price', async () => {
    catalogue.price_owner = price('price_owner', 129_500, 'month');
    const res = await org(request({ organisation_name: 'Acme Restoration' }));
    expect(res.status).toBe(503);
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  for (const [label, wrong] of [
    ['a quantity transform', transformed(price('price_owner', 129_500))],
    ['tiered billing', tiered(price('price_owner', 129_500))],
  ] as const) {
    it(`refuses an A$1,295 yearly Price with ${label}`, async () => {
      catalogue.price_owner = wrong;
      const res = await org(request({ organisation_name: 'Acme Restoration' }));
      expect(res.status).toBe(503);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }

  it('resolves by the yearly lookup key when no env var is set', async () => {
    vi.stubEnv('STRIPE_PRICE_ORG_ANNUAL', '');
    mocks.pricesList.mockResolvedValue({ data: [price('price_owner_lookup', 129_500)] });
    const res = await org(request({ organisation_name: 'Acme Restoration' }));
    expect(res.status).toBe(200);
    expect(mocks.pricesList).toHaveBeenCalledWith(
      expect.objectContaining({ lookup_keys: ['carsi_org_annual'] })
    );
    expect(lastSessionArgs().line_items).toEqual([{ price: 'price_owner_lookup', quantity: 1 }]);
  });
});

describe('onboarding checkout (the same business owner plan)', () => {
  it('org path: the verified A$1,295 yearly Price and no promotion codes', async () => {
    const res = await onboarding(request({ organisation_name: 'Acme Restoration' }), onboardingCtx);
    expect(res.status).toBe(200);
    const args = lastSessionArgs();
    expect(args.line_items).toEqual([{ price: 'price_owner', quantity: 1 }]);
    expect(args).not.toHaveProperty('allow_promotion_codes');
  });

  for (const [label, setUp] of [
    ['a monthly A$1,295 Price', () => (catalogue.price_owner = price('price_owner', 129_500, 'month'))],
    ['no Price at all', () => vi.stubEnv('STRIPE_PRICE_ORG_ANNUAL', '')],
  ] as const) {
    it(`org path with ${label}: refuses (503) and opens no checkout, not even the inline one`, async () => {
      setUp();
      const res = await onboarding(request({ organisation_name: 'Acme Restoration' }), onboardingCtx);
      expect(res.status).toBe(503);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }

  // GP-773 round 2 (Codex P1 on 177c2c0d): with Teams off the onboarding route used to build an
  // inline A$1,295 yearly price that no Stripe Price backed. It must now charge only the
  // verified business owner Price, and open nothing when there is none.
  it('Teams off: charges the verified A$1,295 yearly Price, never an inline price', async () => {
    vi.stubEnv('TEAMS_SUBSCRIPTIONS_ENABLED', 'false');
    const res = await onboarding(request({ organisation_name: 'Acme Restoration' }), onboardingCtx);
    expect(res.status).toBe(200);
    const args = lastSessionArgs() as { mode: string; line_items: unknown[] };
    expect(args.mode).toBe('subscription');
    expect(args.line_items).toEqual([{ price: 'price_owner', quantity: 1 }]);
    expect(JSON.stringify(args)).not.toContain('price_data');
    expect(args).not.toHaveProperty('allow_promotion_codes');
  });

  for (const [label, setUp] of [
    ['a monthly A$1,295 Price', () => (catalogue.price_owner = price('price_owner', 129_500, 'month'))],
    ['a A$795 Price', () => (catalogue.price_owner = price('price_owner', 79_500))],
    ['no Price at all', () => vi.stubEnv('STRIPE_PRICE_ORG_ANNUAL', '')],
  ] as const) {
    it(`Teams off with ${label}: refuses (503) and opens no checkout`, async () => {
      vi.stubEnv('TEAMS_SUBSCRIPTIONS_ENABLED', 'false');
      setUp();
      const res = await onboarding(request({ organisation_name: 'Acme Restoration' }), onboardingCtx);
      expect(res.status).toBe(503);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }

  it('the onboarding checkout helper refuses to run without a verified Price id', async () => {
    await expect(
      createOnboardingStripeCheckout({
        slug: 'floor-care',
        title: 'Test onboarding',
        meta: { pricing: { amountAud: 999, billingCycle: 'monthly', gst: 'exclusive' } },
        customerEmail: 'owner@example.test',
        studentId: 'user-1',
        successUrl: 'https://carsi.example.test/ok',
        cancelUrl: 'https://carsi.example.test/cancel',
        priceId: '',
      })
    ).rejects.toThrow('NO_VERIFIED_PRICE');
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });
});

describe('Teams checkout', () => {
  it('bills exactly the tier total shown ($299 for 5 seats) and accepts no promotion codes', async () => {
    const res = await teams(request({ tier: 'starter' }));
    expect(res.status).toBe(200);
    const args = lastSessionArgs();
    expect(args.line_items).toEqual([{ price: 'price_team_starter', quantity: 1 }]);
    expect(args).not.toHaveProperty('allow_promotion_codes');
  });

  for (const [label, wrong] of [
    ['a A$695 base (not the $299 shown)', price('price_team_starter', 69_500)],
    ['the old A$59.80 per-unit Price (no longer billed x 5)', price('price_team_starter', 5_980)],
    ['a monthly base', price('price_team_starter', 29_900, 'month')],
    ['another currency', price('price_team_starter', 29_900, 'year', 'usd')],
    ['a quantity transform', transformed(price('price_team_starter', 29_900))],
    ['tiered billing', tiered(price('price_team_starter', 29_900))],
  ] as const) {
    it(`refuses a tier Price with ${label}, and Stripe Checkout is never opened`, async () => {
      catalogue.price_team_starter = wrong;
      const res = await teams(request({ tier: 'starter' }));
      expect(res.status).toBe(503);
      expect(mocks.sessionsCreate).not.toHaveBeenCalled();
    });
  }
});

describe('extra staff seats: A$695 per year each', () => {
  beforeEach(() => {
    mocks.teamSubFind.mockResolvedValue({
      teamId: 'team-1',
      stripeSubscriptionId: 'sub_1',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      seatLimit: 5,
    });
    mocks.teamSubUpdate.mockResolvedValue({});
    mocks.subsUpdate.mockResolvedValue({ id: 'sub_1', latest_invoice: { id: 'in_1', status: 'paid' } });
  });

  const META = { plan: 'starter', base_price_id: 'price_team_starter', seat_price_id: 'price_seat' };
  const BASE_ITEM = { id: 'si_base', quantity: 1, price: price('price_team_starter', 29_900) };

  it('adds seats when the seat item is on the A$695 per year Price', async () => {
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically',
      metadata: META,
      items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: price('price_seat', 69_500) }] },
    });
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(200);
    expect(mocks.subsUpdate).toHaveBeenCalledWith(
      'sub_1',
      expect.objectContaining({ items: [{ id: 'si_seat', quantity: 4 }] })
    );
  });

  // The verified seat Price itself is wrong: refused before Stripe is touched (503).
  for (const [label, seatPrice] of [
    ['the old $49 seat', price('price_seat', 4_900)],
    ['a tier bundle Price', price('price_seat', 29_900)],
    ['a monthly A$695', price('price_seat', 69_500, 'month')],
    // 2 -> 4 seats would bill 2 transformed units: the added seats cost less than A$695 each.
    ['A$695 yearly with a quantity transform', transformed(price('price_seat', 69_500))],
    ['A$695 yearly with tiered billing', tiered(price('price_seat', 69_500))],
  ] as const) {
    it(`refuses, and charges nothing, when the seat Price is ${label}`, async () => {
      catalogue.price_seat = seatPrice;
      mocks.subsRetrieve.mockResolvedValue({
        collection_method: 'charge_automatically',
        metadata: META,
        items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: seatPrice }] },
      });
      const res = await expandSeats(request({ additional_seats: 2 }));
      expect(res.status).toBe(503);
      expect(mocks.subsUpdate).not.toHaveBeenCalled();
      expect(mocks.teamSubUpdate).not.toHaveBeenCalled();
    });
  }

  // The seat item on the subscription is not on the verified seat Price: refused (409).
  it('refuses, and charges nothing, when the seat item is on a different Price', async () => {
    mocks.subsRetrieve.mockResolvedValue({
      collection_method: 'charge_automatically',
      metadata: { ...META, seat_price_id: 'price_other' },
      items: { data: [BASE_ITEM, { id: 'si_seat', quantity: 2, price: price('price_other', 4_900) }] },
    });
    const res = await expandSeats(request({ additional_seats: 2 }));
    expect(res.status).toBe(409);
    expect(mocks.subsUpdate).not.toHaveBeenCalled();
    expect(mocks.teamSubUpdate).not.toHaveBeenCalled();
  });
});

describe('no membership checkout source enables promotion codes', () => {
  const ROOT = join(__dirname, '..', '..', '..');
  for (const file of [
    'app/api/lms/subscription/checkout/route.ts',
    'app/api/lms/subscription/org/checkout/route.ts',
    'app/api/lms/subscription/teams/checkout/route.ts',
    'app/api/lms/onboarding/[slug]/checkout/route.ts',
    'src/lib/server/onboarding-checkout.ts',
  ]) {
    it(file, () => {
      expect(readFileSync(join(ROOT, file), 'utf8')).not.toMatch(/allow_promotion_codes\s*:\s*true/);
    });
  }
});

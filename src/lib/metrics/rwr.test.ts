/**
 * V5 — RWR = (memberships × $795 + seats × seat price) ÷ 52 + 4-week rolling course sales
 * (GOAL.md), where the course term is the last 28 days ÷ 4. These pin the arithmetic, the Stripe
 * shaping (with a fake, read-only Stripe) and the fail-closed report.
 */
import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

import { annualiseUnitAmount, computeRwr, formatAud } from './rwr';
import { runRwrReport, withoutAmounts } from './rwr-report';
import {
  collectRwrInputs,
  RWR_MAX_PAGES,
  RwrUnreadableError,
  type RwrStripeReader,
} from './rwr-stripe';

describe('computeRwr — the GOAL.md formula', () => {
  it('one membership is $795 ÷ 52 a week', () => {
    const r = computeRwr({ memberships: 1, seatLines: [], courseSalesCents28d: 0 });
    expect(r.recurringWeeklyCents).toBe(1529); // 79500 / 52 = 1528.85
    expect(r.rwrWeeklyCents).toBe(1529);
  });

  it('adds seats at their seat price and a quarter of 28-day course sales', () => {
    const r = computeRwr({
      memberships: 3,
      seatLines: [
        { seats: 10, annualSeatPriceCents: 30_000 },
        { seats: 2, annualSeatPriceCents: 45_000 },
      ],
      courseSalesCents28d: 116_000,
    });
    // (3 × 79,500 + 10 × 30,000 + 2 × 45,000) / 52 + 116,000 / 4
    // = 628,500 / 52 + 29,000 = 12,086.54 + 29,000
    expect(r.seats).toBe(12);
    expect(r.membershipAnnualCents).toBe(238_500);
    expect(r.seatAnnualCents).toBe(390_000);
    expect(r.recurringWeeklyCents).toBe(12_087);
    expect(r.courseSalesWeeklyCents).toBe(29_000);
    expect(r.rwrWeeklyCents).toBe(41_087);
    expect(formatAud(r.rwrWeeklyCents)).toBe('$410.87');
  });

  it('course sales alone are the 28-day total ÷ 4', () => {
    const r = computeRwr({ memberships: 0, seatLines: [], courseSalesCents28d: 2_897 * 4 });
    expect(r.rwrWeeklyCents).toBe(2_897);
  });

  it('nothing sold is $0, from real zero inputs only', () => {
    expect(
      computeRwr({ memberships: 0, seatLines: [], courseSalesCents28d: 0 }).rwrWeeklyCents
    ).toBe(0);
  });

  it('refuses inputs that are not whole non-negative numbers', () => {
    expect(() => computeRwr({ memberships: -1, seatLines: [], courseSalesCents28d: 0 })).toThrow();
    expect(() =>
      computeRwr({
        memberships: 0,
        seatLines: [{ seats: 1.5, annualSeatPriceCents: 1 }],
        courseSalesCents28d: 0,
      })
    ).toThrow();
  });

  it('annualises Stripe intervals and refuses unknown ones', () => {
    expect(annualiseUnitAmount(30_000, 'year')).toBe(30_000);
    expect(annualiseUnitAmount(2_500, 'month')).toBe(30_000);
    expect(annualiseUnitAmount(15_000, 'month', 6)).toBe(30_000);
    expect(annualiseUnitAmount(100, 'fortnight')).toBeNull();
  });
});

// ---------------------------------------------------------------- fake Stripe (read-only)

type ItemSpec = { unit: number | null; qty: number; interval?: string; currency?: string };
type SubOpts = { currency?: string; livemode?: boolean; itemsHasMore?: boolean };

const MEMBERSHIP_ITEM: ItemSpec = { unit: 79_500, qty: 1, interval: 'year' };

function sub(id: string, plan: string, items?: ItemSpec[], opts: SubOpts = {}) {
  const specs = items ?? (plan === 'pro_annual' ? [MEMBERSHIP_ITEM] : []);
  return {
    id,
    status: 'active',
    livemode: opts.livemode ?? true,
    currency: opts.currency ?? 'aud',
    metadata: { plan },
    items: {
      has_more: opts.itemsHasMore ?? false,
      data: specs.map((i, n) => ({
        id: `${id}_i${n}`,
        quantity: i.qty,
        price: {
          unit_amount: i.unit,
          currency: i.currency ?? opts.currency ?? 'aud',
          recurring: { interval: i.interval ?? 'year', interval_count: 1 },
        },
      })),
    },
  } as unknown as Stripe.Subscription;
}

function session(
  id: string,
  cents: number,
  opts: { slug?: string | null; currency?: string; paid?: boolean; livemode?: boolean } = {}
) {
  return {
    id,
    livemode: opts.livemode ?? true,
    mode: 'payment',
    payment_status: opts.paid === false ? 'unpaid' : 'paid',
    currency: opts.currency ?? 'aud',
    amount_total: cents,
    metadata: opts.slug === null ? {} : { course_slug: opts.slug ?? 'some-course' },
  } as unknown as Stripe.Checkout.Session;
}

/** Serves `items` in pages of `pageSize`, honouring starting_after like Stripe does. */
function pager<T extends { id: string }>(items: T[], pageSize = 2, forceMore = false) {
  const calls: Array<Record<string, unknown>> = [];
  const list = async (params: Record<string, unknown>) => {
    calls.push(params);
    const after = params.starting_after as string | undefined;
    const start = after ? items.findIndex((i) => i.id === after) + 1 : 0;
    let data = items.slice(start, start + pageSize);
    // An account larger than the page cap: every page is full and more always follow.
    if (forceMore) data = [{ ...items[0], id: `${items[0].id}_page${calls.length}` }];
    return { data, has_more: forceMore || start + pageSize < items.length };
  };
  return { list, calls };
}

function fakeStripe(
  subs: Stripe.Subscription[],
  sessions: Stripe.Checkout.Session[],
  opts: { endlessSubs?: boolean } = {}
) {
  const s = pager(subs, 2, opts.endlessSubs);
  const c = pager(sessions, 2);
  const reader = {
    subscriptions: { list: s.list },
    checkout: { sessions: { list: c.list } },
  } as unknown as RwrStripeReader;
  return { reader, subCalls: s.calls, sessionCalls: c.calls };
}

const NOW = new Date('2026-10-18T00:00:00Z');

async function refuses(subs: Stripe.Subscription[], sessions: Stripe.Checkout.Session[] = []) {
  await expect(collectRwrInputs(fakeStripe(subs, sessions).reader, NOW)).rejects.toBeInstanceOf(
    RwrUnreadableError
  );
}

describe('collectRwrInputs — Stripe shaping', () => {
  it('counts memberships, Teams seats and paid course checkouts across pages', async () => {
    const { reader, sessionCalls } = fakeStripe(
      [
        sub('sub_m1', 'pro_annual'),
        sub('sub_m2', 'pro_annual'),
        sub('sub_t1', 'growth', [{ unit: 2_500, qty: 10, interval: 'month' }]),
        sub('sub_o1', 'org_monthly', [{ unit: 99_900, qty: 1, interval: 'month' }]),
        sub('sub_m3', 'pro_annual'),
      ],
      [
        session('cs_1', 2_897),
        session('cs_2', 39_500),
        session('cs_3', 2_900, { paid: false }), // not paid
        session('cs_4', 50_000, { slug: null }), // not a course (e.g. coaching)
        session('cs_5', 2_900),
      ]
    );
    const got = await collectRwrInputs(reader, NOW);
    expect(got.inputs).toEqual({
      memberships: 3,
      seatLines: [{ seats: 10, annualSeatPriceCents: 30_000 }],
      courseSalesCents28d: 2_897 + 39_500 + 2_900,
    });
    expect(got.excludedSubscriptions).toBe(1);
    expect(got.courseSales28d).toBe(3);
    // Reads the last 28 days of completed checkouts.
    expect(sessionCalls[0]).toMatchObject({
      status: 'complete',
      created: { gte: Math.floor(NOW.getTime() / 1000) - 28 * 86_400 },
    });
  });

  it('refuses a partial total when pagination does not finish', async () => {
    const { reader, subCalls } = fakeStripe(
      [sub('sub_1', 'pro_annual'), sub('sub_2', 'pro_annual')],
      [],
      { endlessSubs: true }
    );
    await expect(collectRwrInputs(reader, NOW)).rejects.toBeInstanceOf(RwrUnreadableError);
    expect(subCalls.length).toBe(RWR_MAX_PAGES);
  });

  it('refuses non-AUD course sales and seat prices', async () => {
    await refuses([], [session('cs_1', 100, { currency: 'usd' })]);
    await refuses([sub('sub_t', 'starter', [{ unit: 100, qty: 1, currency: 'usd' }])]);
  });

  // Review r1 P1-RWR-USD-INDIVIDUAL
  it('refuses a USD membership (subscription or price currency) and an unreadable one', async () => {
    await refuses([
      sub('sub_m_usd', 'pro_annual', [{ ...MEMBERSHIP_ITEM, currency: 'usd' }], {
        currency: 'usd',
      }),
    ]);
    await refuses([
      sub('sub_m_usd_price', 'pro_annual', [{ ...MEMBERSHIP_ITEM, currency: 'usd' }]),
    ]);
    await refuses([sub('sub_m_unreadable', 'pro_annual', [{ ...MEMBERSHIP_ITEM, unit: null }])]);
    await refuses([sub('sub_m_noitems', 'pro_annual', [])]);
  });

  // Review r1 P1-RWR-NESTED-PAGINATION
  it('refuses a subscription whose item list has more pages', async () => {
    await refuses([
      sub('sub_t_partial', 'growth', [{ unit: 30_000, qty: 5 }], { itemsHasMore: true }),
    ]);
    await refuses([sub('sub_m_partial', 'pro_annual', undefined, { itemsHasMore: true })]);
  });

  // Review r1 P1-RWR-TEST-MODE-LOOKS-LIVE (object level)
  it('refuses test-mode subscriptions and checkout sessions', async () => {
    await refuses([sub('sub_m_test', 'pro_annual', undefined, { livemode: false })]);
    await refuses([sub('sub_o_test', 'org_monthly', [], { livemode: false })]);
    await refuses([], [session('cs_test', 2_900, { livemode: false })]);
  });

  // Review r2 P1-RWR-SUB-CURRENCY-TEST-ESCAPES: only the subscription-level check can refuse this.
  it('refuses a USD subscription even when its item price is AUD', async () => {
    // Item prices set to AUD explicitly: the fixture would otherwise inherit the USD currency
    // and be refused by the item guard instead (the first version of this test did exactly that).
    await refuses([
      sub('sub_m_mixed', 'pro_annual', [{ ...MEMBERSHIP_ITEM, currency: 'aud' }], {
        currency: 'usd',
      }),
    ]);
    await refuses([
      sub('sub_t_mixed', 'growth', [{ unit: 30_000, qty: 5, currency: 'aud' }], {
        currency: 'usd',
      }),
    ]);
  });

  // Review r2 P1-RWR-INDIVIDUAL-ITEM-SHAPE
  it('counts a membership only as one AUD yearly item, quantity 1, at the membership price', async () => {
    await refuses([
      sub('sub_m_monthly', 'pro_annual', [{ ...MEMBERSHIP_ITEM, interval: 'month' }]),
    ]);
    await refuses([sub('sub_m_qty2', 'pro_annual', [{ ...MEMBERSHIP_ITEM, qty: 2 }])]);
    await refuses([sub('sub_m_price', 'pro_annual', [{ ...MEMBERSHIP_ITEM, unit: 49_500 }])]);
    await refuses([sub('sub_m_two', 'pro_annual', [MEMBERSHIP_ITEM, MEMBERSHIP_ITEM])]);
    const ok = await collectRwrInputs(fakeStripe([sub('sub_m_ok', 'pro_annual')], []).reader, NOW);
    expect(ok.inputs.memberships).toBe(1);
  });

  // Review r2 P1-RWR-UNKNOWN-ACTIVE-PLAN
  it('refuses an active subscription whose plan it cannot classify', async () => {
    await refuses([sub('sub_mystery', 'mystery_plan', [{ unit: 10_000, qty: 1 }])]);
    // Known out-of-formula plans are still counted as excluded, not refused.
    const got = await collectRwrInputs(
      fakeStripe([sub('sub_o', 'org_monthly', [{ unit: 99_900, qty: 1, interval: 'month' }])], [])
        .reader,
      NOW
    );
    expect(got.excludedSubscriptions).toBe(1);
  });
});

// ---------------------------------------------------------------- the report

async function report(
  env: Record<string, string | undefined>,
  reader?: RwrStripeReader | (() => never),
  json = false
) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runRwrReport({
    env,
    json,
    now: NOW,
    createStripe: () => {
      if (typeof reader === 'function') return reader();
      if (!reader) throw new Error('createStripe must not be called');
      return reader;
    },
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  });
  return { code, all: [...out, ...err].join('\n') };
}

const DOLLAR_FIGURE = /\$ ?\d/;
const ANY_AMOUNT = /[$€£]\s?\d|\b(?:AUD|USD)\s?\d|\d\s?(?:AUD|USD)\b/i;
/** Not test-prefixed: the report only proceeds when the objects themselves say livemode. */
const FIXTURE_KEY = 'fixture-key-not-a-real-key';

describe('withoutAmounts — the last line of defence on every exit-2 message', () => {
  it('removes money-shaped text in any common form and keeps the rest', () => {
    const out = withoutAmounts(
      'after $123.45, A$5, US$1,000.00, USD 99, 10 AUD and €7 — subscription sub_123 failed'
    );
    expect(out).not.toMatch(/[$€£]\s?\d|\b(?:AUD|USD)\s?\d|\d\s?(?:AUD|USD)\b/i);
    expect(out).toContain('subscription sub_123 failed');
  });
});

describe('runRwrReport — fails closed', () => {
  it('with no key: exits 2, names the blocker and prints no dollar figure', async () => {
    const r = await report({});
    expect(r.code).toBe(2);
    expect(r.all).toContain('STRIPE_SECRET_KEY is not set');
    expect(r.all).not.toMatch(DOLLAR_FIGURE);
  });

  // Review r1 P1-RWR-TEST-MODE-LOOKS-LIVE (key level)
  it('with a test-mode key: exits 2 before reading Stripe and prints no figure', async () => {
    const { reader } = fakeStripe([sub('sub_m1', 'pro_annual')], [session('cs_1', 4_000)]);
    for (const key of ['sk_test_FAKE_FIXTURE_000', 'rk_test_FAKE_FIXTURE_000']) {
      const r = await report({ STRIPE_SECRET_KEY: key }, reader);
      expect(r.code).toBe(2);
      expect(r.all).toContain('test-mode key');
      expect(r.all).not.toMatch(DOLLAR_FIGURE);
    }
  });

  it('with an unclassifiable active subscription and no sales: exits 2, never $0.00', async () => {
    const { reader } = fakeStripe(
      [sub('sub_mystery', 'mystery_plan', [{ unit: 10_000, qty: 1 }])],
      []
    );
    const r = await report({ STRIPE_SECRET_KEY: FIXTURE_KEY }, reader);
    expect(r.code).toBe(2);
    expect(r.all).toContain('unrecognised plan');
    expect(r.all).not.toMatch(DOLLAR_FIGURE);
  });

  it('with a monthly-billed membership item: exits 2 and prints no figure', async () => {
    const { reader } = fakeStripe(
      [sub('sub_m_monthly', 'pro_annual', [{ ...MEMBERSHIP_ITEM, interval: 'month' }])],
      []
    );
    const r = await report({ STRIPE_SECRET_KEY: FIXTURE_KEY }, reader);
    expect(r.code).toBe(2);
    expect(r.all).not.toMatch(DOLLAR_FIGURE);
  });

  it('with test-mode objects behind any key: exits 2 and prints no figure', async () => {
    const { reader } = fakeStripe(
      [sub('sub_m1', 'pro_annual', undefined, { livemode: false })],
      []
    );
    const r = await report({ STRIPE_SECRET_KEY: FIXTURE_KEY }, reader);
    expect(r.code).toBe(2);
    expect(r.all).not.toMatch(DOLLAR_FIGURE);
  });

  it('when Stripe errors: exits 2, prints no figure and never echoes the key', async () => {
    const r = await report({ STRIPE_SECRET_KEY: FIXTURE_KEY }, () => {
      throw new Error(`Invalid API Key provided: ${FIXTURE_KEY}`);
    });
    expect(r.code).toBe(2);
    expect(r.all).not.toMatch(DOLLAR_FIGURE);
    expect(r.all).not.toContain(FIXTURE_KEY);
  });

  // Review r1 P1-RWR-ERROR-DOLLARS
  it('when the Stripe error text carries an amount: exits 2 and prints no amount', async () => {
    for (const json of [false, true]) {
      const thrower = () => {
        throw new Error('Stripe request failed after amount $123.45 (USD 99, 10 AUD, A$5)');
      };
      const r = await report({ STRIPE_SECRET_KEY: FIXTURE_KEY }, thrower, json);
      expect(r.code).toBe(2);
      expect(r.all).not.toMatch(ANY_AMOUNT);
      const listFails = {
        subscriptions: {
          list: async () => {
            throw Object.assign(new Error('declined: $795.00 owing'), {
              type: 'StripeCardError',
              statusCode: 402,
            });
          },
        },
        checkout: { sessions: { list: async () => ({ data: [], has_more: false }) } },
      } as unknown as RwrStripeReader;
      const r2 = await report({ STRIPE_SECRET_KEY: FIXTURE_KEY }, listFails, json);
      expect(r2.code).toBe(2);
      expect(r2.all).toContain('StripeCardError');
      expect(r2.all).not.toMatch(ANY_AMOUNT);
    }
  });

  it('when pagination is incomplete: exits 2 and prints no figure', async () => {
    const { reader } = fakeStripe([sub('sub_1', 'pro_annual'), sub('sub_2', 'pro_annual')], [], {
      endlessSubs: true,
    });
    const r = await report({ STRIPE_SECRET_KEY: FIXTURE_KEY }, reader);
    expect(r.code).toBe(2);
    expect(r.all).not.toMatch(DOLLAR_FIGURE);
  });

  it('with readable live Stripe data: exits 0 and prints the weekly figure', async () => {
    const { reader } = fakeStripe([sub('sub_m1', 'pro_annual')], [session('cs_1', 4_000)]);
    const r = await report({ STRIPE_SECRET_KEY: FIXTURE_KEY }, reader);
    expect(r.code).toBe(0);
    // 79,500 / 52 + 4,000 / 4 = 1,528.85 + 1,000 → $25.29
    expect(r.all).toContain('RWR: $25.29 per week');
  });
});

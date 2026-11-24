import { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Where GP-773 seat billing meets main's GP-641 reversal guard and GP-759 seat-add idempotency.
 *
 * Seat count: the one Teams rule (classifyTeamSubscription, via readSubscriptionSeatQuantity).
 * Status: main's runGuardedSubscriptionWrite, which writes `unpaid` once the latest payment was
 * refunded or charged back, and `canceled` once Stripe deleted the subscription. Both must hold
 * on the same row: a refunded Teams subscription is written `unpaid` (no access) while its seat
 * count still comes only from the rule, and a reversed row cannot be topped up with seats.
 *
 * The real webhook, the real Teams store and the real seat rule run. Faked: the database, the
 * serializable-transaction runner, Stripe's invoice view, and the reversal ledger's verdict.
 */

const h = vi.hoisted(() => ({
  block: null as null | 'payment_reversed' | 'deleted',
  row: null as Record<string, unknown> | null,
  upserts: [] as Array<{ create: Record<string, unknown>; update: Record<string, unknown> }>,
  stripeCalls: 0,
}));

vi.mock('@/lib/prisma', () => {
  const lmsTeamSubscription = {
    findUnique: vi.fn(async () => h.row),
    upsert: vi.fn(async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
      h.upserts.push(args);
      h.row = { ...(h.row ?? args.create), ...args.update };
      return h.row;
    }),
    update: vi.fn(async () => h.row),
  };
  return {
    prisma: {
      lmsTeam: { findUnique: vi.fn(async () => ({ id: 'team-1' })) },
      lmsTeamSubscription,
    },
  };
});
vi.mock('@/lib/server/db-tx', async () => {
  const { prisma } = await import('@/lib/prisma');
  return { runSerializable: (fn: (tx: unknown) => Promise<unknown>) => fn(prisma) };
});
vi.mock('@/lib/server/subscription-invoice-view', () => ({
  runWithSubscriptionInvoiceView: (_id: string, _o: unknown, run: (view: unknown) => Promise<unknown>) => run({}),
}));
vi.mock('@/lib/server/payment-integrity-ledger', () => ({
  subscriptionAccessBlock: vi.fn(async () => h.block),
  recordUnfulfilledPayment: vi.fn(async () => true),
  resolveUnfulfilledPayment: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/subscription-store', () => ({
  upsertSubscription: vi.fn(),
  upsertTerminalSubscriptionStatus: vi.fn(),
  resolveUserIdForStripeSubscription: vi.fn(),
}));
vi.mock('@/lib/server/org-subscription-store', () => ({
  updateOrgSubscriptionFromStripe: vi.fn(),
  resolveTeamIdForOrgSubscription: vi.fn(),
}));
vi.mock('@/lib/server/carsi-coaching-subscription-store', () => ({
  upsertCoachingMonthlySubscription: vi.fn(),
  upsertTerminalCoachingSubscriptionStatus: vi.fn(),
  resolveUserIdForCoachingSubscription: vi.fn(),
}));
vi.mock('@/lib/server/subscription-analytics', () => ({ trackSubscriptionLifecycleEvent: vi.fn(async () => {}) }));
vi.mock('@/lib/server/renewal-reminder', () => ({ sendUpcomingRenewalReminder: vi.fn(async () => {}) }));
vi.mock('@/lib/server/subscriptions-flag', () => ({ teamSubscriptionsEnabled: () => true }));
vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: vi.fn(async () => ({ sub: 'owner', email: 'owner@seat-reversal.invalid' })),
}));
vi.mock('@/lib/server/teams', () => ({
  getTeamForUser: vi.fn(async () => ({ id: 'team-1', ownerId: 'owner' })),
}));
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => {
    h.stripeCalls += 1;
    return {
      customers: { retrieve: vi.fn(async () => ({ email: 'owner@seat-reversal.invalid' })) },
      prices: { retrieve: vi.fn(), list: vi.fn(async () => ({ data: [] })) },
      subscriptions: { retrieve: vi.fn(), update: vi.fn() },
    };
  },
}));

import { handleSubscriptionEvent } from './subscription-webhook';
import { POST as expandSeats } from '../../../app/api/lms/subscription/teams/expand-seats/route';

const CREATED_AT = 1_760_000_000;
const yearly = (id: string, unit_amount: number) => ({
  id,
  active: true,
  currency: 'aud',
  unit_amount,
  billing_scheme: 'per_unit',
  transform_quantity: null,
  recurring: { interval: 'year', interval_count: 1 },
});
const OWNER = yearly('price_owner', 129_500);
const SEAT = yearly('price_extra_seat', 69_500);

function teamEvent(
  type: 'customer.subscription.updated' | 'customer.subscription.deleted',
  items: Array<{ quantity: number; price: unknown }>,
): Stripe.Event {
  return {
    type,
    created: CREATED_AT,
    data: {
      object: {
        id: 'sub_team',
        status: type === 'customer.subscription.deleted' ? 'canceled' : 'active',
        customer: 'cus_1',
        cancel_at_period_end: false,
        metadata: { plan: 'business_owner', carsi_team_id: 'team-1' },
        items: { data: items.map((it, i) => ({ id: `si_${i}`, current_period_end: CREATED_AT + 86_400, ...it })) },
      },
    },
  } as unknown as Stripe.Event;
}
const lastWrite = () => h.upserts[h.upserts.length - 1]!.update as { status: string; seatLimit: number; plan: string };

beforeEach(() => {
  h.block = null;
  h.row = null;
  h.upserts = [];
  h.stripeCalls = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('webhook update on a Teams subscription: seat rule and reversal guard together', () => {
  it('control: a paid owner plan + 3 staff seats is written active with 4 seats', async () => {
    await handleSubscriptionEvent(
      teamEvent('customer.subscription.updated', [{ quantity: 1, price: OWNER }, { quantity: 3, price: SEAT }]),
    );
    expect(lastWrite()).toMatchObject({ status: 'active', seatLimit: 4, plan: 'business_owner' });
  });

  it('refunded or charged back: written unpaid (no access), seat count still from the rule', async () => {
    h.block = 'payment_reversed';
    await handleSubscriptionEvent(
      teamEvent('customer.subscription.updated', [{ quantity: 1, price: OWNER }, { quantity: 3, price: SEAT }]),
    );
    expect(lastWrite()).toMatchObject({ status: 'unpaid', seatLimit: 4 });
  });

  it('refunded with an unknown extra item: unpaid AND no seats', async () => {
    h.block = 'payment_reversed';
    await handleSubscriptionEvent(
      teamEvent('customer.subscription.updated', [
        { quantity: 1, price: OWNER },
        { quantity: 3, price: SEAT },
        { quantity: 1, price: yearly('price_addon', 4_900) },
      ]),
    );
    expect(lastWrite()).toMatchObject({ status: 'unpaid', seatLimit: 0 });
  });
});

describe('webhook cancellation on a Teams subscription', () => {
  it('deleted after a chargeback: the terminal write is unpaid, seat count from the rule', async () => {
    h.block = 'payment_reversed';
    await handleSubscriptionEvent(
      teamEvent('customer.subscription.deleted', [{ quantity: 1, price: OWNER }, { quantity: 2, price: SEAT }]),
    );
    expect(lastWrite()).toMatchObject({ status: 'unpaid', seatLimit: 3, plan: 'business_owner' });
  });

  it('deleted with an unknown extra item: canceled and no seats', async () => {
    await handleSubscriptionEvent(
      teamEvent('customer.subscription.deleted', [
        { quantity: 1, price: OWNER },
        { quantity: 2, price: SEAT },
        { quantity: 1, price: yearly('price_addon', 4_900) },
      ]),
    );
    expect(lastWrite()).toMatchObject({ status: 'canceled', seatLimit: 0 });
  });
});

describe('expand-seats after main: reversal and idempotency come before any Stripe call', () => {
  const expand = (body: Record<string, unknown>) =>
    expandSeats(
      new NextRequest('https://carsi.example.test/api/lms/subscription/teams/expand-seats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'gp773-rebase-placeholder-not-a-key';
  });

  it('a Teams row the reversal guard wrote unpaid cannot be topped up with seats (409, no Stripe call)', async () => {
    h.row = {
      teamId: 'team-1',
      stripeSubscriptionId: 'sub_team',
      status: 'unpaid',
      seatLimit: 4,
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
    };
    const res = await expand({ additional_seats: 1, request_id: 'seat-add-req-0001' });
    expect(res.status).toBe(409);
    expect(h.stripeCalls).toBe(0);
  });

  it('GP-759: a request without a click id is refused (400) before Stripe is called', async () => {
    h.row = {
      teamId: 'team-1',
      stripeSubscriptionId: 'sub_team',
      status: 'active',
      seatLimit: 4,
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
    };
    const res = await expand({ additional_seats: 1 });
    expect(res.status).toBe(400);
    expect(h.stripeCalls).toBe(0);
  });
});

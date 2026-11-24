import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

/**
 * GP-773 round 4 design fix: the signed subscription webhook writes a Teams seat limit only from
 * the subscription's items, through the one shared rule (classifyTeamSubscription, read by
 * readSubscriptionSeatQuantity). Exactly the owner plan item plus at most one verified seat item
 * grants seats; anything else grants none. Metadata never decides which item is which.
 *
 * Both webhook call sites are driven end to end: the snapshot (customer.subscription.updated)
 * and the terminal write (customer.subscription.deleted). Only the stores are mocked; the seat
 * reader is the real one.
 */

const team = vi.hoisted(() => ({
  upsertTeamSubscription: vi.fn(async () => {}),
  markTeamSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
  upsertTerminalTeamSubscriptionStatus: vi.fn(async () => {}),
  resolveTeamIdForStripeSubscription: vi.fn(async () => 'team-1'),
}));

vi.mock('./subscription-store', () => ({
  upsertSubscription: vi.fn(async () => {}),
  markSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
  upsertTerminalSubscriptionStatus: vi.fn(async () => {}),
  resolveUserIdForStripeSubscription: vi.fn(async () => 'user-1'),
}));
vi.mock('./team-subscription-store', async () => {
  const pure = await vi.importActual<typeof import('./team-subscription-store-pure')>(
    './team-subscription-store-pure',
  );
  return {
    readSubscriptionSeatQuantity: pure.readSubscriptionSeatQuantity,
    upsertTeamSubscription: (...a: unknown[]) => team.upsertTeamSubscription(...(a as [])),
    markTeamSubscriptionStatusBySubscriptionId: (...a: unknown[]) =>
      team.markTeamSubscriptionStatusBySubscriptionId(...(a as [])),
    upsertTerminalTeamSubscriptionStatus: (...a: unknown[]) =>
      team.upsertTerminalTeamSubscriptionStatus(...(a as [])),
    resolveTeamIdForStripeSubscription: (...a: unknown[]) =>
      team.resolveTeamIdForStripeSubscription(...(a as [])),
  };
});
vi.mock('./org-subscription-store', () => ({
  updateOrgSubscriptionFromStripe: vi.fn(async () => true),
  markOrgSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
  resolveTeamIdForOrgSubscription: vi.fn(async () => 'team-org-1'),
}));
vi.mock('./carsi-coaching-subscription-store', () => ({
  upsertCoachingMonthlySubscription: vi.fn(async () => {}),
  markCoachingSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
  upsertTerminalCoachingSubscriptionStatus: vi.fn(async () => {}),
  resolveUserIdForCoachingSubscription: vi.fn(async () => 'user-coach-1'),
}));
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    customers: { retrieve: vi.fn(async () => ({ email: 'x@example.com' })) },
    subscriptions: { retrieve: vi.fn() },
  }),
}));

import { handleSubscriptionEvent } from './subscription-webhook';

const CREATED_AT = 1_760_000_000;

function price(id: string, cents: number) {
  return {
    id,
    active: true,
    currency: 'aud',
    unit_amount: cents,
    type: 'recurring',
    recurring: { interval: 'year', interval_count: 1 },
    billing_scheme: 'per_unit',
    transform_quantity: null,
  };
}
const OWNER = price('price_owner', 129_500);
const SEAT = price('price_extra_seat', 69_500);
const META = {
  plan: 'business_owner',
  carsi_team_id: 'team-1',
  base_price_id: 'price_owner',
  seat_price_id: 'price_extra_seat',
};

function teamEvent(
  type: 'customer.subscription.updated' | 'customer.subscription.deleted',
  items: Array<{ quantity: number; price: unknown }>,
  metadata: Record<string, string> = META,
): Stripe.Event {
  return {
    type,
    created: CREATED_AT,
    data: {
      object: {
        id: 'sub_team',
        status: type === 'customer.subscription.deleted' ? 'canceled' : 'active',
        customer: 'cus_1',
        items: {
          data: items.map((it, i) => ({ id: `si_${i}`, current_period_end: CREATED_AT + 86_400, ...it })),
        },
        cancel_at_period_end: false,
        metadata,
      },
    },
  } as unknown as Stripe.Event;
}

const snapshotSeats = () =>
  (team.upsertTeamSubscription.mock.calls[0][0] as unknown as { seatLimit: number }).seatLimit;
const terminalSeats = () =>
  (team.upsertTerminalTeamSubscriptionStatus.mock.calls[0][0] as unknown as { seatLimit: number }).seatLimit;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('webhook snapshot (customer.subscription.updated) seat limit', () => {
  it('owner plan + 3 staff seats = 4', async () => {
    await handleSubscriptionEvent(
      teamEvent('customer.subscription.updated', [{ quantity: 1, price: OWNER }, { quantity: 3, price: SEAT }]),
    );
    expect(snapshotSeats()).toBe(4);
  });

  it('metadata naming another seat Price does not drop the paid seat item (Codex repro, webhook side)', async () => {
    await handleSubscriptionEvent(
      teamEvent(
        'customer.subscription.updated',
        [{ quantity: 1, price: OWNER }, { quantity: 3, price: SEAT }],
        { ...META, seat_price_id: 'price_old_seat' },
      ),
    );
    expect(snapshotSeats()).toBe(4);
  });

  it('an extra unknown item: no seats granted', async () => {
    await handleSubscriptionEvent(
      teamEvent('customer.subscription.updated', [
        { quantity: 1, price: OWNER },
        { quantity: 3, price: SEAT },
        { quantity: 1, price: price('price_addon', 4_900) },
      ]),
    );
    expect(snapshotSeats()).toBe(0);
  });

  it('two seat items: no seats granted', async () => {
    await handleSubscriptionEvent(
      teamEvent('customer.subscription.updated', [
        { quantity: 1, price: OWNER },
        { quantity: 3, price: SEAT },
        { quantity: 2, price: SEAT },
      ]),
    );
    expect(snapshotSeats()).toBe(0);
  });
});

describe('webhook terminal write (customer.subscription.deleted) seat limit', () => {
  it('owner plan + 2 staff seats = 3', async () => {
    await handleSubscriptionEvent(
      teamEvent('customer.subscription.deleted', [{ quantity: 1, price: OWNER }, { quantity: 2, price: SEAT }]),
    );
    expect(terminalSeats()).toBe(3);
  });

  it('an extra unknown item: no seats granted', async () => {
    await handleSubscriptionEvent(
      teamEvent('customer.subscription.deleted', [
        { quantity: 1, price: OWNER },
        { quantity: 2, price: SEAT },
        { quantity: 1, price: price('price_addon', 4_900) },
      ]),
    );
    expect(terminalSeats()).toBe(0);
  });
});

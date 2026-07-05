import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

/**
 * WS1-E2/E3 (GP-442/GP-443): the SINGLE signed webhook dispatches a subscription
 * event to the correct store (individual / team / org) by its `plan` metadata.
 * These tests prove the routing without a DB or live Stripe by mocking the three
 * stores and asserting exactly one store is written per plan.
 */

// The real seat-quantity reader (its own pure module, never mocked).
import { readSubscriptionSeatQuantity as realReadSeatQuantity } from './team-subscription-store-pure';

// --- store mocks (hoisted so vi.mock factories can see them) ---
const indiv = vi.hoisted(() => ({
  upsertSubscription: vi.fn(async () => {}),
  markSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
  upsertTerminalSubscriptionStatus: vi.fn(async () => {}),
  resolveUserIdForStripeSubscription: vi.fn(async () => 'user-1'),
}));
const team = vi.hoisted(() => ({
  upsertTeamSubscription: vi.fn(async () => {}),
  markTeamSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
  upsertTerminalTeamSubscriptionStatus: vi.fn(async () => {}),
  resolveTeamIdForStripeSubscription: vi.fn(async () => 'team-1'),
  readSubscriptionSeatQuantity: vi.fn(() => 5),
}));
const org = vi.hoisted(() => ({
  updateOrgSubscriptionFromStripe: vi.fn(async () => true),
  markOrgSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
  resolveTeamIdForOrgSubscription: vi.fn(async () => 'team-org-1'),
}));

vi.mock('./subscription-store', () => ({
  upsertSubscription: (...a: unknown[]) => indiv.upsertSubscription(...(a as [])),
  markSubscriptionStatusBySubscriptionId: (...a: unknown[]) =>
    indiv.markSubscriptionStatusBySubscriptionId(...(a as [])),
  upsertTerminalSubscriptionStatus: (...a: unknown[]) =>
    indiv.upsertTerminalSubscriptionStatus(...(a as [])),
  resolveUserIdForStripeSubscription: (...a: unknown[]) =>
    indiv.resolveUserIdForStripeSubscription(...(a as [])),
}));
vi.mock('./team-subscription-store', () => {
  return {
    // Deterministic seat reader for routing assertions (real reader tested
    // separately via team-subscription-store-pure).
    readSubscriptionSeatQuantity: team.readSubscriptionSeatQuantity,
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
  updateOrgSubscriptionFromStripe: (...a: unknown[]) =>
    org.updateOrgSubscriptionFromStripe(...(a as [])),
  markOrgSubscriptionStatusBySubscriptionId: (...a: unknown[]) =>
    org.markOrgSubscriptionStatusBySubscriptionId(...(a as [])),
  resolveTeamIdForOrgSubscription: (...a: unknown[]) =>
    org.resolveTeamIdForOrgSubscription(...(a as [])),
}));
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    customers: { retrieve: vi.fn(async () => ({ email: 'x@example.com' })) },
    subscriptions: { retrieve: vi.fn() },
  }),
}));

import { handleSubscriptionEvent, subscriptionKindFromPlan } from './subscription-webhook';

const CREATED_AT = 1_760_000_000;

function subEvent(type: string, metadata: Record<string, string>): Stripe.Event {
  return {
    type,
    created: CREATED_AT,
    data: {
      object: {
        id: 'sub_x',
        status: 'active',
        customer: 'cus_1',
        items: { data: [{ id: 'si_1', quantity: 5, current_period_end: CREATED_AT + 86400 }] },
        cancel_at_period_end: false,
        metadata,
      },
    },
  } as unknown as Stripe.Event;
}

beforeEach(() => vi.clearAllMocks());

describe('subscriptionKindFromPlan (pure)', () => {
  it('maps plans to the right kind', () => {
    expect(subscriptionKindFromPlan('pro_annual')).toBe('individual');
    expect(subscriptionKindFromPlan('starter')).toBe('team');
    expect(subscriptionKindFromPlan('growth')).toBe('team');
    expect(subscriptionKindFromPlan('full_library')).toBe('team');
    expect(subscriptionKindFromPlan('teams_growth')).toBe('team');
    expect(subscriptionKindFromPlan('org_monthly')).toBe('org');
    expect(subscriptionKindFromPlan('nonsense')).toBe('unknown');
    expect(subscriptionKindFromPlan(null)).toBe('unknown');
  });
});

describe('readSubscriptionSeatQuantity (pure)', () => {
  it('reads the item quantity, then metadata seat_count, else 0 (fail closed)', () => {
    expect(
      realReadSeatQuantity({ items: { data: [{ quantity: 7 }] }, metadata: {} } as unknown as Stripe.Subscription),
    ).toBe(7);
    expect(
      realReadSeatQuantity({ items: { data: [] }, metadata: { seat_count: '9' } } as unknown as Stripe.Subscription),
    ).toBe(9);
    expect(
      realReadSeatQuantity({ items: { data: [] }, metadata: {} } as unknown as Stripe.Subscription),
    ).toBe(0);
  });
});

describe('handleSubscriptionEvent — plan routing (created/updated)', () => {
  it('routes pro_annual → individual store only', async () => {
    await handleSubscriptionEvent(subEvent('customer.subscription.created', { plan: 'pro_annual', carsi_user_id: 'user-1' }));
    expect(indiv.upsertSubscription).toHaveBeenCalledTimes(1);
    expect(team.upsertTeamSubscription).not.toHaveBeenCalled();
    expect(org.updateOrgSubscriptionFromStripe).not.toHaveBeenCalled();
  });

  it('routes a Teams tier → team store only, carrying the seat quantity', async () => {
    await handleSubscriptionEvent(subEvent('customer.subscription.updated', { plan: 'starter', carsi_team_id: 'team-1' }));
    expect(team.upsertTeamSubscription).toHaveBeenCalledTimes(1);
    expect(indiv.upsertSubscription).not.toHaveBeenCalled();
    expect(org.updateOrgSubscriptionFromStripe).not.toHaveBeenCalled();
    const arg = team.upsertTeamSubscription.mock.calls[0][0] as { seatLimit: number; plan: string };
    expect(arg.seatLimit).toBe(5);
    expect(arg.plan).toBe('starter');
  });

  it('routes org_monthly → org store only', async () => {
    await handleSubscriptionEvent(subEvent('customer.subscription.created', { plan: 'org_monthly', carsi_team_id: 'team-org-1' }));
    expect(org.updateOrgSubscriptionFromStripe).toHaveBeenCalledTimes(1);
    expect(indiv.upsertSubscription).not.toHaveBeenCalled();
    expect(team.upsertTeamSubscription).not.toHaveBeenCalled();
  });

  it('skips an unknown plan (never mis-attaches to a wrong table)', async () => {
    await handleSubscriptionEvent(subEvent('customer.subscription.created', { plan: 'mystery' }));
    expect(indiv.upsertSubscription).not.toHaveBeenCalled();
    expect(team.upsertTeamSubscription).not.toHaveBeenCalled();
    expect(org.updateOrgSubscriptionFromStripe).not.toHaveBeenCalled();
  });
});

describe('handleSubscriptionEvent — plan routing (deleted → sticky cancel)', () => {
  it('routes a Teams cancel → team terminal writer', async () => {
    await handleSubscriptionEvent(subEvent('customer.subscription.deleted', { plan: 'growth', carsi_team_id: 'team-1' }));
    expect(team.upsertTerminalTeamSubscriptionStatus).toHaveBeenCalledTimes(1);
    expect(indiv.upsertTerminalSubscriptionStatus).not.toHaveBeenCalled();
  });

  it('routes an org cancel → org update writer', async () => {
    await handleSubscriptionEvent(subEvent('customer.subscription.deleted', { plan: 'org_monthly', carsi_team_id: 'team-org-1' }));
    expect(org.updateOrgSubscriptionFromStripe).toHaveBeenCalledTimes(1);
    expect(indiv.upsertTerminalSubscriptionStatus).not.toHaveBeenCalled();
  });

  it('routes an individual cancel → individual sticky terminal writer (no regression)', async () => {
    await handleSubscriptionEvent(subEvent('customer.subscription.deleted', { plan: 'pro_annual', carsi_user_id: 'user-1' }));
    expect(indiv.upsertTerminalSubscriptionStatus).toHaveBeenCalledTimes(1);
    expect(team.upsertTerminalTeamSubscriptionStatus).not.toHaveBeenCalled();
    expect(org.updateOrgSubscriptionFromStripe).not.toHaveBeenCalled();
  });
});

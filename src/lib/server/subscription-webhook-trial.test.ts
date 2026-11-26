import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

/**
 * GP-458 gap: the individual annual membership checkout now creates the Stripe
 * subscription with `trial_period_days: 7` (app/api/lms/subscription/checkout/
 * route.ts), so Stripe sends `customer.subscription.created` with
 * `status: 'trialing'` before any charge happens. `applySubscriptionSnapshot`
 * (subscription-webhook.ts) has no trial-specific branch — it persists
 * whatever status Stripe reports via the generic `upsertSubscription` path —
 * which was previously only exercised for `active`/`canceled` snapshots, never
 * for the new trialing-on-creation shape GP-458 introduced. This proves the
 * webhook correctly upserts a trialing snapshot AND that the persisted state
 * is one `decideMembershipEntitlement` grants (full catalogue, no charge yet).
 */

const upsertSubscription = vi.fn(async () => {});
const resolveUserIdForStripeSubscription = vi.fn(async () => 'user-trial-1');

// GP-759 unfulfilled-payment ledger (a database write), covered by stripe-webhook-unfulfilled.test.ts.
vi.mock('./payment-integrity-ledger', () => ({
  recordUnfulfilledPayment: vi.fn(async () => true),
  resolveUnfulfilledPayment: vi.fn(async () => {}),
  // GP-641: no reversal recorded, so Stripe's latest invoice is never read.
  subscriptionAccessNeedsLatestInvoice: vi.fn(async () => false),
  StaleSubscriptionInvoiceView: class extends Error {},
}));
vi.mock('./subscription-store', () => ({
  upsertSubscription: (...a: unknown[]) => upsertSubscription(...(a as [])),
  resolveUserIdForStripeSubscription: (...a: unknown[]) =>
    resolveUserIdForStripeSubscription(...(a as [])),
  upsertTerminalSubscriptionStatus: vi.fn(async () => {}),
}));

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    customers: { retrieve: vi.fn(async () => ({ email: 'trialist@example.com' })) },
    subscriptions: { retrieve: vi.fn() },
  }),
}));

import { handleSubscriptionEvent } from './subscription-webhook';
import { decideMembershipEntitlement } from './entitlements';

const CREATED_AT = 1_780_000_000; // unix seconds
const TRIAL_PERIOD_END = CREATED_AT + 7 * 24 * 60 * 60; // +7 days, unix seconds

function trialCreatedEvent(currentPeriodEnd: number | null = TRIAL_PERIOD_END): Stripe.Event {
  return {
    type: 'customer.subscription.created',
    created: CREATED_AT,
    data: {
      object: {
        id: 'sub_trial_1',
        status: 'trialing',
        customer: 'cus_trial_1',
        items: { data: [] },
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: false,
        metadata: { carsi_user_id: 'user-trial-1', plan: 'pro_annual' },
      },
    },
  } as unknown as Stripe.Event;
}

type PersistedWrite = {
  userId: string;
  stripeSubscriptionId: string;
  status: string;
  currentPeriodEnd: Date | null;
  eventTimestamp: Date | null;
};

/** The one write the webhook made, as the store received it. */
function persistedWrite(): PersistedWrite {
  expect(upsertSubscription).toHaveBeenCalledTimes(1);
  return upsertSubscription.mock.calls[0][0] as PersistedWrite;
}

describe('customer.subscription.created (trialing) — GP-458 7-day trial webhook path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts the trialing snapshot for the resolved user (no charge has happened yet)', async () => {
    await handleSubscriptionEvent(trialCreatedEvent());

    const arg = persistedWrite();
    expect(arg.userId).toBe('user-trial-1');
    expect(arg.stripeSubscriptionId).toBe('sub_trial_1');
    expect(arg.status).toBe('trialing');
    expect(arg.currentPeriodEnd).toEqual(new Date(TRIAL_PERIOD_END * 1000));
    expect(arg.eventTimestamp).toEqual(new Date(CREATED_AT * 1000));
  });

  // GP-796: the entitlement is decided on what the webhook actually wrote, not on a hand-built copy.
  it('the persisted trialing write entitles full catalogue access', async () => {
    await handleSubscriptionEvent(trialCreatedEvent());
    const { status, currentPeriodEnd } = persistedWrite();
    const decision = decideMembershipEntitlement(
      { status, currentPeriodEnd },
      new Date(CREATED_AT * 1000 + 1000), // one second into the trial
    );
    expect(decision).toEqual({ entitled: true, reason: 'active' });
  });

  it('a trial with no period end is written with a null period end and is still entitled while trialing', async () => {
    await handleSubscriptionEvent(trialCreatedEvent(null));
    const { status, currentPeriodEnd } = persistedWrite();
    expect(status).toBe('trialing');
    expect(currentPeriodEnd).toBeNull();
    expect(decideMembershipEntitlement({ status, currentPeriodEnd }, new Date(CREATED_AT * 1000 + 1000))).toEqual({
      entitled: true,
      reason: 'active',
    });
  });

  it('a trialing write read after its period end: Stripe\'s status decides, not the stored date', async () => {
    // Stripe moves a subscription off `trialing` when the trial ends (to active, past_due or
    // canceled), and that later snapshot is what changes access. Until it arrives, the stored
    // trialing row stays entitled; the period end is not consulted for a live status.
    await handleSubscriptionEvent(trialCreatedEvent());
    const { status, currentPeriodEnd } = persistedWrite();
    const afterTrial = new Date((TRIAL_PERIOD_END + 86_400) * 1000);
    expect(currentPeriodEnd!.getTime()).toBeLessThan(afterTrial.getTime());
    expect(decideMembershipEntitlement({ status, currentPeriodEnd }, afterTrial)).toEqual({
      entitled: true,
      reason: 'active',
    });
  });

  it('skips silently (never mis-grants) when the CARSI user cannot be resolved', async () => {
    resolveUserIdForStripeSubscription.mockResolvedValueOnce(null as unknown as string);
    await handleSubscriptionEvent(trialCreatedEvent());
    expect(upsertSubscription).not.toHaveBeenCalled();
  });
});

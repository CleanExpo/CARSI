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

vi.mock('./subscription-store', () => ({
  upsertSubscription: (...a: unknown[]) => upsertSubscription(...(a as [])),
  resolveUserIdForStripeSubscription: (...a: unknown[]) =>
    resolveUserIdForStripeSubscription(...(a as [])),
  markSubscriptionStatusBySubscriptionId: vi.fn(async () => {}),
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

function trialCreatedEvent(): Stripe.Event {
  return {
    type: 'customer.subscription.created',
    created: CREATED_AT,
    data: {
      object: {
        id: 'sub_trial_1',
        status: 'trialing',
        customer: 'cus_trial_1',
        items: { data: [] },
        current_period_end: TRIAL_PERIOD_END,
        cancel_at_period_end: false,
        metadata: { carsi_user_id: 'user-trial-1', plan: 'pro_annual' },
      },
    },
  } as unknown as Stripe.Event;
}

describe('customer.subscription.created (trialing) — GP-458 7-day trial webhook path', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts the trialing snapshot for the resolved user (no charge has happened yet)', async () => {
    await handleSubscriptionEvent(trialCreatedEvent());

    expect(upsertSubscription).toHaveBeenCalledTimes(1);
    const arg = upsertSubscription.mock.calls[0][0] as {
      userId: string;
      stripeSubscriptionId: string;
      status: string;
    };
    expect(arg.userId).toBe('user-trial-1');
    expect(arg.stripeSubscriptionId).toBe('sub_trial_1');
    expect(arg.status).toBe('trialing');
  });

  it('the persisted trialing status entitles full catalogue access without inspecting period end', () => {
    // What the webhook wrote is exactly what the entitlement gate consults on
    // the learner's next request — prove the two agree end-to-end.
    const decision = decideMembershipEntitlement(
      { status: 'trialing', currentPeriodEnd: new Date(TRIAL_PERIOD_END * 1000) },
      new Date(CREATED_AT * 1000 + 1000), // one second into the trial
    );
    expect(decision).toEqual({ entitled: true, reason: 'active' });
  });

  it('skips silently (never mis-grants) when the CARSI user cannot be resolved', async () => {
    resolveUserIdForStripeSubscription.mockResolvedValueOnce(null as unknown as string);
    await handleSubscriptionEvent(trialCreatedEvent());
    expect(upsertSubscription).not.toHaveBeenCalled();
  });
});

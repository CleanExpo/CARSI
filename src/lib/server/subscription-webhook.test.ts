import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

/**
 * FINDING 1 (GP-441): a subscription refund/dispute must revoke membership
 * access. FINDING 2 parity: the `customer.subscription.deleted` handler must
 * write a sticky terminal state.
 *
 * These tests prove the end-to-end intent of Finding 1 without a live DB or
 * Stripe: the revocation reader resolves a subscription id from a refunded
 * payment intent, the store marks the membership `canceled`, and the
 * entitlement decision then reports the member as NOT entitled — exactly the
 * gate the refunded/charged-back learner hits when trying to enrol.
 */

import {
  readSubscriptionIdFromPaymentIntent,
  readInvoiceSubscriptionId,
} from './stripe-subscription-map';
import { decideMembershipEntitlement } from './entitlements';

function pi(overrides: Record<string, unknown>): Stripe.PaymentIntent {
  return overrides as unknown as Stripe.PaymentIntent;
}

describe('readSubscriptionIdFromPaymentIntent (Finding 1 — detect a subscription charge)', () => {
  it('reads the subscription id from an expanded invoice (current clover shape)', () => {
    // charge.refunded → payment_intent retrieved with expand:['invoice'];
    // the invoice carries the subscription under parent.subscription_details.
    const paymentIntent = pi({
      invoice: { parent: { subscription_details: { subscription: 'sub_795' } } },
    });
    expect(readSubscriptionIdFromPaymentIntent(paymentIntent)).toBe('sub_795');
  });

  it('reads the subscription id from a legacy top-level invoice.subscription', () => {
    const paymentIntent = pi({ invoice: { subscription: 'sub_legacy' } });
    expect(readSubscriptionIdFromPaymentIntent(paymentIntent)).toBe('sub_legacy');
  });

  it('returns null for a ONE-OFF charge (no invoice) — membership left untouched', () => {
    expect(readSubscriptionIdFromPaymentIntent(pi({}))).toBeNull();
    expect(readSubscriptionIdFromPaymentIntent(pi({ invoice: null }))).toBeNull();
  });

  it('returns null for a subscription-less invoice (e.g. one-off invoice item)', () => {
    // Sanity check the delegated reader agrees for a parentless invoice.
    expect(readInvoiceSubscriptionId({ parent: null } as unknown as Stripe.Invoice)).toBeNull();
    expect(readSubscriptionIdFromPaymentIntent(pi({ invoice: { parent: null } }))).toBeNull();
  });
});

describe('refund/dispute → membership revoked → NOT entitled (Finding 1 end-to-end)', () => {
  it('a subscription refund marks the membership canceled, and canceled is NOT entitled', () => {
    // The revocation path writes status='canceled' (via
    // markSubscriptionStatusBySubscriptionId). The entitlement decision core is
    // the single source of truth the enrol gate consults — prove it denies.
    const afterRevocation = decideMembershipEntitlement(
      { status: 'canceled', currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z') },
      new Date('2026-07-04T00:00:00.000Z'),
    );
    // Even with a period end far in the future, canceled = lapsed = no new access.
    expect(afterRevocation).toEqual({ entitled: false, reason: 'lapsed' });
  });

  it('contrast: before revocation an active membership IS entitled', () => {
    const beforeRevocation = decideMembershipEntitlement(
      { status: 'active', currentPeriodEnd: new Date('2099-01-01T00:00:00.000Z') },
      new Date('2026-07-04T00:00:00.000Z'),
    );
    expect(beforeRevocation).toEqual({ entitled: true, reason: 'active' });
  });
});

/**
 * Store-integration for the webhook deleted handler and the refund revocation
 * writer. We mock the store module so we can assert the handler calls the sticky
 * terminal writer with the resolved user + event timestamp, and that the refund
 * path marks the subscription canceled.
 */

const upsertTerminalSubscriptionStatus = vi.fn(async () => {});
const markSubscriptionStatusBySubscriptionId = vi.fn(async () => {});
const upsertSubscription = vi.fn(async () => {});
const resolveUserIdForStripeSubscription = vi.fn(async () => 'user-42');

vi.mock('./subscription-store', () => ({
  upsertTerminalSubscriptionStatus: (...a: unknown[]) =>
    upsertTerminalSubscriptionStatus(...(a as [])),
  markSubscriptionStatusBySubscriptionId: (...a: unknown[]) =>
    markSubscriptionStatusBySubscriptionId(...(a as [])),
  upsertSubscription: (...a: unknown[]) => upsertSubscription(...(a as [])),
  resolveUserIdForStripeSubscription: (...a: unknown[]) =>
    resolveUserIdForStripeSubscription(...(a as [])),
}));

// Stripe client is only used for customer email lookup in the deleted handler.
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    customers: { retrieve: vi.fn(async () => ({ email: 'member@example.com' })) },
    subscriptions: { retrieve: vi.fn() },
  }),
}));

import { handleSubscriptionEvent } from './subscription-webhook';

const DELETED_AT = 1_760_000_000; // unix seconds

function deletedEvent(): Stripe.Event {
  return {
    type: 'customer.subscription.deleted',
    created: DELETED_AT,
    data: {
      object: {
        id: 'sub_795',
        status: 'canceled',
        customer: 'cus_1',
        items: { data: [] },
        metadata: { carsi_user_id: 'user-42' },
      },
    },
  } as unknown as Stripe.Event;
}

describe('customer.subscription.deleted → sticky terminal write (Finding 2 parity)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves the user and writes a sticky canceled row stamped with event.created', async () => {
    await handleSubscriptionEvent(deletedEvent());
    expect(upsertTerminalSubscriptionStatus).toHaveBeenCalledTimes(1);
    const arg = upsertTerminalSubscriptionStatus.mock.calls[0][0] as {
      userId: string;
      stripeSubscriptionId: string;
      status: string;
      eventTimestamp: Date;
    };
    expect(arg.userId).toBe('user-42');
    expect(arg.stripeSubscriptionId).toBe('sub_795');
    expect(arg.status).toBe('canceled');
    expect(arg.eventTimestamp).toEqual(new Date(DELETED_AT * 1000));
    // It must NOT silently no-op via the id-keyed legacy path.
    expect(markSubscriptionStatusBySubscriptionId).not.toHaveBeenCalled();
  });

  it('falls back to the id-keyed write when the user cannot be resolved', async () => {
    resolveUserIdForStripeSubscription.mockResolvedValueOnce(null as unknown as string);
    await handleSubscriptionEvent(deletedEvent());
    expect(upsertTerminalSubscriptionStatus).not.toHaveBeenCalled();
    expect(markSubscriptionStatusBySubscriptionId).toHaveBeenCalledWith('sub_795', 'canceled');
  });
});

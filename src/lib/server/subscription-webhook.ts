/**
 * Additive Stripe webhook handlers for the individual annual membership
 * (WS1-E1, GP-441). These are called from the EXISTING signature-verified,
 * idempotency-claimed webhook route — they do not fork it. Each handler is
 * idempotent (upsert keyed on the unique subscription id), so Stripe's
 * at-least-once delivery and the route's replay protection together guarantee a
 * single grant per subscription state.
 *
 * Handled events:
 *  - customer.subscription.created | updated → upsert the membership snapshot
 *  - customer.subscription.deleted           → mark the membership canceled
 *  - invoice.paid                            → refresh the membership from the
 *                                              linked subscription (renewal)
 *  - invoice.payment_failed                  → refresh (Stripe has already moved
 *                                              the subscription to past_due)
 */

import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/api/stripe';
import {
  readCancelAtPeriodEnd,
  readCurrentPeriodEnd,
  readCustomerId,
  readInvoiceEmail,
  readInvoiceSubscriptionId,
} from '@/lib/server/stripe-subscription-map';
import {
  markSubscriptionStatusBySubscriptionId,
  resolveUserIdForStripeSubscription,
  upsertSubscription,
} from '@/lib/server/subscription-store';

/** Stripe subscription lifecycle + invoice events this module owns. */
export const SUBSCRIPTION_EVENT_TYPES = new Set<string>([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

export function isSubscriptionEvent(type: string): boolean {
  return SUBSCRIPTION_EVENT_TYPES.has(type);
}

/** Best-effort email for a subscription's customer (to map to a CARSI user). */
async function emailForSubscriptionCustomer(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const customerId = readCustomerId(subscription);
  if (!customerId) return null;
  try {
    const customer = await getStripeClient().customers.retrieve(customerId);
    if (customer && !('deleted' in customer && customer.deleted)) {
      const email = (customer as Stripe.Customer).email;
      return email ? email.trim().toLowerCase() : null;
    }
  } catch (error) {
    console.error('[subscription-webhook] customer lookup failed:', error);
  }
  return null;
}

/** Upsert the membership from a full subscription object. */
async function applySubscriptionSnapshot(subscription: Stripe.Subscription): Promise<void> {
  const email = await emailForSubscriptionCustomer(subscription);
  const userId = await resolveUserIdForStripeSubscription(subscription, email);
  if (!userId) {
    console.warn('[subscription-webhook] could not resolve CARSI user; skipping', {
      subscriptionId: subscription.id,
    });
    return;
  }

  await upsertSubscription({
    userId,
    stripeCustomerId: readCustomerId(subscription),
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: readCurrentPeriodEnd(subscription),
    cancelAtPeriodEnd: readCancelAtPeriodEnd(subscription),
  });
}

/**
 * Handle one subscription/invoice event. MUST be called only for event types in
 * `SUBSCRIPTION_EVENT_TYPES`. Throws on transient failure so the caller can
 * return a 5xx and let Stripe retry; returns normally on terminal/no-op cases.
 */
export async function handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      await applySubscriptionSnapshot(event.data.object as Stripe.Subscription);
      return;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      // Prefer the canonical status; deleted subscriptions are 'canceled'.
      await markSubscriptionStatusBySubscriptionId(
        subscription.id,
        subscription.status || 'canceled',
      );
      return;
    }

    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = readInvoiceSubscriptionId(invoice);
      if (!subscriptionId) {
        // A one-off (non-subscription) invoice — not ours. No-op.
        return;
      }
      // Re-fetch the authoritative subscription so status + period end reflect
      // the post-invoice truth (Stripe has already applied the state change).
      try {
        const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
        // Ensure email mapping still works even if metadata is absent.
        const email = readInvoiceEmail(invoice) ?? (await emailForSubscriptionCustomer(subscription));
        const userId = await resolveUserIdForStripeSubscription(subscription, email);
        if (!userId) {
          console.warn('[subscription-webhook] invoice: could not resolve CARSI user; skipping', {
            subscriptionId,
          });
          return;
        }
        await upsertSubscription({
          userId,
          stripeCustomerId: readCustomerId(subscription),
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          currentPeriodEnd: readCurrentPeriodEnd(subscription),
          cancelAtPeriodEnd: readCancelAtPeriodEnd(subscription),
        });
      } catch (error) {
        console.error('[subscription-webhook] invoice subscription refresh failed:', error);
        throw error; // transient — let the route return 5xx so Stripe retries
      }
      return;
    }

    default:
      // Not a subscription event — caller guards with isSubscriptionEvent().
      return;
  }
}

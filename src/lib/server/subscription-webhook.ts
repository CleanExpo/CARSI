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

import { parseAttributionJourneyId } from '@/lib/analytics/event-attribution';
import { getStripeClient } from '@/lib/api/stripe';
import {
  recordAttributedStage,
  tryRecordAttributedStage,
} from '@/lib/server/event-attribution';
import {
  readCancelAtPeriodEnd,
  readCurrentPeriodEnd,
  readCustomerId,
  readInvoiceSubscriptionId,
} from '@/lib/server/stripe-subscription-map';
import {
  markSubscriptionStatusBySubscriptionId,
  resolveUserIdForStripeSubscription,
  upsertSubscription,
  upsertTerminalSubscriptionStatus,
} from '@/lib/server/subscription-store';
import {
  markTeamSubscriptionStatusBySubscriptionId,
  readSubscriptionSeatQuantity,
  resolveTeamIdForStripeSubscription,
  upsertTeamSubscription,
  upsertTerminalTeamSubscriptionStatus,
} from '@/lib/server/team-subscription-store';
import {
  markOrgSubscriptionStatusBySubscriptionId,
  resolveTeamIdForOrgSubscription,
  updateOrgSubscriptionFromStripe,
} from '@/lib/server/org-subscription-store';
import { trackSubscriptionLifecycleEvent } from '@/lib/server/subscription-analytics';

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

/**
 * Which product a Stripe subscription belongs to, read from its metadata `plan`.
 *  - individual `pro_annual`               → E1 `LmsSubscription`
 *  - Teams tiers (starter|growth|full_…)   → E2 `LmsTeamSubscription`
 *  - `org_monthly`                          → E3 `LmsOrgSubscription`
 * Fails closed to `individual` only for the historical individual metadata; any
 * unknown plan is `unknown` and skipped (never mis-attached to a wrong table).
 */
export type SubscriptionKind = 'individual' | 'team' | 'org' | 'unknown';

const TEAM_PLANS = new Set(['starter', 'growth', 'full_library', 'teams']);

function planFromSubscription(subscription: Stripe.Subscription): string {
  const plan = subscription.metadata?.plan;
  return typeof plan === 'string' && plan.trim() ? plan.trim().toLowerCase() : 'pro_annual';
}

async function trackStarted(subscription: Stripe.Subscription): Promise<void> {
  if (subscription.status !== 'active' && subscription.status !== 'trialing') return;
  const userId = await resolveUserIdForStripeSubscription(
    subscription,
    await emailForSubscriptionCustomer(subscription),
  );
  await tryRecordAttributedStage(
    parseAttributionJourneyId(subscription.metadata?.attribution_journey_id),
    'subscription',
    { transactionId: subscription.id },
  );
  void trackSubscriptionLifecycleEvent({
    event: 'subscription_started',
    plan: planFromSubscription(subscription),
    userId: userId ?? undefined,
    subscriptionId: subscription.id,
  });
}

async function trackLapsed(subscription: Stripe.Subscription): Promise<void> {
  void trackSubscriptionLifecycleEvent({
    event: 'subscription_lapsed',
    plan: planFromSubscription(subscription),
    subscriptionId: subscription.id,
  });
}

export function subscriptionKindFromPlan(plan: string | null | undefined): SubscriptionKind {
  const p = (plan ?? '').trim().toLowerCase();
  if (p === 'pro_annual') return 'individual';
  if (p === 'org_monthly') return 'org';
  if (TEAM_PLANS.has(p) || p.startsWith('teams_')) return 'team';
  return 'unknown';
}

function subscriptionKind(subscription: Stripe.Subscription): SubscriptionKind {
  const plan =
    typeof subscription.metadata?.plan === 'string' ? subscription.metadata.plan : null;
  const kind = subscriptionKindFromPlan(plan);
  // Back-compat: an individual membership created before `plan` metadata was set
  // still carries `carsi_user_id` and no team/org id — treat as individual.
  if (kind === 'unknown' && typeof subscription.metadata?.carsi_user_id === 'string') {
    return 'individual';
  }
  return kind;
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

/** Unix-seconds Stripe `event.created` → Date, or null when absent/invalid. */
function eventCreatedToDate(event: Stripe.Event): Date | null {
  const secs = (event as unknown as { created?: unknown }).created;
  if (typeof secs !== 'number' || !Number.isFinite(secs)) return null;
  const d = new Date(secs * 1000);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Upsert the correct subscription record from a full subscription object,
 * dispatching by the subscription's `plan` metadata (individual / team / org).
 * `eventTimestamp` is the source event's `event.created`; it drives the
 * out-of-order guard in each store so a late (stale) snapshot cannot overwrite
 * newer state. Unknown/unresolvable → log-and-skip (never a wrong grant).
 */
async function applySubscriptionSnapshot(
  subscription: Stripe.Subscription,
  eventTimestamp: Date | null,
): Promise<void> {
  const kind = subscriptionKind(subscription);

  if (kind === 'team') {
    const teamId = await resolveTeamIdForStripeSubscription(subscription);
    if (!teamId) {
      console.warn('[subscription-webhook] team: could not resolve CARSI team; skipping', {
        subscriptionId: subscription.id,
      });
      return;
    }
    const plan =
      typeof subscription.metadata?.plan === 'string'
        ? subscription.metadata.plan.trim().toLowerCase()
        : 'starter';
    await upsertTeamSubscription({
      teamId,
      stripeCustomerId: readCustomerId(subscription),
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      seatLimit: readSubscriptionSeatQuantity(subscription),
      currentPeriodEnd: readCurrentPeriodEnd(subscription),
      cancelAtPeriodEnd: readCancelAtPeriodEnd(subscription),
      plan,
      eventTimestamp,
    });
    return;
  }

  if (kind === 'org') {
    const teamId = await resolveTeamIdForOrgSubscription(subscription);
    if (!teamId) {
      console.warn('[subscription-webhook] org: could not resolve CARSI org; skipping', {
        subscriptionId: subscription.id,
      });
      return;
    }
    const applied = await updateOrgSubscriptionFromStripe({
      teamId,
      stripeCustomerId: readCustomerId(subscription),
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: readCurrentPeriodEnd(subscription),
      cancelAtPeriodEnd: readCancelAtPeriodEnd(subscription),
      eventTimestamp,
    });
    if (!applied) {
      // Row not yet created (checkout success writes it with org name/contact).
      // A pure webhook cannot invent those fields — skip until the row exists.
      console.warn('[subscription-webhook] org: subscription row not yet provisioned; skipping', {
        subscriptionId: subscription.id,
      });
    }
    return;
  }

  if (kind === 'unknown') {
    console.warn('[subscription-webhook] unknown subscription plan; skipping', {
      subscriptionId: subscription.id,
      plan: subscription.metadata?.plan,
    });
    return;
  }

  // Individual membership (E1) — unchanged behaviour.
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
    eventTimestamp,
  });
}

/**
 * Handle one subscription/invoice event. MUST be called only for event types in
 * `SUBSCRIPTION_EVENT_TYPES`. Throws on transient failure so the caller can
 * return a 5xx and let Stripe retry; returns normally on terminal/no-op cases.
 */
export async function handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
  const eventTimestamp = eventCreatedToDate(event);

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await applySubscriptionSnapshot(subscription, eventTimestamp);
      if (event.type === 'customer.subscription.created') {
        await trackStarted(subscription);
      }
      return;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await trackLapsed(subscription);
      // Prefer the canonical status; deleted subscriptions are 'canceled'.
      const status = subscription.status || 'canceled';
      const kind = subscriptionKind(subscription);

      if (kind === 'team') {
        const teamId = await resolveTeamIdForStripeSubscription(subscription);
        if (teamId && eventTimestamp) {
          const plan =
            typeof subscription.metadata?.plan === 'string'
              ? subscription.metadata.plan.trim().toLowerCase()
              : 'starter';
          await upsertTerminalTeamSubscriptionStatus({
            teamId,
            stripeCustomerId: readCustomerId(subscription),
            stripeSubscriptionId: subscription.id,
            status,
            seatLimit: readSubscriptionSeatQuantity(subscription),
            plan,
            eventTimestamp,
          });
        } else {
          await markTeamSubscriptionStatusBySubscriptionId(subscription.id, status);
        }
        return;
      }

      if (kind === 'org') {
        // The org row is provisioned with name/contact; a canceled snapshot only
        // needs the status. The id-keyed write is sticky enough here because the
        // row already exists (provisioned at checkout), and the ordering guard in
        // updateOrgSubscriptionFromStripe handles late-active-after-cancel.
        const teamId = await resolveTeamIdForOrgSubscription(subscription);
        if (teamId) {
          await updateOrgSubscriptionFromStripe({
            teamId,
            stripeCustomerId: readCustomerId(subscription),
            stripeSubscriptionId: subscription.id,
            status,
            currentPeriodEnd: readCurrentPeriodEnd(subscription),
            cancelAtPeriodEnd: readCancelAtPeriodEnd(subscription),
            eventTimestamp,
          });
        } else {
          await markOrgSubscriptionStatusBySubscriptionId(subscription.id, status);
        }
        return;
      }

      if (kind === 'unknown') {
        console.warn('[subscription-webhook] deleted: unknown plan; skipping', {
          subscriptionId: subscription.id,
        });
        return;
      }

      // Individual membership (E1) — unchanged behaviour.
      // Resolve the user so the cancellation is STICKY even when this deleted
      // event arrives before `created` (row absent) — a plain updateMany would
      // no-op and lose the cancel. Falls back to the plain status write only if
      // the user cannot be resolved (no row to create against safely).
      const email = await emailForSubscriptionCustomer(subscription);
      const userId = await resolveUserIdForStripeSubscription(subscription, email);
      if (userId && eventTimestamp) {
        await upsertTerminalSubscriptionStatus({
          userId,
          stripeCustomerId: readCustomerId(subscription),
          stripeSubscriptionId: subscription.id,
          status,
          eventTimestamp,
        });
      } else {
        await markSubscriptionStatusBySubscriptionId(subscription.id, status);
      }
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
      // the post-invoice truth (Stripe has already applied the state change), then
      // dispatch to the correct store by plan (applySubscriptionSnapshot routes).
      try {
        const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
        await applySubscriptionSnapshot(subscription, eventTimestamp);
        if (event.type === 'invoice.paid') {
          await recordAttributedStage(
            parseAttributionJourneyId(subscription.metadata?.attribution_journey_id),
            'subscription',
            {
              revenueCents:
                typeof invoice.amount_paid === 'number' ? invoice.amount_paid : undefined,
              currency: invoice.currency,
              transactionId: invoice.id,
            },
          );
        }
        if (
          event.type === 'invoice.paid' &&
          invoice.billing_reason === 'subscription_cycle'
        ) {
          void trackSubscriptionLifecycleEvent({
            event: 'subscription_renewed',
            plan: planFromSubscription(subscription),
            subscriptionId: subscription.id,
          });
        }
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

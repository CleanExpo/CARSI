/**
 * POST /api/lms/webhooks/stripe
 *
 * Verifies Stripe signatures and completes course enrolment for paid checkout sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { constructWebhookEvent, getStripeClient } from '@/lib/api/stripe';
import { processCcwRoadshowBookingConfirmation } from '@/lib/server/ccw-roadshow-booking-email';
import { getAppOrigin } from '@/lib/server/app-url';
import { notifyCrmEnrollmentCreated } from '@/lib/server/crm-enrollment-notify';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/enrollment-email';
import { ensureGuestUserFromStripeEmail } from '@/lib/server/guest-checkout';
import { sendGa4PurchaseEvent } from '@/lib/server/ga4-measurement-protocol';
import { parseAttributionJourneyId } from '@/lib/analytics/event-attribution';
import {
  persistAttributedRevenueReversal,
  recordAttributedStage,
} from '@/lib/server/event-attribution';
import { sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { prisma } from '@/lib/prisma';
import { captureServerError } from '@/lib/server/sentry';
import {
  claimStripeWebhookEvent,
  markStripeWebhookEventProcessed,
  releaseStripeWebhookEventClaim,
} from '@/lib/server/stripe-webhook-idempotency';
import { fulfillCourseCheckoutForUser } from '@/lib/server/team-course-purchase';
import { shouldRetryWebhookFulfillment } from '@/lib/server/stripe-webhook-policy';
import { resolveStripePaymentReference } from '@/lib/server/stripe-payment-reference';
import {
  revokeEnrollmentsByPaymentReference,
  reactivateDisputeWonEnrollmentsByPaymentReference,
  isDisputeWon,
} from '@/lib/server/stripe-revocation';
import {
  readInvoiceIdFromPaymentIntent,
  readSubscriptionIdFromPaymentIntent,
} from '@/lib/server/stripe-subscription-map';
import { markSubscriptionStatusBySubscriptionId } from '@/lib/server/subscription-store';
import { markTeamSubscriptionStatusBySubscriptionId } from '@/lib/server/team-subscription-store';
import { markOrgSubscriptionStatusBySubscriptionId } from '@/lib/server/org-subscription-store';
import {
  handleSubscriptionEvent,
  isSubscriptionEvent,
} from '@/lib/server/subscription-webhook';

/**
 * WS3 / GP-447 boundary note: this handler only sends the one-off course
 * `purchase` event via GA4 Measurement Protocol. It does NOT add or touch
 * any subscription_* event or subscription webhook handling — that is owned
 * by the parallel feat/gp-441-e1-annual-entitlement branch, which should
 * reuse `sendGa4MeasurementProtocolEvent` (see ga4-measurement-protocol.ts)
 * for its own subscription_started/renewed/lapsed events rather than adding
 * a second Measurement Protocol client.
 */

type StripeWebhookEventDelegate = {
  create(args: { data: { id: string; type: string } }): Promise<unknown>;
  update(args: { where: { id: string }; data: { processedAt: Date } }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  findUnique(args: {
    where: { id: string };
  }): Promise<{ processedAt: Date | null; createdAt: Date } | null>;
};

/**
 * Revoke access when a payment is reversed (refund or chargeback). Handles BOTH
 * revenue paths:
 *
 *  1. One-off course purchases — map the charge's payment intent back to the
 *     checkout session(s) whose id was stored as the enrollment paymentReference
 *     at fulfillment, and revoke those `LmsEnrollment` rows.
 *
 *  2. Individual annual membership (WS1-E1, GP-441) — a subscription invoice
 *     charge has NO checkout-session paymentReference, so path 1 is a no-op for
 *     it. Instead we follow the payment intent → invoice → subscription id and
 *     mark the `LmsSubscription` non-entitling (`canceled`), so a refunded /
 *     charged-back member loses catalogue access. Parity with the one-off lapse
 *     policy: existing progress and issued certificates are RETAINED — only NEW
 *     enrolment entitlement stops (the gate reads `getEntitlements`, which treats
 *     `canceled` as lapsed).
 *
 * Idempotent under the existing StripeWebhookEvent claim: re-delivery re-applies
 * the same terminal states and never double-acts.
 */
async function handleStripeRevocation(event: Stripe.Event): Promise<void> {
  const reason = event.type === 'charge.dispute.created' ? 'disputed' : 'refunded';
  // Stripe `event.created` (seconds) is the authoritative moment this reversal was
  // true — the key for the enrolment out-of-order guard. NB: NOT `dispute.created`,
  // which is identical for a dispute's created and closed events and cannot order
  // them.
  const eventTimestamp = new Date(event.created * 1000);
  let paymentIntentId: string | null = null;
  let reversedRevenueCents = 0;
  let reversalCurrency: string | null = null;
  let revokeEntitlement = true;

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    // Partial refunds reduce net attribution but do not revoke course access.
    reversedRevenueCents = Math.max(0, charge.amount_refunded);
    reversalCurrency = charge.currency;
    revokeEntitlement =
      typeof charge.amount !== 'number' || charge.amount_refunded >= charge.amount;
    paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  } else {
    const dispute = event.data.object as Stripe.Dispute;
    reversedRevenueCents = Math.max(0, dispute.amount);
    reversalCurrency = dispute.currency;
    paymentIntentId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null;
  }
  if (!paymentIntentId) return;

  const stripe = getStripeClient();
  let invoiceTransactionId: string | null = null;

  // Path 2: is this a SUBSCRIPTION charge? Follow payment intent → invoice →
  // subscription id (version-tolerant). If so, revoke the membership. We do this
  // first so a subscription refund always lands even if there is no matching
  // checkout session (there never is for subscription invoices).
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['invoice'],
    });
    invoiceTransactionId = readInvoiceIdFromPaymentIntent(paymentIntent);
    if (invoiceTransactionId) {
      await persistAttributedRevenueReversal(invoiceTransactionId, {
        eventId: event.id,
        eventAt: eventTimestamp,
        reason,
        reversedRevenueCents,
        currency: reversalCurrency,
      });
    }
    const subscriptionId = readSubscriptionIdFromPaymentIntent(paymentIntent);
    if (subscriptionId && revokeEntitlement) {
      // Terminal, non-entitling state. `canceled` is treated as lapsed by every
      // entitlement decision (individual/team/org) → no new catalogue access.
      // The subscription id is unique per table; each mark is a no-op when the id
      // is not in that table, so we fan out to all three revenue paths (E1/E2/E3)
      // without needing to know the plan up front.
      await Promise.all([
        markSubscriptionStatusBySubscriptionId(subscriptionId, 'canceled'),
        markTeamSubscriptionStatusBySubscriptionId(subscriptionId, 'canceled'),
        markOrgSubscriptionStatusBySubscriptionId(subscriptionId, 'canceled'),
      ]);
      console.warn(
        `[stripe webhook] revoked subscription entitlement for subscription=${subscriptionId} (${reason})`,
      );
    }
  } catch (error) {
    // Re-throw so the route returns 5xx and Stripe retries — a subscription
    // refund we failed to apply must NOT be silently dropped (a charged-back
    // member would otherwise keep full access).
    console.error('[stripe webhook] subscription revocation lookup failed:', error);
    throw error;
  }

  // Path 1: one-off course enrolments keyed by the checkout-session reference.
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 10,
  });
  for (const s of sessions.data) {
    const ref = resolveStripePaymentReference(s.id);
    if (!ref) continue;
    // A charge is either an invoice transaction or a one-off checkout. A single
    // Stripe event ID must map to exactly one canonical attribution key.
    if (!invoiceTransactionId) {
      await persistAttributedRevenueReversal(ref, {
        eventId: event.id,
        eventAt: eventTimestamp,
        reason,
        reversedRevenueCents,
        currency: reversalCurrency,
      });
    }
    if (revokeEntitlement) {
      await revokeEnrollmentsByPaymentReference(ref, reason, eventTimestamp);
    }
  }
}

/**
 * Re-grant access when a chargeback is resolved in the merchant's favour.
 *
 * `charge.dispute.closed` with status='won' means the customer's dispute failed —
 * they legitimately paid — so the one-off enrolment that `charge.dispute.created`
 * revoked is restored (ACCESS ONLY; no certificate re-issue, no completion
 * resurrection — see reactivateDisputeWonEnrollmentsByPaymentReference). Any
 * other close status ('lost'/'warning_closed'/…) leaves the enrolment revoked,
 * and a row a later refund downgraded to 'refunded' is never re-granted.
 *
 * SCOPE — one-off course enrolments only (reverses handleStripeRevocation's
 * PATH 1: checkout-session → enrolment). It does NOT re-entitle a subscription
 * membership that path 2 marked `canceled` on dispute.created: a dispute WIN
 * does not change the Stripe subscription status, so no subscription lifecycle
 * event fires to restore it. Subscription re-entitlement on a won dispute is a
 * KNOWN FOLLOW-UP owned by the subscription path (feat/gp-441-e1-annual-
 * entitlement; see the boundary note at the top of this file) — until then, an
 * annual member who wins a dispute stays lapsed until the next invoice.paid.
 *
 * ORDERING — this and handleStripeRevocation are two independently-claimed
 * events with no Stripe delivery-order guarantee. The realistic hazard is a
 * charge.dispute.created that 5xx'd being RETRIED after this won-close is
 * processed; the retried created would otherwise re-revoke the row and lock out a
 * customer who WON their dispute. Closed by the enrolment out-of-order guard: we
 * pass the Stripe `event.created` timestamp so the reactivate stamps every
 * still-active row's `statusEventAt`, and the retried created's own not-stale
 * guard (statusEventAt <= its older timestamp) then skips the revoke. See
 * reactivateDisputeWonEnrollmentsByPaymentReference (mirrors subscription-store).
 *
 * Idempotent under the StripeWebhookEvent claim + the reactivate query (an
 * already-active row matches nothing; `lte`/`lt` guards make replays no-ops).
 */
async function handleDisputeWonRegrant(event: Stripe.Event): Promise<void> {
  const dispute = event.data.object as Stripe.Dispute;
  if (!isDisputeWon(dispute.status)) return;

  const paymentIntentId =
    typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null;
  if (!paymentIntentId) return;

  // Authoritative ordering key — the event time, not dispute.created (identical
  // across a dispute's created/closed events).
  const eventTimestamp = new Date(event.created * 1000);
  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['invoice'],
  });
  const invoiceId = readInvoiceIdFromPaymentIntent(paymentIntent);
  if (invoiceId) {
    await persistAttributedRevenueReversal(invoiceId, {
      eventId: event.id,
      eventAt: eventTimestamp,
      reason: 'dispute_won',
      reversedRevenueCents: 0,
      currency: dispute.currency,
    });
  }
  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 10,
  });
  for (const s of sessions.data) {
    const ref = resolveStripePaymentReference(s.id);
    if (!ref) continue;
    if (!invoiceId) {
      await persistAttributedRevenueReversal(ref, {
        eventId: event.id,
        eventAt: eventTimestamp,
        reason: 'dispute_won',
        reversedRevenueCents: 0,
        currency: dispute.currency,
      });
    }
    await reactivateDisputeWonEnrollmentsByPaymentReference(ref, eventTimestamp);
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const stripeSignature = request.headers.get('stripe-signature') ?? '';

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    return NextResponse.json(
      { error: 'Stripe webhook not configured (STRIPE_WEBHOOK_SECRET).' },
      { status: 503 }
    );
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, stripeSignature);
  } catch (e) {
    console.error('[stripe webhook] signature verification failed:', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  // Event-ID idempotency: claim the event before any side effects so Stripe's
  // at-least-once delivery cannot double-process (duplicate enrolments/emails).
  const stripeWebhookEvents = (prisma as unknown as { stripeWebhookEvent: StripeWebhookEventDelegate })
    .stripeWebhookEvent;
  const claim = await claimStripeWebhookEvent(stripeWebhookEvents, event);
  if (!claim.claimed) {
    console.warn('[stripe webhook] duplicate event, skipped', { id: event.id, type: event.type });
    return NextResponse.json({ received: true, status: 'duplicate' });
  }

  // Mark the claim processed and acknowledge so Stripe stops retrying.
  const acknowledge = async () => {
    await markStripeWebhookEventProcessed(stripeWebhookEvents, event.id);
    return NextResponse.json({ received: true });
  };
  // Release the claim and 5xx so Stripe retries and re-processes the event.
  const retryLater = async (message: string) => {
    await releaseStripeWebhookEventClaim(stripeWebhookEvents, event.id);
    return NextResponse.json({ error: message }, { status: 500 });
  };

  try {
    if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
      await handleStripeRevocation(event);
      return await acknowledge();
    }

    if (event.type === 'charge.dispute.closed') {
      await handleDisputeWonRegrant(event);
      return await acknowledge();
    }

    // WS1-E1 (GP-441): individual annual membership lifecycle. Additive handlers
    // under this same signature-verified, idempotency-claimed route. A transient
    // failure throws and is caught below → 5xx → Stripe retries (single grant
    // guaranteed by the upsert keyed on the unique subscription id).
    if (isSubscriptionEvent(event.type)) {
      await handleSubscriptionEvent(event);
      return await acknowledge();
    }

    if (event.type !== 'checkout.session.completed') {
      return await acknowledge();
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status && session.payment_status !== 'paid') {
      return await acknowledge();
    }

    if (session.metadata?.source === 'carsi-ccw-roadshow') {
      try {
        await processCcwRoadshowBookingConfirmation(session, {
          appOrigin: getAppOrigin(),
        });
      } catch {
        // Errors logged in sendCcwRoadshowBookingConfirmationEmail
      }
      return await acknowledge();
    }

    const slug = session.metadata?.course_slug?.trim().toLowerCase();
    if (!slug) {
      return await acknowledge();
    }

    const studentIdMeta = session.metadata?.student_id?.trim();
    const email =
      (session.customer_email ?? session.customer_details?.email)?.trim().toLowerCase() ?? '';

    let claims = studentIdMeta ? await sessionClaimsForUserId(studentIdMeta) : null;
    if (!claims && email) {
      const user = await prisma.lmsUser.findUnique({ where: { email } });
      if (user) claims = await sessionClaimsForUserId(user.id);
    }
    if (!claims && email && session.metadata?.guest_checkout === 'true') {
      claims = await ensureGuestUserFromStripeEmail(email);
    }

    if (!claims) {
      console.warn('[stripe webhook] checkout.session.completed: could not resolve learner', {
        slug,
        hasStudentMeta: Boolean(studentIdMeta),
        hasEmail: Boolean(email),
      });
      return await acknowledge();
    }

    const purchaseMode = session.metadata?.purchase_mode === 'team' ? 'team' : 'self';
    const teamSeatRaw = session.metadata?.team_seat_count;
    const teamSeatCount = teamSeatRaw ? Number.parseInt(teamSeatRaw, 10) : undefined;

    const ref = resolveStripePaymentReference(session.id);
    if (!ref) {
      console.error(
        '[stripe webhook] checkout.session.completed missing a session id — skipping fulfillment to avoid non-idempotent provisioning',
      );
      return await acknowledge();
    }

    try {
      const origin = getAppOrigin();
      const fulfilled = await fulfillCourseCheckoutForUser({
        claims,
        courseSlug: slug,
        paymentReference: ref,
        purchaseMode,
        teamSeatCount: Number.isFinite(teamSeatCount) ? teamSeatCount : undefined,
      });

      await recordAttributedStage(
        parseAttributionJourneyId(session.metadata?.attribution_journey_id),
        'purchase',
        {
          courseSlug: slug,
          revenueCents: typeof session.amount_total === 'number' ? session.amount_total : undefined,
          currency: session.currency,
          transactionId: ref,
        },
      );

      if (!fulfilled.alreadyEnrolled && fulfilled.enrollmentId && fulfilled.courseId) {
        void sendEnrollmentWelcomeEmail({
          studentId: claims.sub,
          courseSlug: slug,
          appOrigin: origin,
        }).catch((e) => console.error('[stripe webhook] email', e));
        notifyCrmEnrollmentCreated({
          enrollmentId: fulfilled.enrollmentId,
          studentId: claims.sub,
          courseId: fulfilled.courseId,
        });

        // WS3 / GP-447: server-side `purchase` event (GA4 Measurement Protocol).
        // Never blocks fulfilment — the utility itself no-ops/swallows errors.
        const valueAud =
          typeof session.amount_total === 'number' ? session.amount_total / 100 : 0;
        void sendGa4PurchaseEvent({
          clientId: ref,
          userId: claims.sub,
          courseSlug: slug,
          valueAud,
          transactionId: ref,
        }).catch((e) => console.error('[stripe webhook] ga4 purchase event', e));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (shouldRetryWebhookFulfillment(msg)) {
        // Transient/unexpected failure — return 5xx so Stripe retries instead of
        // silently dropping a paid enrolment.
        console.error('[stripe webhook] enrolment error (returning 500 so Stripe retries):', e);
        void captureServerError(e, { route: '/api/lms/webhooks/stripe', tags: { slug } });
        return await retryLater('Enrolment failed; Stripe will retry.');
      }
      // Terminal business condition — acknowledge so Stripe does not retry.
      console.warn('[stripe webhook] team purchase blocked: user on another team');
    }

    return await acknowledge();
  } catch (e) {
    // Unexpected failure around fulfillment — release the claim so Stripe's retry
    // can re-process this event instead of it being skipped as a duplicate.
    console.error('[stripe webhook] unexpected error (returning 500 so Stripe retries):', e);
    void captureServerError(e, { route: '/api/lms/webhooks/stripe', tags: { eventType: event.type } });
    return await retryLater('Stripe webhook processing failed.');
  }
}

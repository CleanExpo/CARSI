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
import { sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { prisma } from '@/lib/prisma';
import {
  claimStripeWebhookEvent,
  markStripeWebhookEventProcessed,
  releaseStripeWebhookEventClaim,
} from '@/lib/server/stripe-webhook-idempotency';
import { fulfillCourseCheckoutForUser } from '@/lib/server/team-course-purchase';
import { shouldRetryWebhookFulfillment } from '@/lib/server/stripe-webhook-policy';
import { resolveStripePaymentReference } from '@/lib/server/stripe-payment-reference';
import { revokeEnrollmentsByPaymentReference } from '@/lib/server/stripe-revocation';
import { readSubscriptionIdFromPaymentIntent } from '@/lib/server/stripe-subscription-map';
import { markSubscriptionStatusBySubscriptionId } from '@/lib/server/subscription-store';
import {
  handleSubscriptionEvent,
  isSubscriptionEvent,
} from '@/lib/server/subscription-webhook';

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
  let paymentIntentId: string | null = null;

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge;
    // Only a FULL refund revokes access; ignore partial refunds.
    if (typeof charge.amount === 'number' && charge.amount_refunded < charge.amount) return;
    paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
  } else {
    const dispute = event.data.object as Stripe.Dispute;
    paymentIntentId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : null;
  }
  if (!paymentIntentId) return;

  const stripe = getStripeClient();

  // Path 2: is this a SUBSCRIPTION charge? Follow payment intent → invoice →
  // subscription id (version-tolerant). If so, revoke the membership. We do this
  // first so a subscription refund always lands even if there is no matching
  // checkout session (there never is for subscription invoices).
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['invoice'],
    });
    const subscriptionId = readSubscriptionIdFromPaymentIntent(paymentIntent);
    if (subscriptionId) {
      // Terminal, non-entitling state. `canceled` is treated as lapsed by
      // getEntitlements → hasActiveMembership:false → no new catalogue access.
      await markSubscriptionStatusBySubscriptionId(subscriptionId, 'canceled');
      console.warn(
        `[stripe webhook] revoked membership for subscription=${subscriptionId} (${reason})`,
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
    if (ref) await revokeEnrollmentsByPaymentReference(ref, reason);
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
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (shouldRetryWebhookFulfillment(msg)) {
        // Transient/unexpected failure — return 5xx so Stripe retries instead of
        // silently dropping a paid enrolment.
        console.error('[stripe webhook] enrolment error (returning 500 so Stripe retries):', e);
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
    return await retryLater('Stripe webhook processing failed.');
  }
}

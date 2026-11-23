import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/api/stripe';
import {
  carsiCoachingMonthlyPath,
  carsiCoachingMonthlyPriceCents,
  carsiCoachingProductName,
  formatCoachingAudFromCents,
} from '@/lib/marketing/carsi-coaching-monthly';
import { prisma } from '@/lib/prisma';
import { getAppOrigin } from '@/lib/server/app-url';
import { CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE } from '@/lib/server/carsi-coaching-monthly-checkout';
import { sendCarsiCoachingMonthlyFounderNotificationEmail } from '@/lib/server/carsi-coaching-monthly-notify';
import { upsertCoachingMonthlySubscription } from '@/lib/server/carsi-coaching-subscription-store';
import { sendEmail } from '@/lib/server/email';
import { renderCarsiCoachingMonthlyWelcomeEmail } from '@/lib/server/email-templates';
import {
  readCancelAtPeriodEnd,
  readCurrentPeriodEnd,
  readCustomerId,
} from '@/lib/server/stripe-subscription-map';

const CONFIRMATION_SENT_META = 'coaching_monthly_emails_sent';

/**
 * GP-672: each email is sent at most once per checkout session.
 *
 * The webhook and the success page both run fulfilment, at the same time or later, and the
 * Stripe metadata flag can fail to write after the mail has gone. So before sending, each email
 * takes a delivery record in `stripe_webhook_events` (the Stripe idempotency ledger) under a
 * namespaced key. The primary key decides the race: whoever inserts first sends; everyone else
 * skips. Stripe event ids start with `evt_`, so these keys cannot collide with event claims.
 *
 * Deliberately not `claimStripeWebhookEvent`: that helper reclaims an unfinished row after two
 * minutes, which would bring the duplicate back. A record here is never reclaimed.
 *
 * A record is released only when the send certainly never left (`not_configured`). A timeout,
 * a provider error or a thrown send may have delivered the mail, so the record stays and the
 * email is not retried; the failure is logged for a person to follow up.
 */
const EMAIL_DELIVERY_RECORD_TYPE = 'carsi_coaching_monthly_email';

type CoachingMonthlyEmailKind = 'welcome' | 'coach_notice';

function emailDeliveryRecordId(sessionId: string, kind: CoachingMonthlyEmailKind): string {
  return `carsi-coaching-monthly-email:${sessionId}:${kind}`;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === code);
}

/** True when this call owns the send. Any database error other than a key clash propagates. */
async function claimEmailDelivery(
  sessionId: string,
  kind: CoachingMonthlyEmailKind
): Promise<boolean> {
  try {
    await prisma.stripeWebhookEvent.create({
      data: { id: emailDeliveryRecordId(sessionId, kind), type: EMAIL_DELIVERY_RECORD_TYPE },
    });
    return true;
  } catch (err) {
    if (hasPrismaCode(err, 'P2002')) return false;
    throw err;
  }
}

async function settleEmailDelivery(
  sessionId: string,
  kind: CoachingMonthlyEmailKind,
  result: { sent: boolean; reason?: string } | 'threw'
): Promise<void> {
  const id = emailDeliveryRecordId(sessionId, kind);
  try {
    if (result !== 'threw' && result.sent) {
      await prisma.stripeWebhookEvent.update({ where: { id }, data: { processedAt: new Date() } });
    } else if (result !== 'threw' && result.reason === 'not_configured') {
      await prisma.stripeWebhookEvent.delete({ where: { id } });
    } else {
      console.error(
        `[coaching-monthly] ${kind} email for ${sessionId} may not have been delivered; not retried to avoid a duplicate`
      );
    }
  } catch (err) {
    // The record still blocks a second send, which is the safe direction.
    console.error(`[coaching-monthly] could not settle ${kind} delivery record:`, err);
  }
}

/**
 * What happened to one email on this run.
 * - `sent`: sent on this run; record marked processed.
 * - `already_claimed`: a delivery record already existed (sent, in flight, or an uncertain
 *   failure). The email is NOT owed; never resend.
 * - `not_configured`: mail was not configured, nothing went out, record released.
 * - `failed`: the send failed in a way that may still have delivered (timeout, provider error,
 *   throw). Record kept, not retried (founder rule 21/11/2026: at most once).
 * A record that cannot be written at all throws (see `claimEmailDelivery`), so nothing is sent.
 */
export type CoachingMonthlyEmailDelivery = 'sent' | 'already_claimed' | 'not_configured' | 'failed';

function deliveryStatus(
  claimed: boolean,
  outcome: { sent: boolean; reason?: string } | 'threw'
): CoachingMonthlyEmailDelivery {
  if (!claimed) return 'already_claimed';
  if (outcome === 'threw') return 'failed';
  if (outcome.sent) return 'sent';
  return outcome.reason === 'not_configured' ? 'not_configured' : 'failed';
}

export function isCarsiCoachingMonthlyCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.source === CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE;
}

export type CarsiCoachingMonthlyFulfillmentResult = {
  fulfilled: boolean;
  skipped?: string;
  /** Sent on this run (not "sent at some point"); see the `*Delivery` fields for why not. */
  customerEmailSent?: boolean;
  founderEmailSent?: boolean;
  customerEmailDelivery?: CoachingMonthlyEmailDelivery;
  founderEmailDelivery?: CoachingMonthlyEmailDelivery;
};

function resolveAmountLabel(session: Stripe.Checkout.Session): string {
  if (session.amount_total != null) {
    return formatCoachingAudFromCents(session.amount_total);
  }
  return formatCoachingAudFromCents(carsiCoachingMonthlyPriceCents);
}

function subscriptionIdFromSession(session: Stripe.Checkout.Session): string | undefined {
  const raw = session.subscription;
  if (!raw) return undefined;
  return typeof raw === 'string' ? raw : raw.id;
}

/** Writes the coaching subscription row when checkout completes (webhook may lag or be absent locally). */
export async function syncCoachingMonthlySubscriptionFromCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (!isCarsiCoachingMonthlyCheckoutSession(session)) return;

  const userId =
    session.metadata?.carsi_user_id?.trim() ?? session.client_reference_id?.trim() ?? '';
  const subscriptionId = subscriptionIdFromSession(session);
  if (!userId || !subscriptionId) return;

  if (!process.env.STRIPE_SECRET_KEY?.trim()) return;

  try {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await upsertCoachingMonthlySubscription({
      userId,
      stripeCustomerId: readCustomerId(subscription),
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: readCurrentPeriodEnd(subscription),
      cancelAtPeriodEnd: readCancelAtPeriodEnd(subscription),
      eventTimestamp: new Date(),
    });
  } catch (err) {
    console.error('[coaching-monthly] subscription sync from checkout failed:', err);
  }
}

export async function processCarsiCoachingMonthlyCheckoutCompleted(
  session: Stripe.Checkout.Session,
  options?: { appOrigin?: string }
): Promise<CarsiCoachingMonthlyFulfillmentResult> {
  if (!isCarsiCoachingMonthlyCheckoutSession(session)) {
    return { fulfilled: false, skipped: 'not_coaching_monthly' };
  }

  const paid =
    session.payment_status === 'paid' ||
    (session.status === 'complete' && session.mode === 'subscription');
  if (!paid) {
    return { fulfilled: false, skipped: 'not_paid' };
  }

  await syncCoachingMonthlySubscriptionFromCheckoutSession(session);

  const email = (
    session.customer_details?.email ??
    session.customer_email ??
    session.metadata?.contact_email ??
    ''
  )
    .trim()
    .toLowerCase();
  if (!email) {
    return { fulfilled: false, skipped: 'no_email' };
  }

  const carsiUserId =
    session.metadata?.carsi_user_id?.trim() ?? session.client_reference_id?.trim() ?? '';
  let contactName =
    session.metadata?.contact_name?.trim() || session.customer_details?.name?.trim() || '';

  if (!contactName && carsiUserId) {
    const user = await prisma.lmsUser.findUnique({
      where: { id: carsiUserId },
      select: { fullName: true },
    });
    contactName = user?.fullName?.trim() ?? '';
  }
  if (!contactName) contactName = email.split('@')[0] ?? 'Customer';

  const contactPhone =
    session.customer_details?.phone?.trim() || session.metadata?.contact_phone?.trim() || undefined;

  const alreadySent = session.metadata?.[CONFIRMATION_SENT_META] === 'true';
  if (alreadySent) {
    return {
      fulfilled: true,
      skipped: 'already_emailed',
      customerEmailSent: true,
      founderEmailSent: true,
    };
  }

  const appOrigin = (options?.appOrigin ?? getAppOrigin()).replace(/\/$/, '');
  const amountLabel = resolveAmountLabel(session);
  const subscriptionId = subscriptionIdFromSession(session);

  const dashboardUrl = `${appOrigin}/dashboard/student`;
  const coachingPageUrl = `${appOrigin}${carsiCoachingMonthlyPath}`;

  const { html, text } = renderCarsiCoachingMonthlyWelcomeEmail({
    appOrigin,
    name: contactName,
    amountLabel,
    dashboardUrl,
    coachingPageUrl,
  });

  const welcomeClaimed = await claimEmailDelivery(session.id, 'welcome');
  let welcomeOutcome: { sent: boolean; reason?: string } | 'threw' = 'threw';
  if (welcomeClaimed) {
    try {
      welcomeOutcome = await sendEmail({
        to: email,
        subject: `Welcome to ${carsiCoachingProductName}`,
        html,
        text,
      });
    } finally {
      await settleEmailDelivery(session.id, 'welcome', welcomeOutcome);
    }
  }
  const customerEmailDelivery = deliveryStatus(welcomeClaimed, welcomeOutcome);

  const noticeClaimed = await claimEmailDelivery(session.id, 'coach_notice');
  let noticeOutcome: { sent: boolean; reason?: string } | 'threw' = 'threw';
  if (noticeClaimed) {
    try {
      noticeOutcome = await sendCarsiCoachingMonthlyFounderNotificationEmail({
        appOrigin,
        contactName,
        contactEmail: email,
        contactPhone,
        carsiUserId: carsiUserId || '—',
        amountLabel,
        stripeCheckoutSessionId: session.id,
        stripeSubscriptionId: subscriptionId,
      });
    } catch (err) {
      console.error('[coaching-monthly] founder notification failed:', err);
    }
    await settleEmailDelivery(session.id, 'coach_notice', noticeOutcome);
  }
  const founderEmailDelivery = deliveryStatus(noticeClaimed, noticeOutcome);

  // Fast-path flag only when neither email is still owed. If one was released as
  // `not_configured`, setting the flag would skip it on every later run.
  const neitherOwed = [customerEmailDelivery, founderEmailDelivery].every(
    (d) => d === 'sent' || d === 'already_claimed'
  );
  if (neitherOwed) {
    try {
      const stripe = getStripeClient();
      await stripe.checkout.sessions.update(session.id, {
        metadata: {
          ...(session.metadata ?? {}),
          [CONFIRMATION_SENT_META]: 'true',
        },
      });
    } catch {
      // Non-fatal: the flag is only a fast path. The delivery records above stop a repeat send.
    }
  }

  return {
    fulfilled: true,
    customerEmailSent: customerEmailDelivery === 'sent',
    founderEmailSent: founderEmailDelivery === 'sent',
    customerEmailDelivery,
    founderEmailDelivery,
  };
}

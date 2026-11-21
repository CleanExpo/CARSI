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
 * GP-672: per-email delivery record, kept in the existing `stripe_webhook_events`
 * table (primary key = unique claim) so no migration is needed. Rows of this type
 * are not Stripe events; counts of that table should filter by `type`.
 */
export const COACHING_MONTHLY_EMAIL_RECORD_TYPE = 'carsi_coaching_monthly_email';

type CoachingMonthlyEmailKind = 'welcome' | 'coach_notice';

/**
 * - `sent`: sent on this run.
 * - `already_claimed`: a delivery record already exists (sent, in flight, or an
 *   uncertain failure). The email is NOT owed; never resend.
 * - `not_configured`: mail was not configured, nothing was sent, record released.
 * - `failed`: the send failed in a way that may still have delivered (timeout,
 *   provider error, throw). Record kept, not retried (founder rule: at most once).
 * - `unavailable`: the delivery record could not be written, so nothing was sent.
 */
export type CoachingMonthlyEmailDelivery =
  'sent' | 'already_claimed' | 'not_configured' | 'failed' | 'unavailable';

type SendResult = { sent: boolean; reason?: string };

function deliveryRecordId(sessionId: string, kind: CoachingMonthlyEmailKind): string {
  return `coaching_monthly_email:${sessionId}:${kind}`;
}

function prismaErrorCode(err: unknown): string | undefined {
  return err && typeof err === 'object' && 'code' in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

/**
 * Sends one email at most once per checkout session: the delivery record is
 * written BEFORE sending, and whoever inserts it first is the only sender.
 */
async function deliverOnce(
  sessionId: string,
  kind: CoachingMonthlyEmailKind,
  send: () => Promise<SendResult>
): Promise<CoachingMonthlyEmailDelivery> {
  const id = deliveryRecordId(sessionId, kind);
  try {
    await prisma.stripeWebhookEvent.create({
      data: { id, type: COACHING_MONTHLY_EMAIL_RECORD_TYPE },
    });
  } catch (err) {
    if (prismaErrorCode(err) === 'P2002') return 'already_claimed';
    console.error(
      `[coaching-monthly] ${kind} delivery record unavailable; not sent (session ${sessionId}):`,
      prismaErrorCode(err) ?? 'unknown'
    );
    return 'unavailable';
  }

  let result: SendResult;
  try {
    result = await send();
  } catch (err) {
    console.error(
      `[coaching-monthly] ${kind} send threw; record kept, not retried (session ${sessionId}):`,
      err instanceof Error ? err.message : 'unknown'
    );
    return 'failed';
  }

  if (result.sent) {
    try {
      await prisma.stripeWebhookEvent.update({ where: { id }, data: { processedAt: new Date() } });
    } catch {
      // Record still exists (processed_at empty), so the email is still never resent.
    }
    return 'sent';
  }

  if (result.reason === 'not_configured') {
    // Definitely nothing went out: release the record so a later run can send.
    try {
      await prisma.stripeWebhookEvent.delete({ where: { id } });
    } catch {
      // A kept record only means this email is not retried.
    }
    return 'not_configured';
  }

  console.warn(
    `[coaching-monthly] ${kind} send failed (${result.reason ?? 'unknown'}); record kept, not retried (session ${sessionId})`
  );
  return 'failed';
}

export function isCarsiCoachingMonthlyCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.source === CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE;
}

export type CarsiCoachingMonthlyFulfillmentResult = {
  fulfilled: boolean;
  skipped?: string;
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

  const customerEmailDelivery = await deliverOnce(session.id, 'welcome', () =>
    sendEmail({
      to: email,
      subject: `Welcome to ${carsiCoachingProductName}`,
      html,
      text,
    })
  );

  const founderEmailDelivery = await deliverOnce(session.id, 'coach_notice', () =>
    sendCarsiCoachingMonthlyFounderNotificationEmail({
      appOrigin,
      contactName,
      contactEmail: email,
      contactPhone,
      carsiUserId: carsiUserId || '—',
      amountLabel,
      stripeCheckoutSessionId: session.id,
      stripeSubscriptionId: subscriptionId,
    })
  );

  const bothHandled = [customerEmailDelivery, founderEmailDelivery].every(
    (d) => d === 'sent' || d === 'already_claimed'
  );
  if (bothHandled) {
    // Fast path only: the delivery records above are what prevent repeats (GP-672).
    try {
      const stripe = getStripeClient();
      await stripe.checkout.sessions.update(session.id, {
        metadata: {
          ...(session.metadata ?? {}),
          [CONFIRMATION_SENT_META]: 'true',
        },
      });
    } catch {
      // non-fatal — the delivery records still stop a repeat send
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

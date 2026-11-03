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
import {
  coachNameForCopy,
  getCoachForMember,
  getCoachRoutingForMember,
} from '@/lib/server/carsi-coaching-coaches';
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

/** Member welcome sent. Sessions marked by earlier code carry only this key. */
const CONFIRMATION_SENT_META = 'coaching_monthly_emails_sent';
/** Coach notice sent ('true') or still owed ('false'), recorded separately so a failed coach
 * notice is retried on the next delivery without re-sending the member welcome (GP-632). */
const COACH_NOTICE_SENT_META = 'coaching_monthly_coach_notice_sent';

export function isCarsiCoachingMonthlyCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.source === CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE;
}

/**
 * The session's metadata as Stripe holds it now. A webhook retry replays the original event,
 * whose session copy predates the sent flags written after the first attempt, so the flags
 * are read from Stripe. If Stripe cannot be reached the event's copy is used.
 */
async function currentSessionMetadata(
  session: Stripe.Checkout.Session
): Promise<Record<string, string>> {
  const given = session.metadata ?? {};
  try {
    const fresh = await getStripeClient().checkout.sessions.retrieve(session.id);
    return { ...given, ...(fresh.metadata ?? {}) };
  } catch (err) {
    console.error('[coaching-monthly] could not read current session metadata:', err);
    return given;
  }
}

export type CarsiCoachingMonthlyFulfillmentResult = {
  fulfilled: boolean;
  skipped?: string;
  customerEmailSent?: boolean;
  founderEmailSent?: boolean;
};

function resolveAmountLabel(session: Stripe.Checkout.Session): string {
  if (session.amount_total != null) {
    const currency = session.currency?.trim().toLowerCase() || 'aud';
    if (currency === 'aud') return formatCoachingAudFromCents(session.amount_total);
    // Partner chapters bill in their own currency. Intl knows each currency's minor unit,
    // so a zero-decimal amount is not divided by 100.
    try {
      const format = new Intl.NumberFormat('en-AU', { style: 'currency', currency });
      const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
      return format.format(session.amount_total / 10 ** digits);
    } catch {
      return `${currency.toUpperCase()} ${session.amount_total} (minor units)`;
    }
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

  const metadata = await currentSessionMetadata(session);
  const customerDone = metadata[CONFIRMATION_SENT_META] === 'true';
  const coachFlag = metadata[COACH_NOTICE_SENT_META];
  // No coach flag on a session the welcome was already sent for = marked by earlier code,
  // which sent both emails together; treat the notice as sent so nothing goes out twice.
  const coachDone = coachFlag === 'true' || (customerDone && coachFlag === undefined);
  if (customerDone && coachDone) {
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

  const coach = carsiUserId ? await getCoachForMember(carsiUserId) : null;

  const { html, text } = renderCarsiCoachingMonthlyWelcomeEmail({
    appOrigin,
    name: contactName,
    amountLabel,
    dashboardUrl,
    coachingPageUrl,
    coachName: coachNameForCopy(coach),
  });

  const customerResult = customerDone
    ? { sent: false }
    : await sendEmail({
        to: email,
        subject: `Welcome to ${carsiCoachingProductName}`,
        html,
        text,
      });

  let founderResult: { sent: boolean } = { sent: false };
  if (!coachDone) {
    try {
      // The new member's contact details go to their own coach; no coach keeps the founder inbox.
      const coachInbox = carsiUserId
        ? (await getCoachRoutingForMember(carsiUserId)).recipients
        : undefined;
      founderResult = await sendCarsiCoachingMonthlyFounderNotificationEmail({
        to: coachInbox,
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
  }

  if (customerResult.sent || founderResult.sent) {
    try {
      const stripe = getStripeClient();
      await stripe.checkout.sessions.update(session.id, {
        metadata: {
          ...metadata,
          [CONFIRMATION_SENT_META]: customerDone || customerResult.sent ? 'true' : 'false',
          [COACH_NOTICE_SENT_META]: coachDone || founderResult.sent ? 'true' : 'false',
        },
      });
    } catch {
      // non-fatal — success-page retry may duplicate; Stripe metadata reduces duplicates
    }
  }

  if (!coachDone && !founderResult.sent) {
    console.error(
      '[coaching-monthly] coach notice not sent; it will be retried on the next delivery',
      {
        session: session.id,
      }
    );
  }

  return {
    fulfilled: true,
    customerEmailSent: customerDone || customerResult.sent,
    founderEmailSent: coachDone || founderResult.sent,
  };
}

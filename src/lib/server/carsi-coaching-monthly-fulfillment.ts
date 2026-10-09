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
import { sendEmail } from '@/lib/server/email';
import { renderCarsiCoachingMonthlyWelcomeEmail } from '@/lib/server/email-templates';

const CONFIRMATION_SENT_META = 'coaching_monthly_emails_sent';

export function isCarsiCoachingMonthlyCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.source === CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE;
}

export type CarsiCoachingMonthlyFulfillmentResult = {
  fulfilled: boolean;
  skipped?: string;
  customerEmailSent?: boolean;
  founderEmailSent?: boolean;
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

  const customerResult = await sendEmail({
    to: email,
    subject: `Welcome to ${carsiCoachingProductName}`,
    html,
    text,
  });

  let founderResult: { sent: boolean } = { sent: false };
  try {
    founderResult = await sendCarsiCoachingMonthlyFounderNotificationEmail({
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

  if (customerResult.sent || founderResult.sent) {
    try {
      const stripe = getStripeClient();
      await stripe.checkout.sessions.update(session.id, {
        metadata: {
          ...(session.metadata ?? {}),
          [CONFIRMATION_SENT_META]: 'true',
        },
      });
    } catch {
      // non-fatal — success-page retry may duplicate; Stripe metadata reduces duplicates
    }
  }

  return {
    fulfilled: true,
    customerEmailSent: customerResult.sent,
    founderEmailSent: founderResult.sent,
  };
}

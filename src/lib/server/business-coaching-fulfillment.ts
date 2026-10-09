import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/api/stripe';
import {
    formatAudFromCents,
    getBusinessCoachingPackage
} from '@/lib/marketing/business-coaching';
import { getAppOrigin } from '@/lib/server/app-url';
import {
    BUSINESS_COACHING_CHECKOUT_SOURCE,
    parseBusinessCoachingSessionFromMetadata,
} from '@/lib/server/business-coaching-checkout';
import { sendBusinessCoachingOrganizerNotificationEmail } from '@/lib/server/business-coaching-notify';
import { fulfillBusinessCoachingRegistration } from '@/lib/server/business-coaching-registry';
import { sendBusinessCoachingConfirmationEmail } from '@/lib/server/transactional-email';

const CONFIRMATION_SENT_META = 'confirmation_email_sent';

export function isBusinessCoachingCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.source === BUSINESS_COACHING_CHECKOUT_SOURCE;
}

export type BusinessCoachingFulfillmentResult = {
  fulfilled: boolean;
  skipped?: string;
  registrationId?: string;
  emailSent?: boolean;
};

export async function processBusinessCoachingCheckoutCompleted(
  session: Stripe.Checkout.Session,
  options?: { appOrigin?: string },
): Promise<BusinessCoachingFulfillmentResult> {
  if (!isBusinessCoachingCheckoutSession(session)) {
    return { fulfilled: false, skipped: 'not_business_coaching' };
  }

  if (session.payment_status && session.payment_status !== 'paid') {
    return { fulfilled: false, skipped: 'not_paid' };
  }

  const coachingSession = parseBusinessCoachingSessionFromMetadata(session.metadata?.session_slug);
  const pkg = getBusinessCoachingPackage(session.metadata?.package_id);
  if (!coachingSession || !pkg) {
    return { fulfilled: false, skipped: 'invalid_metadata' };
  }

  const email = (
    session.customer_details?.email ??
    session.customer_email ??
    ''
  )
    .trim()
    .toLowerCase();
  if (!email) {
    return { fulfilled: false, skipped: 'no_email' };
  }

  const attendees: string[] = [];
  const a1 = session.metadata?.attendee_1?.trim();
  const a2 = session.metadata?.attendee_2?.trim();
  if (a1) attendees.push(a1);
  if (a2) attendees.push(a2);
  if (attendees.length === 0) attendees.push('Guest');

  const result = await fulfillBusinessCoachingRegistration({
    session: coachingSession,
    stripeSessionId: session.id,
    packageId: pkg.id,
    companyName: session.metadata?.company_name?.trim() ?? '',
    contactEmail: email,
    contactPhone:
      session.metadata?.contact_phone?.trim() ??
      session.customer_details?.phone?.trim() ??
      '',
    attendees: attendees.map((fullName) => ({ fullName })),
    amountTotalCents: session.amount_total ?? null,
  });

  const alreadyEmailed = session.metadata?.[CONFIRMATION_SENT_META] === 'true';
  let emailSent = false;

  if (!alreadyEmailed) {
    const appOrigin = (options?.appOrigin ?? getAppOrigin()).replace(/\/$/, '');
    const amountLabel =
      session.amount_total != null
        ? formatAudFromCents(session.amount_total)
        : formatAudFromCents(pkg.attendeeCount * 2200);

    const sendResult = await sendBusinessCoachingConfirmationEmail({
      to: email,
      attendeeName: attendees[0] ?? 'there',
      session: coachingSession,
      packageLabel: pkg.label,
      seatCount: result.seatCount,
      amountLabel,
      registrationStatus: result.status,
      businessName: session.metadata?.company_name?.trim() || undefined,
      phone: session.metadata?.contact_phone?.trim() || undefined,
      discussionTopic: session.metadata?.discussion_topic?.trim() || undefined,
      appOrigin,
    });
    emailSent = sendResult.sent;

    if (sendResult.sent) {
      try {
        const stripe = getStripeClient();
        await stripe.checkout.sessions.update(session.id, {
          metadata: {
            ...(session.metadata ?? {}),
            [CONFIRMATION_SENT_META]: 'true',
          },
        });
      } catch {
        // non-fatal
      }
    }

    try {
      await sendBusinessCoachingOrganizerNotificationEmail({
        session: coachingSession,
        registrationStatus: result.status,
        seatCount: result.seatCount,
        packageLabel: pkg.label,
        companyName: session.metadata?.company_name?.trim() || undefined,
        contactEmail: email,
        contactPhone: session.metadata?.contact_phone?.trim() || undefined,
        attendees,
        discussionTopic: session.metadata?.discussion_topic?.trim() || undefined,
        amountLabel,
        appOrigin,
      });
    } catch (err) {
      console.error('[business-coaching] organizer notification failed (non-fatal):', err);
    }
  }

  return {
    fulfilled: true,
    registrationId: result.registrationId,
    emailSent,
  };
}

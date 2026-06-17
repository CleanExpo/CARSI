import type Stripe from 'stripe';

import { getStripeClient } from '@/lib/api/stripe';
import { getAppOrigin } from '@/lib/server/app-url';
import {
  formatAudFromCents,
  getCcwRoadshowEvent,
  getCcwRoadshowTicketPackage,
} from '@/lib/marketing/ccw-roadshow';
import { sendCcwRoadshowBookingConfirmationEmail } from '@/lib/server/transactional-email';

export const CCW_ROADSHOW_CHECKOUT_SOURCE = 'carsi-ccw-roadshow';
const CONFIRMATION_SENT_META = 'confirmation_email_sent';

export type CcwRoadshowConfirmationResult = {
  sent: boolean;
  skipped?: string;
  reason?: string;
  messageId?: string;
};

export function isCcwRoadshowCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.source === CCW_ROADSHOW_CHECKOUT_SOURCE;
}

/**
 * Sends the attendee booking confirmation email once per Stripe Checkout session.
 * Idempotent via session metadata `confirmation_email_sent=true`.
 */
export async function processCcwRoadshowBookingConfirmation(
  session: Stripe.Checkout.Session,
  options?: { appOrigin?: string },
): Promise<CcwRoadshowConfirmationResult> {
  const sessionId = session.id;

  if (!isCcwRoadshowCheckoutSession(session)) {
    return { sent: false, skipped: 'not_roadshow' };
  }

  if (session.payment_status && session.payment_status !== 'paid') {
    return { sent: false, skipped: 'not_paid' };
  }

  if (session.metadata?.[CONFIRMATION_SENT_META] === 'true') {
    return { sent: false, skipped: 'already_sent' };
  }

  const email = (
    session.customer_details?.email ??
    session.customer_email ??
    session.metadata?.email ??
    ''
  )
    .trim()
    .toLowerCase();

  if (!email) {
    return { sent: false, skipped: 'no_email' };
  }

  const event = getCcwRoadshowEvent(session.metadata?.event_slug);
  const ticketPackage = getCcwRoadshowTicketPackage(session.metadata?.ticket_package);

  if (!event || !ticketPackage) {
    return { sent: false, skipped: 'invalid_metadata' };
  }

  const attendeeName = session.metadata?.attendee_name?.trim() || 'there';
  const businessName = session.metadata?.business_name?.trim() || undefined;
  const phone = session.metadata?.phone?.trim() || session.customer_details?.phone?.trim() || undefined;
  const amountLabel =
    session.amount_total != null
      ? formatAudFromCents(session.amount_total)
      : formatAudFromCents(ticketPackage.unitAmountCents);
  const appOrigin = (options?.appOrigin ?? getAppOrigin()).replace(/\/$/, '');

  const result = await sendCcwRoadshowBookingConfirmationEmail({
    to: email,
    attendeeName,
    eventCity: event.city,
    eventDates: event.dates,
    dateRangeLabel: event.dateRangeLabel,
    timeLabel: event.timeLabel,
    venueName: event.venueName,
    venueAddress: `${event.streetAddress}, ${event.suburbStatePostcode}`,
    ticketLabel: ticketPackage.label,
    seatCount: ticketPackage.attendeeCount,
    amountLabel,
    businessName,
    phone,
    appOrigin,
  });

  const confirmedDelivered =
    result.sent && result.reason !== 'dev_console' && result.reason !== 'not_configured';

  if (confirmedDelivered) {
    try {
      const stripe = getStripeClient();
      await stripe.checkout.sessions.update(sessionId, {
        metadata: {
          ...(session.metadata ?? {}),
          [CONFIRMATION_SENT_META]: 'true',
        },
      });
    } catch {
      // Email sent; metadata update failure may allow a retry on refresh.
    }
  }

  return {
    sent: result.sent,
    reason: result.reason,
    messageId: result.messageId,
  };
}

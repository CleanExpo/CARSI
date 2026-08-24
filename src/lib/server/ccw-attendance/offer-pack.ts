/**
 * Post-event offer pack batch for one CCW/CARSI roadshow event.
 *
 * Sends the Shopify + $295 membership + social links email to attendees who:
 *   - checked in both days
 *   - opted in to marketing email
 *   - are provisioned
 *   - have not already received the pack (`offerEmailSentAt` null)
 *
 * Admin-triggered (same pattern as provision) — not the door path.
 */
import { getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  CCW_ATTENDEE_MEMBERSHIP_LABEL,
  CCW_ATTENDEE_OFFER_QUERY,
  CCW_OFFER_SOCIAL_LINKS,
  resolveCcwShopifyTrainingUrl,
} from '@/lib/marketing/ccw-roadshow-offer-pack';
import { prisma } from '@/lib/prisma';
import { baseOfferEligible } from '@/lib/server/ccw-attendance/eligibility';
import { isEmailConfigured, sendCcwRoadshowOfferPackEmail } from '@/lib/server/transactional-email';

export type OfferPackBatchSummary = {
  eventSlug: string;
  eligible: number;
  sent: number;
  skippedAlreadySent: number;
  failures: Array<{ signInId: string; email: string; reason: string }>;
};

export async function runCcwOfferPackBatch(
  eventSlug: string,
  opts: { appOrigin: string }
): Promise<OfferPackBatchSummary> {
  const event = getCcwRoadshowEvent(eventSlug);
  if (!event) {
    return {
      eventSlug,
      eligible: 0,
      sent: 0,
      skippedAlreadySent: 0,
      failures: [{ signInId: '-', email: '-', reason: 'invalid_event' }],
    };
  }

  const rows = await prisma.ccwRoadshowSignIn.findMany({
    where: { eventSlug: event.slug },
    orderBy: { createdAt: 'asc' },
  });

  const base = opts.appOrigin.replace(/\/$/, '');
  const membershipCheckoutUrl = `${base}/subscribe?offer=${CCW_ATTENDEE_OFFER_QUERY}`;
  const emailOn = isEmailConfigured();

  // Resolved once for the whole batch, and allowed to be null: a preview or
  // missing product URL drops the Shopify CTA rather than mailing a link that
  // will expire (spec §4.5, fail-closed). Logged so an operator can see WHY the
  // CTA is absent — silence here previously let a preview link ship unnoticed.
  const shopifyTrainingUrl = resolveCcwShopifyTrainingUrl();
  if (!shopifyTrainingUrl) {
    console.warn(
      `[ccw-offer-pack] ${event.slug}: no distributable CCW product URL — sending the pack without the Shopify CTA.`
    );
  }

  let eligible = 0;
  let sent = 0;
  let skippedAlreadySent = 0;
  const failures: OfferPackBatchSummary['failures'] = [];

  for (const row of rows) {
    const ok = baseOfferEligible({
      day1CheckedInAt: row.day1CheckedInAt,
      day2CheckedInAt: row.day2CheckedInAt,
      studentId: row.studentId,
      enrollmentId: row.enrollmentId,
      provisionStatus: row.provisionStatus,
      emailOptIn: row.emailOptIn,
    });
    if (!ok) continue;
    eligible += 1;

    if (row.offerEmailSentAt) {
      skippedAlreadySent += 1;
      continue;
    }

    if (!emailOn) {
      failures.push({
        signInId: row.id,
        email: row.email,
        reason: 'email_not_configured',
      });
      continue;
    }

    try {
      const result = await sendCcwRoadshowOfferPackEmail({
        to: row.email,
        attendeeName: row.fullName,
        eventCity: event.city,
        eventDates: event.dates,
        shopifyTrainingUrl,
        membershipCheckoutUrl,
        membershipPriceLabel: CCW_ATTENDEE_MEMBERSHIP_LABEL,
        socialLinks: CCW_OFFER_SOCIAL_LINKS,
        appOrigin: base,
      });
      if (!result.sent) {
        failures.push({
          signInId: row.id,
          email: row.email,
          reason: result.reason ?? 'send_failed',
        });
        continue;
      }
      await prisma.ccwRoadshowSignIn.update({
        where: { id: row.id },
        data: { offerEmailSentAt: new Date() },
      });
      sent += 1;
    } catch (e) {
      failures.push({
        signInId: row.id,
        email: row.email,
        reason: e instanceof Error ? e.message : 'send_failed',
      });
    }
  }

  return { eventSlug: event.slug, eligible, sent, skippedAlreadySent, failures };
}

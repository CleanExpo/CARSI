/**
 * GP-767: partner referral sales. The Stripe webhook records one row per paid course checkout
 * whose metadata names a known referral partner; the admin settlement CSV lists them with the
 * amount actually paid, any refund, and any dispute not won.
 *
 * Refunds are not written here. The webhook already stores every refund and dispute of a one-off
 * checkout in `event_attribution_reversals`, keyed by the same checkout session id, and that
 * ledger is never pruned. The report reads it, so the refund path needs no change.
 *
 * No commission or payout maths: the terms with the partner are not set.
 */

import type Stripe from 'stripe';

import {
  PARTNER_REF_METADATA_KEY,
  parseReferralPartnerId,
  type ReferralPartnerId,
} from '@/lib/partners/referral-partners';
import { prisma } from '@/lib/prisma';
import { reduceAttributionReversals, type AttributionReversalReason } from '@/lib/server/event-attribution';
import { captureServerError } from '@/lib/server/sentry';

/**
 * Stores the partner sale for a paid course checkout, when its metadata names a known partner.
 * Returns the partner id recorded, or null when the session carries no (known) partner.
 * Idempotent: a retried webhook upserts the same row and changes nothing.
 */
export async function recordPartnerReferralSale(
  session: Stripe.Checkout.Session,
  transactionId: string,
  courseSlug: string,
  paidAt: Date
): Promise<ReferralPartnerId | null> {
  const partnerId = parseReferralPartnerId(session.metadata?.[PARTNER_REF_METADATA_KEY]);
  if (!partnerId) return null;

  // Never invent a payment fact: a session without a whole-cent total and a currency is not
  // written (and is reported loudly) rather than settled as a $0.00 or AUD-assumed sale. It does
  // not throw, so a malformed session cannot hold up the learner's enrolment.
  const amount = session.amount_total;
  const currency = session.currency?.trim().toUpperCase() ?? '';
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) {
    const error = new Error('Partner referral sale not recorded: session has no verified amount or currency');
    console.error('[partner-referral]', error.message, { transactionId, partnerId });
    void captureServerError(error, { route: '/api/lms/webhooks/stripe', tags: { partnerId } });
    return null;
  }

  // Copy the partner's terms in force when the sale was paid onto the row, so a later change of
  // terms never rewrites what an earlier sale was agreed under. No terms row is a setup error:
  // the sale is still recorded (with empty terms) and alerted, never dropped or guessed.
  const terms = await prisma.referralPartnerTerms.findFirst({
    where: {
      partnerId,
      effectiveFrom: { lte: paidAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: paidAt } }],
    },
    orderBy: { version: 'desc' },
    select: { id: true, version: true, rewardOption: true, commissionRateBps: true, discountRateBps: true },
  });
  if (!terms) {
    const error = new Error('Partner referral sale recorded without terms: no terms in force for the partner');
    console.error('[partner-referral]', error.message, { transactionId, partnerId });
    void captureServerError(error, { route: '/api/lms/webhooks/stripe', tags: { partnerId } });
  }

  const row = {
    partnerId,
    transactionId,
    courseSlug,
    amountPaidCents: amount,
    currency,
    paidAt,
    termsId: terms?.id ?? null,
    termsVersion: terms?.version ?? null,
    rewardOption: terms?.rewardOption ?? null,
    commissionRateBps: terms?.commissionRateBps ?? null,
    discountRateBps: terms?.discountRateBps ?? null,
  };
  await prisma.partnerReferralSale.upsert({
    where: { transactionId },
    create: row,
    update: {},
  });
  return partnerId;
}

const CSV_HEADER = [
  'date',
  'partner',
  'course',
  'amount_paid',
  'currency',
  'gst_estimate',
  'net_ex_gst_estimate',
  'refunded',
  'refunded_amount',
  'dispute_not_won',
  'reward_option',
  'terms_version',
  'stripe_checkout_session',
];

/** Settlement dates are Queensland business dates (no daylight saving). */
const SETTLEMENT_TIME_ZONE = 'Australia/Brisbane';

function settlementDate(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SETTLEMENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

function csvCell(value: string): string {
  // Values here are slugs, ids and numbers; quote defensively and stop spreadsheet formulas.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * The settlement CSV for one partner, oldest sale first. An unknown partner throws rather than
 * returning an empty report, so a typo can never look like "no sales".
 */
export async function getPartnerReferralSalesCsv(partner: string): Promise<string> {
  const partnerId = parseReferralPartnerId(partner);
  if (!partnerId) throw new Error(`Unknown referral partner: ${partner}`);

  const sales = await prisma.partnerReferralSale.findMany({
    where: { partnerId },
    orderBy: [{ paidAt: 'asc' }, { transactionId: 'asc' }],
  });
  const reversals = sales.length
    ? await prisma.eventAttributionReversal.findMany({
        where: { transactionId: { in: sales.map((s) => s.transactionId) } },
        select: {
          stripeEventId: true,
          providerObjectId: true,
          transactionId: true,
          reversedRevenueCents: true,
          reason: true,
          eventAt: true,
        },
      })
    : [];

  const byTransaction = new Map<string, typeof reversals>();
  for (const r of reversals) {
    const list = byTransaction.get(r.transactionId) ?? [];
    list.push(r);
    byTransaction.set(r.transactionId, list);
  }

  const lines = [CSV_HEADER.join(',')];
  for (const sale of sales) {
    const facts = (byTransaction.get(sale.transactionId) ?? []).map((r) => ({
      ...r,
      reason: r.reason as AttributionReversalReason,
    }));
    // Stripe reports refunds cumulatively, so the largest refund event is the total refunded,
    // never more than was paid.
    const refundedCents = Math.min(
      sale.amountPaidCents,
      facts.filter((r) => r.reason === 'refunded').reduce((max, r) => Math.max(max, r.reversedRevenueCents), 0)
    );
    // The ledger records a dispute opening and a dispute won, not a dispute lost, so this is
    // "a dispute was opened and not won": still open, or lost.
    const disputeNotWon = reduceAttributionReversals(facts)?.reason === 'disputed';
    // ESTIMATE only: assumes the amount paid is GST-inclusive at 10% (total / 11). The real GST
    // comes from the tax invoice lines; settlement is not built.
    const gstEstimateCents = Math.round(sale.amountPaidCents / 11);
    lines.push(
      [
        settlementDate(sale.paidAt),
        sale.partnerId,
        sale.courseSlug,
        money(sale.amountPaidCents),
        sale.currency,
        money(gstEstimateCents),
        money(sale.amountPaidCents - gstEstimateCents),
        refundedCents > 0 ? 'yes' : 'no',
        money(refundedCents),
        disputeNotWon ? 'yes' : 'no',
        sale.rewardOption ?? '',
        sale.termsVersion == null ? '' : String(sale.termsVersion),
        sale.transactionId,
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

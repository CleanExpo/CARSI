/**
 * GP-767: partner referral sales. The Stripe webhook records one row per paid course checkout
 * whose metadata names a known referral partner; the admin settlement CSV lists them with the
 * amount actually paid and any refund or open dispute.
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

  const row = {
    partnerId,
    transactionId,
    courseSlug,
    amountPaidCents: Math.max(0, Math.round(session.amount_total ?? 0)),
    currency: (session.currency ?? 'aud').trim().toUpperCase(),
    paidAt,
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
  'refunded',
  'refunded_amount',
  'disputed',
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
    // Stripe reports refunds cumulatively, so the largest refund event is the total refunded.
    const refundedCents = facts
      .filter((r) => r.reason === 'refunded')
      .reduce((max, r) => Math.max(max, r.reversedRevenueCents), 0);
    const disputed = reduceAttributionReversals(facts)?.reason === 'disputed';
    lines.push(
      [
        settlementDate(sale.paidAt),
        sale.partnerId,
        sale.courseSlug,
        money(sale.amountPaidCents),
        sale.currency,
        refundedCents > 0 ? 'yes' : 'no',
        money(refundedCents),
        disputed ? 'yes' : 'no',
        sale.transactionId,
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

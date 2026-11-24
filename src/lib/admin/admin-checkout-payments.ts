import { prisma } from '@/lib/prisma';

import { enrollmentIsStripePaid, type CheckoutPaymentLike } from '@/lib/admin/admin-ops-metrics';
import { reversedCheckoutSessionIds } from '@/lib/server/payment-integrity-ledger';

/**
 * GP-764: every paid course checkout behind admin revenue.
 *
 *  - `lms_checkout_payments`: the amount and currency recorded from the Stripe session at
 *    fulfilment (from this change on).
 *  - Older sessions: a partner referral sale (GP-767) holds the same Stripe `amount_total` for
 *    checkouts that came through a partner link, so those are known too. Nothing else stored
 *    locally holds what an older session cost: each such Stripe-paid enrolment session is
 *    returned with `amountTotalCents: null` (dated by its enrolment), so the dashboard counts it
 *    as "price at purchase unknown" instead of showing a partial sum as the whole.
 *
 * Revenue is a business total, so it is read from these tables whole: never scoped to the
 * learners the dashboard lists (at most the newest 2000) or to their enrolments. A learner who
 * was deleted, or a partner sale no enrolment names, was still paid. A session in both tables
 * counts once, from its recorded row.
 *
 * Each session is marked reversed from its reversal marker (full refund, or a dispute not won).
 * Read-only.
 */
export async function loadCheckoutPaymentsForRevenue(): Promise<CheckoutPaymentLike[]> {
  const recorded = await prisma.lmsCheckoutPayment.findMany({
    select: { checkoutSessionId: true, paidAt: true, amountTotalCents: true, currency: true },
  });
  const seen = new Set(recorded.map((r) => r.checkoutSessionId));
  const partnerSales = await prisma.partnerReferralSale.findMany({
    select: { transactionId: true, paidAt: true, amountPaidCents: true, currency: true },
  });

  const partnerRows = partnerSales
    .filter((s) => !seen.has(s.transactionId))
    .map((s) => ({
      checkoutSessionId: s.transactionId,
      paidAt: s.paidAt,
      amountTotalCents: s.amountPaidCents as number | null,
      currency: s.currency as string | null,
    }));
  for (const r of partnerRows) seen.add(r.checkoutSessionId);

  // Older Stripe-paid sessions with neither record: amount unknown. One per session, dated by
  // its earliest enrolment.
  const paidEnrolments = await prisma.lmsEnrollment.findMany({
    where: { paymentReference: { startsWith: 'cs_' } },
    select: { paymentReference: true, enrolledAt: true, status: true },
  });
  const unknown = new Map<string, Date>();
  for (const e of paidEnrolments) {
    if (!enrollmentIsStripePaid(e)) continue;
    const ref = (e.paymentReference ?? '').trim();
    if (!ref || seen.has(ref)) continue;
    const at = unknown.get(ref);
    if (!at || e.enrolledAt < at) unknown.set(ref, e.enrolledAt);
  }

  const rows = [
    ...recorded,
    ...partnerRows,
    ...Array.from(unknown, ([checkoutSessionId, paidAt]) => ({
      checkoutSessionId,
      paidAt,
      amountTotalCents: null,
      currency: null,
    })),
  ];
  const reversed = await reversedCheckoutSessionIds(
    prisma,
    rows.map((r) => r.checkoutSessionId)
  );
  return rows.map((r) => ({
    checkoutSessionId: r.checkoutSessionId,
    paidAt: r.paidAt,
    amountTotalCents: r.amountTotalCents,
    currency: r.currency ? r.currency.toLowerCase() : null,
    reversed: reversed.has(r.checkoutSessionId),
  }));
}

import { prisma } from '@/lib/prisma';

import { enrollmentIsStripePaid, type CheckoutPaymentLike } from '@/lib/admin/admin-ops-metrics';
import { reversedCheckoutSessionIds } from '@/lib/server/payment-integrity-ledger';

/**
 * GP-764: the paid course checkouts behind admin revenue, for the learners on the dashboard.
 *
 *  - `lms_checkout_payments`: the amount and currency recorded from the Stripe session at
 *    fulfilment (from this change on).
 *  - Older sessions: a partner referral sale (GP-767) holds the same Stripe `amount_total` for
 *    checkouts that came through a partner link, so those are known too. Nothing else stored
 *    locally holds what an older session cost; its enrolment stays "price at purchase unknown".
 *
 * Each session is marked reversed from its reversal marker (full refund, or a dispute not won).
 * Read-only.
 */
export async function loadCheckoutPaymentsForRevenue(
  studentIds: string[],
  enrollments: { status: string; paymentReference: string | null }[]
): Promise<CheckoutPaymentLike[]> {
  if (studentIds.length === 0) return [];
  const recorded = await prisma.lmsCheckoutPayment.findMany({
    where: { studentId: { in: studentIds } },
    select: { checkoutSessionId: true, paidAt: true, amountTotalCents: true, currency: true },
  });
  const seen = new Set(recorded.map((r) => r.checkoutSessionId));

  const missing = Array.from(
    new Set(
      enrollments
        .filter((e) => enrollmentIsStripePaid(e))
        .map((e) => (e.paymentReference ?? '').trim())
        .filter((ref) => ref && !seen.has(ref))
    )
  );
  const partnerSales =
    missing.length === 0
      ? []
      : await prisma.partnerReferralSale.findMany({
          where: { transactionId: { in: missing } },
          select: { transactionId: true, paidAt: true, amountPaidCents: true, currency: true },
        });

  const rows = [
    ...recorded,
    ...partnerSales.map((s) => ({
      checkoutSessionId: s.transactionId,
      paidAt: s.paidAt,
      amountTotalCents: s.amountPaidCents,
      currency: s.currency,
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

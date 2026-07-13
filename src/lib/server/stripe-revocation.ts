import { prisma } from '@/lib/prisma';

/**
 * Revoke course access when a payment is reversed (Phase 7, 2026-06-29 audit).
 *
 * Enrollments are matched by `paymentReference` (= the Stripe checkout session
 * id stored at fulfillment). Revocation sets `status='revoked'` and clears
 * `certificateIssuedAt` so any issued certificate is invalidated, while keeping
 * the row for audit. Idempotent: already-revoked rows are skipped, so repeated
 * webhook deliveries are safe.
 */
export async function revokeEnrollmentsByPaymentReference(
  paymentReference: string,
  reason: 'refunded' | 'disputed',
): Promise<{ revoked: number }> {
  const ref = paymentReference.trim();
  if (!ref) return { revoked: 0 };

  // A refund is TERMINAL and wins over a prior dispute: besides revoking any
  // still-active row, it re-stamps an already dispute-revoked row as 'refunded'
  // so a later dispute-won can NEVER re-grant a genuinely-refunded enrolment
  // (reactivateDisputeWonEnrollmentsByPaymentReference only touches 'disputed'
  // rows). A dispute revokes only not-yet-revoked rows — it must never override
  // a prior refund.
  const where =
    reason === 'refunded'
      ? {
          paymentReference: ref,
          OR: [{ status: { not: 'revoked' } }, { revokedReason: 'disputed' }],
        }
      : { paymentReference: ref, status: { not: 'revoked' } };

  const result = await prisma.lmsEnrollment.updateMany({
    where,
    // Clear completedAt too (WS3 / P0-C): the completion sync derives
    // `wasAlreadyCompleted` from a non-null completedAt, so leaving it set was the
    // fuel that let a later sync resurrect the row. The sticky-revoke guard in
    // syncEnrollmentCompletion is the primary fix; this is defence-in-depth.
    data: { status: 'revoked', certificateIssuedAt: null, completedAt: null, revokedReason: reason },
  });

  if (result.count > 0) {
    console.warn(
      `[stripe webhook] revoked ${result.count} enrollment(s) for paymentReference=${ref} (${reason})`,
    );
  }
  return { revoked: result.count };
}

/**
 * A closed dispute re-grants access ONLY when the merchant WON it (the customer's
 * chargeback failed → they legitimately paid). Every other close status
 * ('lost' / 'warning_closed' / 'under_review' / …) leaves the enrolment revoked.
 * Strict equality — never widen to `!== 'lost'`, which would wrongly re-grant a
 * still-open or bank-favoured dispute.
 */
export function isDisputeWon(status: string | null | undefined): boolean {
  return status === 'won';
}

/**
 * Re-grant course access after a dispute closes in the MERCHANT's favour
 * (`charge.dispute.closed`, status='won'): the customer's chargeback failed, so
 * they legitimately paid and the enrolment that `charge.dispute.created` revoked
 * is restored.
 *
 * Restores ACCESS ONLY — sets status back to 'active' and clears revokedReason.
 * It deliberately does NOT restore completedAt or re-issue a certificate (WS3's
 * "no cert re-issue" invariant): a learner re-earns completion/credential through
 * the normal path, never via a webhook. Scope is fail-closed: it touches ONLY
 * rows this dispute revoked (revokedReason='disputed'), so a genuinely-refunded
 * row (downgraded to 'refunded' by revokeEnrollmentsByPaymentReference) is never
 * re-granted. Idempotent: a re-delivered event matches no still-revoked row.
 */
export async function reactivateDisputeWonEnrollmentsByPaymentReference(
  paymentReference: string,
): Promise<{ reactivated: number }> {
  const ref = paymentReference.trim();
  if (!ref) return { reactivated: 0 };

  const result = await prisma.lmsEnrollment.updateMany({
    where: { paymentReference: ref, status: 'revoked', revokedReason: 'disputed' },
    data: { status: 'active', revokedReason: null },
  });

  if (result.count > 0) {
    console.warn(
      `[stripe webhook] reactivated ${result.count} enrollment(s) for paymentReference=${ref} (dispute won)`,
    );
  }
  return { reactivated: result.count };
}

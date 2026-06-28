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

  const result = await prisma.lmsEnrollment.updateMany({
    where: { paymentReference: ref, status: { not: 'revoked' } },
    data: { status: 'revoked', certificateIssuedAt: null },
  });

  if (result.count > 0) {
    console.warn(
      `[stripe webhook] revoked ${result.count} enrollment(s) for paymentReference=${ref} (${reason})`,
    );
  }
  return { revoked: result.count };
}

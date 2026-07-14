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
  /**
   * Stripe `event.created` of the revoking event. When supplied, the revoke is
   * guarded against out-of-order delivery: it applies only if no strictly-newer
   * status event has already been recorded on the row (`statusEventAt`), and it
   * stamps `statusEventAt` so a later stale event can't overwrite this state.
   * Omit for legacy/unordered callers — the revoke then applies unconditionally
   * (unchanged behaviour). NB: use the EVENT timestamp, not `dispute.created`,
   * which is identical for a dispute's created and closed events.
   */
  eventTimestamp?: Date,
): Promise<{ revoked: number }> {
  const ref = paymentReference.trim();
  if (!ref) return { revoked: 0 };

  // A refund is TERMINAL and wins over a prior dispute: besides revoking any
  // still-active row, it re-stamps an already dispute-revoked row as 'refunded'
  // so a later dispute-won can NEVER re-grant a genuinely-refunded enrolment
  // (reactivateDisputeWonEnrollmentsByPaymentReference only touches 'disputed'
  // rows). A dispute revokes only not-yet-revoked rows — it must never override
  // a prior refund.
  const statusCondition =
    reason === 'refunded'
      ? { OR: [{ status: { not: 'revoked' } }, { revokedReason: 'disputed' }] }
      : { status: { not: 'revoked' } };

  // Out-of-order guard: skip when a strictly-newer status event already landed
  // (stored statusEventAt > incoming). `lte` keeps a replay of the same event
  // idempotent. Without a timestamp, no guard is applied (legacy behaviour).
  const where = eventTimestamp
    ? {
        paymentReference: ref,
        AND: [
          statusCondition,
          { OR: [{ statusEventAt: null }, { statusEventAt: { lte: eventTimestamp } }] },
        ],
      }
    : { paymentReference: ref, ...statusCondition };

  const result = await prisma.lmsEnrollment.updateMany({
    where,
    // Clear completedAt too (WS3 / P0-C): the completion sync derives
    // `wasAlreadyCompleted` from a non-null completedAt, so leaving it set was the
    // fuel that let a later sync resurrect the row. The sticky-revoke guard in
    // syncEnrollmentCompletion is the primary fix; this is defence-in-depth.
    data: {
      status: 'revoked',
      certificateIssuedAt: null,
      completedAt: null,
      revokedReason: reason,
      ...(eventTimestamp ? { statusEventAt: eventTimestamp } : {}),
    },
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
 *
 * Out-of-order guard (eventTimestamp = Stripe `event.created`): Stripe delivers
 * at-least-once and NOT in order, so a `charge.dispute.created` that 5xx'd can be
 * retried AFTER this won-close is processed. Two effects close that race:
 *  - the flip is not-stale-guarded and stamps `statusEventAt`, and
 *  - a second write stamps `statusEventAt` on rows still ACTIVE here (the delayed
 *    created has not revoked them yet) so that created's own not-stale guard then
 *    sees a newer stored timestamp and skips the revoke — the won customer keeps
 *    access. Without a timestamp, only the legacy flip runs (unchanged behaviour).
 */
export async function reactivateDisputeWonEnrollmentsByPaymentReference(
  paymentReference: string,
  eventTimestamp?: Date,
): Promise<{ reactivated: number }> {
  const ref = paymentReference.trim();
  if (!ref) return { reactivated: 0 };

  if (!eventTimestamp) {
    // Legacy path: flip disputed-revoked rows back to active, no ordering guard.
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

  // Step A: flip the rows THIS dispute revoked (not stale), stamping the event
  // time. `lte` keeps a replay idempotent (an already-active row matches nothing).
  const flipped = await prisma.lmsEnrollment.updateMany({
    where: {
      paymentReference: ref,
      status: 'revoked',
      revokedReason: 'disputed',
      OR: [{ statusEventAt: null }, { statusEventAt: { lte: eventTimestamp } }],
    },
    data: { status: 'active', revokedReason: null, statusEventAt: eventTimestamp },
  });

  // Step B: stamp rows still ACTIVE here (a delayed `created` has not revoked them
  // yet) so that stale created's not-stale guard skips the revoke. `lt` excludes
  // the rows step A just stamped to exactly this timestamp.
  await prisma.lmsEnrollment.updateMany({
    where: {
      paymentReference: ref,
      status: 'active',
      OR: [{ statusEventAt: null }, { statusEventAt: { lt: eventTimestamp } }],
    },
    data: { statusEventAt: eventTimestamp },
  });

  if (flipped.count > 0) {
    console.warn(
      `[stripe webhook] reactivated ${flipped.count} enrollment(s) for paymentReference=${ref} (dispute won)`,
    );
  }
  return { reactivated: flipped.count };
}

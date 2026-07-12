/**
 * Per-course enrolment access predicate (WS3 / P0-C) — the single source of truth
 * for "may this learner read paid content / take a quiz / hold a certificate?".
 *
 * WHY AN ALLOW-SET: `lms_enrollments.status` is a free-text column (no enum/CHECK —
 * WS6 adds that). Read gates historically used a DENY-token (`status != 'cancelled'`),
 * but a real refund writes `'revoked'`, which that filter trivially passes, AND a
 * misspelt/new status would silently grant access. This predicate ALLOWS exactly
 * `{active, completed}` and DENIES everything else, so any unrecognised token
 * FAILS CLOSED — a refund/chargeback (`revoked`/`refunded`/`disputed`) can never
 * retain access.
 *
 * SCOPE FENCE: this governs PER-COURSE enrolment access only. It is NOT the
 * subscription/membership machine (`entitlements.ts`) — founder-locked policy keeps
 * a lapsed subscriber's EXISTING course access + certificates. Do not collapse the
 * two: a subscription lapse must never be routed through this predicate.
 *
 * Pure + dependency-free so it is trivially unit-testable (mirrors
 * `decideMembershipEntitlement` / `lms-completion`).
 */

/** Statuses that grant access to already-enrolled course content + certificates. */
export const ACCESS_GRANTING_STATUS_LIST = ['active', 'completed'] as const;

/** Set form for O(1) membership checks; array form (above) for Prisma `where: { in }`. */
export const ACCESS_GRANTING_STATUSES = new Set<string>(ACCESS_GRANTING_STATUS_LIST);

/**
 * Terminal no-access statuses (refund / chargeback family). Includes BOTH British
 * `cancelled` and American `canceled` so a Stripe-sourced spelling can never slip
 * past. `revoked` is the value the refund/dispute webhook actually writes today.
 */
export const NO_ACCESS_STATUSES = [
  'revoked',
  'cancelled',
  'canceled',
  'refunded',
  'disputed',
  'chargeback',
] as const;

function normalise(status: string | null | undefined): string | null {
  if (!status) return null;
  const s = status.toLowerCase().trim();
  return s || null;
}

/**
 * True only when the enrolment status grants access. Fails closed: null / empty /
 * unknown / any no-access status → false.
 */
export function isEnrolmentAccessAllowed(status: string | null | undefined): boolean {
  const s = normalise(status);
  return s !== null && ACCESS_GRANTING_STATUSES.has(s);
}

/**
 * True when the status is a terminal no-access (revoked/refund/chargeback) state.
 * Used to make revocation STICKY — a completion sync must never resurrect such a row.
 */
export function isRevokedStatus(status: string | null | undefined): boolean {
  const s = normalise(status);
  return s !== null && (NO_ACCESS_STATUSES as readonly string[]).includes(s);
}

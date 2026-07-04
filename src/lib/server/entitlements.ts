/**
 * WS1-E1 — individual annual membership entitlement.
 *
 * Two layers, split like `lms-completion.ts` so the decision rules are
 * unit-testable without a database:
 *  - `decideMembershipEntitlement(...)` — a PURE decision core. Given a
 *    subscription's status/period-end and the current time, decide whether the
 *    holder is entitled to enrol in NEW courses. It FAILS CLOSED: any unknown /
 *    missing / unexpected state yields "not entitled".
 *  - `getEntitlements(userId)` — a thin data wrapper that loads the user's
 *    subscription row and applies the pure decision.
 *
 * Founder-locked policy (GitHub #271 option 1, Linear GP-441):
 *  - `active` / `trialing` → entitled (full catalogue).
 *  - `past_due` within a 7-day grace of `currentPeriodEnd` → still entitled.
 *  - lapsed (past_due beyond grace, `canceled`, `unpaid`, `incomplete_expired`,
 *    or no subscription at all) → NOT entitled for NEW enrolments.
 *
 * Lapse gates NEW enrolments only. It NEVER revokes existing progress,
 * existing enrolments, or an already-issued certificate — those are retained by
 * the callers (this service is only consulted before granting new access).
 */

/** Days of grace after `currentPeriodEnd` while a subscription is `past_due`. */
export const PAST_DUE_GRACE_DAYS = 7;
const GRACE_MS = PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Stripe subscription statuses we treat as fully entitled without consulting the
 * grace window. `trialing` is included defensively — CARSI does not sell an
 * individual trial today, but a trialing subscription is a live, paying-intent
 * membership and must not be locked out if one is ever created.
 */
const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export type MembershipDecisionReason =
  | 'active'
  | 'grace'
  | 'lapsed'
  | 'none'
  | 'unknown';

export interface MembershipDecision {
  /** True only when the holder may start a NEW enrolment. */
  entitled: boolean;
  /** Why — for honest UI copy and logging. */
  reason: MembershipDecisionReason;
}

export interface MembershipSubscriptionInput {
  /** Raw Stripe subscription status, or null when the user has no row. */
  status: string | null;
  /** End of the current paid period, or null when unknown. */
  currentPeriodEnd: Date | null;
}

/**
 * PURE decision core. No I/O. Fails closed on every uncertain input.
 *
 * @param sub  the user's subscription snapshot (or an all-null "no membership")
 * @param now  current time (injected for deterministic tests)
 */
export function decideMembershipEntitlement(
  sub: MembershipSubscriptionInput | null,
  now: Date = new Date(),
): MembershipDecision {
  // No subscription row at all → not entitled.
  if (!sub || !sub.status) {
    return { entitled: false, reason: 'none' };
  }

  const status = sub.status.toLowerCase().trim();

  // Live membership → entitled, no need to look at the period end.
  if (ACTIVE_STATUSES.has(status)) {
    return { entitled: true, reason: 'active' };
  }

  // Past-due: entitled only inside the grace window measured from period end.
  if (status === 'past_due') {
    const periodEnd = sub.currentPeriodEnd;
    // Fail closed: a past_due subscription with no known period end cannot be
    // proven inside grace, so it is treated as lapsed.
    if (!periodEnd || Number.isNaN(periodEnd.getTime())) {
      return { entitled: false, reason: 'lapsed' };
    }
    const graceEnds = periodEnd.getTime() + GRACE_MS;
    if (now.getTime() <= graceEnds) {
      return { entitled: true, reason: 'grace' };
    }
    return { entitled: false, reason: 'lapsed' };
  }

  // Explicitly terminal Stripe statuses → lapsed.
  if (
    status === 'canceled' ||
    status === 'unpaid' ||
    status === 'incomplete_expired'
  ) {
    return { entitled: false, reason: 'lapsed' };
  }

  // `incomplete` (checkout not finished) and any status we do not recognise →
  // fail closed as unknown. Never grant access on an unrecognised state.
  return { entitled: false, reason: 'unknown' };
}

export interface Entitlements {
  /** True when the user may enrol in any published course without further pay. */
  hasActiveMembership: boolean;
  /** Decision reason for honest UI and logging. */
  reason: MembershipDecisionReason;
  /**
   * Course scope. For the individual annual membership this is always the
   * sentinel `'ALL'` when entitled (100% catalogue access), else `null`.
   * Kept as a discriminated field so Teams (E2) can later return an id list.
   */
  entitledCourseIds: 'ALL' | null;
  /** Raw status passed through for status endpoints / banners. */
  status: string | null;
  /** Period end for renew CTAs and grace banners. */
  currentPeriodEnd: Date | null;
  /** Whether the subscription is set to cancel at period end (UI hint). */
  cancelAtPeriodEnd: boolean;
}

const NOT_ENTITLED: Entitlements = {
  hasActiveMembership: false,
  reason: 'none',
  entitledCourseIds: null,
  status: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

/**
 * Data wrapper. Loads the user's individual membership row and applies the pure
 * decision. FAILS CLOSED: if the DB is unavailable or the lookup throws, the
 * user is treated as not entitled (never grant paid content on uncertainty).
 *
 * Note: this reports on the individual `pro_annual` membership only. Existing
 * per-course enrolments and Teams entitlement (E2) are separate and unaffected —
 * a lapsed member keeps every course they already enrolled in.
 */
export async function getEntitlements(userId: string): Promise<Entitlements> {
  if (!userId || !process.env.DATABASE_URL?.trim()) {
    return NOT_ENTITLED;
  }

  try {
    const { prisma } = await import('@/lib/prisma');
    const sub = await prisma.lmsSubscription.findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    });

    const decision = decideMembershipEntitlement(
      sub ? { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd } : null,
    );

    return {
      hasActiveMembership: decision.entitled,
      reason: decision.reason,
      entitledCourseIds: decision.entitled ? 'ALL' : null,
      status: sub?.status ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    };
  } catch (error) {
    // Fail closed on any data-layer error.
    console.error('[entitlements] lookup failed, denying (fail-closed):', error);
    return NOT_ENTITLED;
  }
}

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

/* -------------------------------------------------------------------------- */
/* WS1-E2 (GP-442) — Teams seat entitlement.                                   */
/*                                                                            */
/* A team's seat subscription grants WHOLE-CATALOGUE access to exactly        */
/* `seatLimit` members while the subscription is active/in-grace. The         */
/* status→entitled machine is IDENTICAL to the individual membership          */
/* (`decideMembershipEntitlement`) — it is reused verbatim below, then a       */
/* per-member SEAT check is layered on top. Both fail closed.                  */
/* -------------------------------------------------------------------------- */

export interface TeamSeatSubscriptionInput {
  status: string | null;
  currentPeriodEnd: Date | null;
  /** Purchased seat count (= Stripe subscription quantity). */
  seatLimit: number;
}

export type TeamSeatReason = MembershipDecisionReason | 'seat_full';

export interface TeamSeatDecision {
  /** True when the subscription is live (before the per-member seat check). */
  subscriptionEntitled: boolean;
  reason: MembershipDecisionReason;
  seatLimit: number;
}

/**
 * PURE decision core for a team seat subscription. Decides ONLY whether the
 * subscription itself is live (active/grace) — the same rules as the individual
 * membership. The per-member seat-index check (`memberSeatIndex < seatLimit`) is
 * a separate pure function (`isSeatEntitled`) so callers can decide, for a given
 * member, whether a seat is held. Fails closed on every uncertain input.
 */
export function decideTeamSeatSubscription(
  sub: TeamSeatSubscriptionInput | null,
  now: Date = new Date(),
): TeamSeatDecision {
  if (!sub) {
    return { subscriptionEntitled: false, reason: 'none', seatLimit: 0 };
  }
  const base = decideMembershipEntitlement(
    { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd },
    now,
  );
  const seatLimit = Number.isFinite(sub.seatLimit) && sub.seatLimit > 0 ? sub.seatLimit : 0;
  return { subscriptionEntitled: base.entitled, reason: base.reason, seatLimit };
}

/**
 * PURE: is a member holding seat index `memberSeatIndex` (0-based, ordered by
 * join time) entitled? Requires the subscription to be live AND the member's
 * seat index to fall within the purchased `seatLimit`. This is what enforces
 * spec §15 #4: on a 5-seat plan, members at indexes 0..4 are entitled and the
 * 6th (index 5) is not — seat-full.
 */
export function isSeatEntitled(
  decision: TeamSeatDecision,
  memberSeatIndex: number,
): { entitled: boolean; reason: TeamSeatReason } {
  if (!decision.subscriptionEntitled) {
    return { entitled: false, reason: decision.reason };
  }
  if (
    !Number.isInteger(memberSeatIndex) ||
    memberSeatIndex < 0 ||
    memberSeatIndex >= decision.seatLimit
  ) {
    return { entitled: false, reason: 'seat_full' };
  }
  return { entitled: true, reason: decision.reason };
}

export interface TeamEntitlements {
  /** True when this specific user holds an entitled seat on an active team sub. */
  hasActiveSeat: boolean;
  reason: TeamSeatReason;
  /** Course scope for an entitled seat: whole catalogue, else null. */
  entitledCourseIds: 'ALL' | null;
  status: string | null;
  currentPeriodEnd: Date | null;
  seatLimit: number;
  /** Seats currently held (team member count, capped at seatLimit for UI). */
  seatsUsed: number;
  teamId: string | null;
  isOwner: boolean;
}

const NO_TEAM_SEAT: TeamEntitlements = {
  hasActiveSeat: false,
  reason: 'none',
  entitledCourseIds: null,
  status: null,
  currentPeriodEnd: null,
  seatLimit: 0,
  seatsUsed: 0,
  teamId: null,
  isOwner: false,
};

/**
 * Data wrapper: does `userId` hold an entitled seat via a team seat
 * subscription? Loads the user's team membership + that team's seat
 * subscription, orders members by join time to assign stable seat indexes, and
 * applies the pure decision. FAILS CLOSED on any error or missing data.
 *
 * Whole-catalogue entitlement (like the individual membership) — a seated
 * member may enrol in any published course. Distinct from the per-course seat
 * bundles (`LmsTeamCoursePurchase`), which remain in force independently.
 */
export async function getTeamEntitlements(userId: string): Promise<TeamEntitlements> {
  if (!userId || !process.env.DATABASE_URL?.trim()) {
    return NO_TEAM_SEAT;
  }

  try {
    const { prisma } = await import('@/lib/prisma');

    // A user can be on multiple teams. Scan ALL of them and grant if ANY holds
    // an entitled seat for this user — mirroring getOrgEntitlements. A single
    // findFirst() with no orderBy is non-deterministic and can wrongly DENY an
    // entitled user by arbitrarily picking a lapsed team. Deterministic by
    // teamId so the "report first team for honest UI" fallback is stable too.
    const memberships = await prisma.lmsTeamMember.findMany({
      where: { userId },
      select: { teamId: true },
      orderBy: { teamId: 'asc' },
    });
    if (memberships.length === 0) return NO_TEAM_SEAT;

    const teamIds = memberships.map((m) => m.teamId);

    const [subs, members, teams] = await Promise.all([
      prisma.lmsTeamSubscription.findMany({
        where: { teamId: { in: teamIds } },
        select: { teamId: true, status: true, currentPeriodEnd: true, seatLimit: true },
      }),
      prisma.lmsTeamMember.findMany({
        where: { teamId: { in: teamIds } },
        select: { teamId: true, userId: true },
        orderBy: { joinedAt: 'asc' },
      }),
      prisma.lmsTeam.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, ownerId: true },
      }),
    ]);

    const subByTeam = new Map(subs.map((s) => [s.teamId, s]));
    const ownerByTeam = new Map(teams.map((t) => [t.id, t.ownerId]));
    const membersByTeam = new Map<string, { userId: string }[]>();
    for (const m of members) {
      const list = membersByTeam.get(m.teamId) ?? [];
      list.push({ userId: m.userId });
      membersByTeam.set(m.teamId, list);
    }

    // Compute the per-team seat result for this user, in deterministic order.
    const evaluate = (teamId: string): TeamEntitlements => {
      const sub = subByTeam.get(teamId);
      const teamMembers = membersByTeam.get(teamId) ?? [];
      const isOwner = ownerByTeam.get(teamId) === userId;

      if (!sub) return { ...NO_TEAM_SEAT, teamId, isOwner };

      const decision = decideTeamSeatSubscription({
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        seatLimit: sub.seatLimit,
      });

      // Owner always occupies seat 0; remaining seats fill by join order. This
      // is the same ordering the invite path enforces, so the decision is stable.
      const seatIndex = teamMembers.findIndex((m) => m.userId === userId);
      const seat = isSeatEntitled(decision, seatIndex);

      return {
        hasActiveSeat: seat.entitled,
        reason: seat.reason,
        entitledCourseIds: seat.entitled ? 'ALL' : null,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        seatLimit: decision.seatLimit,
        seatsUsed: Math.min(teamMembers.length, decision.seatLimit),
        teamId,
        isOwner,
      };
    };

    // Grant on the FIRST team (deterministic order) where this user holds an
    // entitled seat.
    for (const teamId of teamIds) {
      const result = evaluate(teamId);
      if (result.hasActiveSeat) return result;
    }

    // Not entitled anywhere: report the first team's status for honest UI
    // (mirrors getOrgEntitlements), still fail-closed on entitlement.
    return evaluate(teamIds[0]);
  } catch (error) {
    console.error('[entitlements] team lookup failed, denying (fail-closed):', error);
    return NO_TEAM_SEAT;
  }
}

/* -------------------------------------------------------------------------- */
/* WS1-E3 (GP-443) — Organisation monthly (unlimited) entitlement.             */
/*                                                                            */
/* An org subscription grants access to courses in its entitled CATEGORY to   */
/* ANY member of the org (seatModel 'unlimited') while active/in-grace. Reuses */
/* the identical status machine; no seat cap.                                  */
/* -------------------------------------------------------------------------- */

export interface OrgEntitlements {
  /** True when this user is a member of an org whose subscription is live. */
  hasActiveOrg: boolean;
  reason: MembershipDecisionReason;
  /** The course category this org entitles (null when not entitled). */
  entitledCategory: string | null;
  status: string | null;
  currentPeriodEnd: Date | null;
  teamId: string | null;
}

const NO_ORG: OrgEntitlements = {
  hasActiveOrg: false,
  reason: 'none',
  entitledCategory: null,
  status: null,
  currentPeriodEnd: null,
  teamId: null,
};

/**
 * Data wrapper: is `userId` entitled via an active org subscription, and if so
 * to which course category? Unlimited seats — membership alone (plus a live
 * subscription) entitles. FAILS CLOSED on any error.
 */
export async function getOrgEntitlements(userId: string): Promise<OrgEntitlements> {
  if (!userId || !process.env.DATABASE_URL?.trim()) {
    return NO_ORG;
  }

  try {
    const { prisma } = await import('@/lib/prisma');

    const memberships = await prisma.lmsTeamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    if (memberships.length === 0) return NO_ORG;

    const teamIds = memberships.map((m) => m.teamId);
    const orgSubs = await prisma.lmsOrgSubscription.findMany({
      where: { teamId: { in: teamIds } },
      select: {
        teamId: true,
        status: true,
        currentPeriodEnd: true,
        entitledCategory: true,
      },
    });

    for (const org of orgSubs) {
      const decision = decideMembershipEntitlement(
        { status: org.status, currentPeriodEnd: org.currentPeriodEnd },
      );
      if (decision.entitled) {
        return {
          hasActiveOrg: true,
          reason: decision.reason,
          entitledCategory: org.entitledCategory,
          status: org.status,
          currentPeriodEnd: org.currentPeriodEnd,
          teamId: org.teamId,
        };
      }
    }

    // Report the first org's status for honest UI even when lapsed.
    const first = orgSubs[0];
    if (first) {
      const decision = decideMembershipEntitlement({
        status: first.status,
        currentPeriodEnd: first.currentPeriodEnd,
      });
      return {
        hasActiveOrg: false,
        reason: decision.reason,
        entitledCategory: null,
        status: first.status,
        currentPeriodEnd: first.currentPeriodEnd,
        teamId: first.teamId,
      };
    }

    return NO_ORG;
  } catch (error) {
    console.error('[entitlements] org lookup failed, denying (fail-closed):', error);
    return NO_ORG;
  }
}

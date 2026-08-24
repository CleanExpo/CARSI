/**
 * Comp a roadshow attendee a year of CARSI membership — the ADMIN path for the
 * `carsi-membership` offer.
 *
 * This complements, and does not replace, the self-serve attendee path. Spec §10
 * (owner-chosen) delivers that offer as a discounted `pro_annual` Stripe
 * SUBSCRIPTION — A$295 for the first year via a `duration: once` coupon, then
 * A$795 renewals. `grantYearlyMembership` is a different instrument: it grants
 * membership outright, with no Stripe subscription and therefore no renewal. So
 * it belongs behind an admin action for a named attendee (a comp, or a rate
 * settled off-platform at the event), never on the self-serve path — routing
 * attendees through it would silently give away every future renewal.
 *
 * Founder decision, 2026-08-24: admin comp path; the self-serve $295 → $795
 * subscription stays as it is.
 *
 * Deliberately NOT gated on `CCW_ATTENDEE_OFFERS_ENABLED` or the offer's own
 * `live` flag. Both exist for the attendee-facing surface and its external
 * dependency (Rana's Stripe price and coupon). This path touches neither Stripe
 * nor the attendee's screens: it is an authenticated staff action, gated by the
 * admin session and `CCW_ATTENDANCE_ENABLED` at the route.
 */
import { grantYearlyMembership } from '@/lib/admin/admin-yearly-membership';
import { ccwRoadshowAttendeeOffers } from '@/lib/marketing/ccw-roadshow-offers';
import { prisma } from '@/lib/prisma';
import { baseOfferEligible } from '@/lib/server/ccw-attendance/eligibility';
import { decideMembershipEntitlement } from '@/lib/server/entitlements';

/**
 * The attendee first-year rate, read from the offer config rather than repeated
 * here — the same figure the self-serve coupon is sized against, so the two
 * cannot drift. `null` when the offer carries no rate.
 */
export function attendeeMembershipRateAud(
  offers = ccwRoadshowAttendeeOffers,
): number | null {
  const offer = offers.find((o) => o.key === 'carsi-membership');
  return typeof offer?.membershipPriceAud === 'number' ? offer.membershipPriceAud : null;
}

export type CompMembershipRefusal =
  /** No sign-in row with that id. */
  | 'not_found'
  /** Not both days, not opted in, or not provisioned — the offer is attendee-exclusive. */
  | 'not_offer_eligible'
  /** The attendee already holds a live membership; granting would rotate their password for nothing. */
  | 'already_a_member'
  /** Could not prove the attendee is NOT already a member. Refuse rather than guess. */
  | 'membership_unverifiable';

export type CompMembershipOutcome =
  | { ok: true; result: Awaited<ReturnType<typeof grantYearlyMembership>> }
  | { ok: false; reason: CompMembershipRefusal };

/**
 * Whether a comp may proceed for this learner, given their current membership.
 *
 * PURE, so the refusal rules are testable without a database. Fails CLOSED: an
 * unreadable membership state refuses the comp. That direction is deliberate —
 * `grantYearlyMembership` rotates an existing member's password and reveals it
 * only in the welcome email, so a comp issued on a bad guess can lock a paying
 * member out of their own account (the #694 hazard). Refusing costs an operator
 * one retry; guessing costs a member their access.
 */
export function decideCompMembership(input: {
  subscription: { status: string | null; currentPeriodEnd: Date | null } | null;
  lookupFailed: boolean;
}): { allowed: true } | { allowed: false; reason: CompMembershipRefusal } {
  if (input.lookupFailed) {
    return { allowed: false, reason: 'membership_unverifiable' };
  }
  if (decideMembershipEntitlement(input.subscription).entitled) {
    return { allowed: false, reason: 'already_a_member' };
  }
  return { allowed: true };
}

/**
 * Grant one named roadshow attendee a year of membership.
 *
 * Eligibility reuses `baseOfferEligible` — the same predicate that decides who
 * receives the post-event offer pack — so an admin comp cannot reach someone the
 * offer itself would never have been shown to.
 */
export async function compAttendeeMembership(params: {
  signInId: string;
  /** Lump sum to record against the grant. 0 = complimentary. */
  priceAud: number;
  appOrigin: string;
}): Promise<CompMembershipOutcome> {
  const signIn = await prisma.ccwRoadshowSignIn.findUnique({
    where: { id: params.signInId },
    select: {
      email: true,
      fullName: true,
      studentId: true,
      enrollmentId: true,
      provisionStatus: true,
      emailOptIn: true,
      day1CheckedInAt: true,
      day2CheckedInAt: true,
    },
  });

  if (!signIn) return { ok: false, reason: 'not_found' };

  if (!baseOfferEligible(signIn)) {
    return { ok: false, reason: 'not_offer_eligible' };
  }

  // An attendee with no provisioned account cannot already hold a membership, so
  // there is nothing to look up and nothing to clobber.
  if (signIn.studentId) {
    let subscription: { status: string; currentPeriodEnd: Date | null } | null = null;
    let lookupFailed = false;
    try {
      subscription = await prisma.lmsSubscription.findUnique({
        where: { userId: signIn.studentId },
        select: { status: true, currentPeriodEnd: true },
      });
    } catch (error) {
      // No learner identifier in the log line (CWE-532 was paid for once on this
      // code path already).
      console.error('[ccw-comp-membership] membership lookup failed:', error);
      lookupFailed = true;
    }

    const decision = decideCompMembership({ subscription, lookupFailed });
    if (!decision.allowed) return { ok: false, reason: decision.reason };
  }

  const result = await grantYearlyMembership({
    email: signIn.email,
    fullName: signIn.fullName,
    priceAud: params.priceAud,
    appOrigin: params.appOrigin,
  });

  return { ok: true, result };
}

/**
 * Comp a roadshow attendee a year of CARSI membership — an ADMIN action for a
 * named attendee.
 *
 * This is now the ONLY attendee membership path. The self-serve one — a
 * discounted `pro_annual` subscription at A$295 for the first year via a
 * `duration: once` coupon — was removed by the founder on 2026-08-25 without
 * ever going live, because the coupon it needed was never created in Stripe.
 *
 * `grantYearlyMembership` remains a different instrument to any Stripe
 * subscription: it grants membership outright, with no subscription and
 * therefore no renewal. That is why it belongs behind an admin action for a
 * named attendee (a comp, or a rate settled off-platform at the event) and must
 * never be wired to a self-serve path — routing attendees through it would
 * silently give away every future renewal.
 *
 * Deliberately NOT gated on `CCW_ATTENDEE_OFFERS_ENABLED` or the offer's own
 * `live` flag. Both exist for the attendee-facing surface and its external
 * dependency (Rana's Stripe price and coupon). This path touches neither Stripe
 * nor the attendee's screens: it is an authenticated staff action, gated by the
 * admin session and `CCW_ATTENDANCE_ENABLED` at the route.
 */
import { grantYearlyMembership } from '@/lib/admin/admin-yearly-membership';
import {
  claimYearlyMembershipGrant,
  releaseYearlyMembershipClaim,
} from '@/lib/admin/yearly-membership-claim';
import { prisma } from '@/lib/prisma';
import { baseOfferEligible } from '@/lib/server/ccw-attendance/eligibility';
import {
  CHECKOUT_RESERVATION_STATUS,
  decideMembershipEntitlement,
} from '@/lib/server/entitlements';

/**
 * The attendee first-year rate — now always `null`.
 *
 * This used to read A$295 from the `carsi-membership` offer, so the comp form's
 * default could not drift from the self-serve coupon. The founder removed that
 * discount on 2026-08-25 and there is no attendee rate any more, so there is no
 * figure to return and none may be invented: a comp recorded at a rate CARSI
 * never charged misstates what was collected.
 *
 * Kept rather than deleted because callers already depend on the `null`
 * contract and handle it correctly — `attendee_rate` mode takes the 400 path,
 * and the admin form asks the operator to name a price. Comping free or at a
 * named price is unaffected.
 */
export function attendeeMembershipRateAud(): number | null {
  return null;
}

export type CompMembershipRefusal =
  /** No sign-in row with that id. */
  | 'not_found'
  /** Not both days, not opted in, or not provisioned — the offer is attendee-exclusive. */
  | 'not_offer_eligible'
  /** The attendee already holds a live membership; granting would rotate their password for nothing. */
  | 'already_a_member'
  /** Could not prove the attendee is NOT already a member. Refuse rather than guess. */
  | 'membership_unverifiable'
  /** A self-serve checkout is open for this learner right now. */
  | 'checkout_in_progress'
  /** A yearly membership was already granted to this learner. */
  | 'already_comped'
  /** Another admin grant path currently owns this learner's email claim. */
  | 'grant_in_progress';

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

  // An in-flight self-serve checkout is NOT "no membership" for this purpose.
  // `decideMembershipEntitlement` maps `checkout_pending` to `reason: 'none'`
  // deliberately — a reservation must grant no catalogue access — but the cost of
  // being wrong differs here: comping someone who is part-way through paying
  // rotates the password on the account they are using to pay, and the new
  // one exists only in an email that can lag or bounce. Reported by Cursor's
  // security review; it is the #694 hazard reappearing where the self-serve and
  // admin paths meet.
  if (input.subscription?.status?.trim().toLowerCase() === CHECKOUT_RESERVATION_STATUS) {
    return { allowed: false, reason: 'checkout_in_progress' };
  }

  const decision = decideMembershipEntitlement(input.subscription);
  if (decision.entitled) {
    return { allowed: false, reason: 'already_a_member' };
  }

  // `entitled: false` is not the same as "safe to comp". `decideMembershipEntitlement`
  // reports `unknown` for an `incomplete` subscription and for any status it does
  // not recognise — and an unrecognised status is precisely the case where we
  // cannot say whether this person is paying us. Granting there would rotate a
  // possible member's password on a guess, so `unknown` refuses.
  //
  // Note this is deliberately STRICTER than the checkout reservation, which does
  // claim `incomplete` rows. The asymmetry is in the cost of being wrong: there,
  // refusing strands someone who cannot buy; here, refusing merely asks an
  // operator to look, while granting can lock a member out of their account.
  if (decision.reason === 'unknown') {
    return { allowed: false, reason: 'membership_unverifiable' };
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
export async function compAttendeeMembership(
  params: {
    signInId: string;
    /** Lump sum to record against the grant. 0 = complimentary. */
    priceAud: number;
    appOrigin: string;
  },
  now: Date = new Date()
): Promise<CompMembershipOutcome> {
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

  // Resolve the membership by the same identity the grant will act on. The grant
  // does `lmsUser.findUnique({ where: { email } })`, and `baseOfferEligible` is
  // satisfied by `provisionStatus` alone — so `studentId` can be null on a row
  // whose email nonetheless belongs to a real, possibly paying, LMS user. Keying
  // this check on `studentId` would skip the guard for exactly those rows.
  let subscription: { status: string; currentPeriodEnd: Date | null } | null = null;
  let lookupFailed = false;
  try {
    const email = signIn.email.trim().toLowerCase();
    const user = await prisma.lmsUser.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      subscription = await prisma.lmsSubscription.findUnique({
        where: { userId: user.id },
        select: { status: true, currentPeriodEnd: true },
      });
    }
  } catch (error) {
    // No learner identifier in the log line (CWE-532 was paid for once on this
    // code path already).
    console.error('[ccw-comp-membership] membership lookup failed:', error);
    lookupFailed = true;
  }

  const decision = decideCompMembership({ subscription, lookupFailed });
  if (!decision.allowed) return { ok: false, reason: decision.reason };

  // Claim the comp before granting. `membershipCompedAt` is set by a conditional
  // UPDATE on this row (set-if-null), so the DATABASE decides the winner: a
  // second caller — a double-click or a genuinely concurrent request — matches
  // no row and is turned away. That matters because a repeat comp rotates the
  // member's password and reveals it only in the welcome email.
  //
  // This replaced an inference from enrolment `paymentReference` stamps, which
  // was a proxy for a fact nothing recorded and had two holes: a comp granting
  // no NEW enrolments wrote no stamp (`adminGrantEnrollment` returns
  // `already_enrolled` before writing one), and a read cannot arbitrate a race.
  let claimed = false;
  try {
    const { count } = await prisma.ccwRoadshowSignIn.updateMany({
      where: { id: params.signInId, membershipCompedAt: null },
      data: { membershipCompedAt: now },
    });
    claimed = count === 1;
  } catch (error) {
    console.error('[ccw-comp-membership] comp claim failed:', error);
    return { ok: false, reason: 'membership_unverifiable' };
  }

  if (!claimed) return { ok: false, reason: 'already_comped' };

  // The sign-in claim stops duplicate clicks on this route. The email claim
  // also arbitrates against POST /api/admin/yearly-membership, which can act on
  // the same learner through a different table and otherwise rotate the
  // password concurrently.
  let emailClaimed = false;
  try {
    emailClaimed = await claimYearlyMembershipGrant(signIn.email, now);
  } catch (error) {
    console.error('[ccw-comp-membership] email claim failed:', error);
    await releaseCompClaim(params.signInId, now);
    return { ok: false, reason: 'membership_unverifiable' };
  }
  if (!emailClaimed) {
    await releaseCompClaim(params.signInId, now);
    return { ok: false, reason: 'grant_in_progress' };
  }

  try {
    const result = await grantYearlyMembership({
      email: signIn.email,
      fullName: signIn.fullName,
      priceAud: params.priceAud,
      appOrigin: params.appOrigin,
    });
    return { ok: true, result };
  } catch (error) {
    // The grant did not happen, so the claim must not outlive it — otherwise one
    // failed attempt locks the attendee out of ever being comped. Scoped to the
    // exact timestamp this call wrote, so a claim someone else has since taken
    // is never cleared.
    await releaseCompClaim(params.signInId, now);
    await releaseYearlyMembershipClaim(signIn.email, now);
    throw error;
  }
}

async function releaseCompClaim(signInId: string, claimedAt: Date): Promise<void> {
  try {
    await prisma.ccwRoadshowSignIn.updateMany({
      where: { id: signInId, membershipCompedAt: claimedAt },
      data: { membershipCompedAt: null },
    });
  } catch (error) {
    console.error('[ccw-comp-membership] comp claim release failed:', error);
  }
}

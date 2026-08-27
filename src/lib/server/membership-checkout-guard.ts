/**
 * Duplicate-membership guard for `POST /api/lms/subscription/checkout`.
 *
 * Spec §10.4 AC-9 ("one discounted membership per attendee"). The hazard is
 * worse than a stray duplicate row: `LmsSubscription.userId` is `@unique`, so a
 * second Stripe subscription for the same learner COLLAPSES onto the one row
 * when its webhook lands. Stripe goes on billing both subscriptions; CARSI can
 * only see whichever was written last. The learner is charged twice and the
 * second charge is invisible to every screen we have — so the only place to stop
 * it is before a second checkout is ever opened.
 *
 * The direction of failure is the whole point of this module existing.
 * `getEntitlements` fails closed for GRANTING access: no proof of membership →
 * no access. This guard needs the opposite: no proof that a membership is
 * ABSENT → no checkout. Reusing `getEntitlements` here would open a second
 * checkout every time the database was unreachable, which is precisely the
 * moment double-billing is least likely to be noticed. So this module owns its
 * own I/O and its own failure direction, and reuses only
 * `decideMembershipEntitlement` — the live-membership predicate stays stated
 * once, per the WS3 lesson about restating a status list.
 */
import {
  decideMembershipEntitlement,
  type MembershipSubscriptionInput,
} from '@/lib/server/entitlements';

export type MembershipCheckoutBlock = 'already_subscribed' | 'indeterminate';

export type MembershipCheckoutDecision =
  | { allowed: true }
  | { allowed: false; block: MembershipCheckoutBlock };

/**
 * PURE decision core. No I/O, so every branch is testable without a database.
 *
 * `lookupFailed` is passed separately rather than folded into a null
 * subscription: "there is no row" and "we could not find out" are the same
 * value out of Prisma but opposite answers here.
 */
export function decideMembershipCheckout(
  input: {
    subscription: MembershipSubscriptionInput | null;
    lookupFailed: boolean;
  },
  now: Date = new Date(),
): MembershipCheckoutDecision {
  if (input.lookupFailed) {
    return { allowed: false, block: 'indeterminate' };
  }

  // A LIVE membership (active / trialing / inside the past-due grace window) is
  // the one state where a second checkout double-bills. Every other state —
  // lapsed, cancelled, unpaid, an abandoned `incomplete` checkout, or no row at
  // all — is a state the learner is entitled to buy their way out of, so it
  // passes. Deliberately delegated: this must move if the grace policy moves.
  if (decideMembershipEntitlement(input.subscription, now).entitled) {
    return { allowed: false, block: 'already_subscribed' };
  }

  return { allowed: true };
}

/**
 * Data wrapper. FAILS CLOSED on every uncertainty — an unset `DATABASE_URL`, a
 * missing user id, or a throwing lookup all return `indeterminate` rather than
 * letting a second checkout through on a guess.
 */
export async function membershipCheckoutDecisionFor(
  userId: string,
  now: Date = new Date(),
): Promise<MembershipCheckoutDecision> {
  if (!userId?.trim() || !process.env.DATABASE_URL?.trim()) {
    return { allowed: false, block: 'indeterminate' };
  }

  try {
    const { prisma } = await import('@/lib/prisma');
    const subscription = await prisma.lmsSubscription.findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true },
    });
    return decideMembershipCheckout({ subscription, lookupFailed: false }, now);
  } catch (error) {
    // No learner identifier in the log line — the user id is the subject of this
    // lookup, and CWE-532 was already paid for once on this code path (#694).
    console.error('[subscription/checkout] membership lookup failed:', error);
    return { allowed: false, block: 'indeterminate' };
  }
}

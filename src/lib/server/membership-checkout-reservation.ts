/**
 * Per-learner checkout reservation — closes the concurrent-first-purchase race
 * on `POST /api/lms/subscription/checkout`.
 *
 * `membershipCheckoutDecisionFor` stops a learner who ALREADY holds a membership
 * from opening a second checkout. It cannot stop two requests that arrive
 * together from a learner who holds none: both read "no row", both are allowed,
 * both open a Stripe Checkout Session. If the learner pays both, Stripe bills
 * two subscriptions and the second webhook UPSERTS onto the same
 * `LmsSubscription` row (`userId` is `@unique`) — so CARSI keeps one row, Stripe
 * keeps two charges, and nothing downstream can see the difference. Reported by
 * CodeRabbit on #696; the fix has to be atomic, because a read cannot arbitrate
 * between two callers who both read the same "absent".
 *
 * The atomic primitive is the `userId` unique constraint itself. A reservation
 * is a real `LmsSubscription` row written BEFORE Stripe is called, carrying
 * `status: 'checkout_pending'`. Whoever wins the insert owns the checkout; the
 * loser gets `busy`. No new table, no migration, no advisory lock.
 *
 * `checkout_pending` is NOT a Stripe status and must never be treated as one:
 * `decideMembershipEntitlement` maps it to "no membership at all", so a
 * reservation grants nothing, reports nothing, and blocks no future purchase.
 *
 * The two TTLs are deliberately paired, not independently tuned:
 *
 *   session (35 min)  ├────────────────────────┤ Stripe refuses payment after this
 *   reservation (40 min) ├──────────────────────────┤ only now may another take over
 *
 * The Checkout Session is created with `expires_at`, so by the time a
 * reservation is stale enough to steal, the session it was protecting can no
 * longer be paid. Without that pairing a stale-reservation takeover would hand
 * out a second session while the first was still payable — reintroducing the
 * very duplicate this module exists to prevent. Change one, change the other.
 */
import { prisma } from '@/lib/prisma';
// Defined in `entitlements` so that module — which avoids importing prisma at
// module scope — can recognise the marker without pulling this one in.
// Deliberately NOT one of Stripe's subscription statuses.
export { CHECKOUT_RESERVATION_STATUS } from '@/lib/server/entitlements';
import { CHECKOUT_RESERVATION_STATUS } from '@/lib/server/entitlements';

/**
 * How long the Stripe Checkout Session stays payable. Stripe's floor is 30
 * minutes from creation; 35 leaves headroom for request latency so a session is
 * never rejected for being a few seconds under the limit.
 */
export const CHECKOUT_SESSION_TTL_MS = 35 * 60 * 1000;

/**
 * How long a reservation blocks other checkouts. MUST exceed
 * `CHECKOUT_SESSION_TTL_MS` — see the module note.
 */
export const CHECKOUT_RESERVATION_TTL_MS = 40 * 60 * 1000;

export type ReservationOutcome =
  /** This request owns the checkout. */
  | 'reserved'
  /** Someone else holds a live reservation, or a real membership appeared. */
  | 'busy'
  /** The database could not answer. Fail closed: open no checkout. */
  | 'unavailable';

/** Stripe wants `expires_at` in whole epoch SECONDS, not milliseconds. */
export function checkoutSessionExpiresAt(now: Date = new Date()): number {
  return Math.floor((now.getTime() + CHECKOUT_SESSION_TTL_MS) / 1000);
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Claim the right to open a checkout for this learner.
 *
 * Fails closed on every uncertainty — a lookup that throws returns
 * `unavailable`, never `reserved`.
 */
export async function reserveMembershipCheckout(
  userId: string,
  now: Date = new Date(),
): Promise<ReservationOutcome> {
  if (!userId?.trim() || !process.env.DATABASE_URL?.trim()) {
    return 'unavailable';
  }

  try {
    await prisma.lmsSubscription.create({
      data: { userId, status: CHECKOUT_RESERVATION_STATUS },
    });
    return 'reserved';
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      console.error('[subscription/checkout] reservation insert failed:', error);
      return 'unavailable';
    }
  }

  // A row already exists. It may be a real membership (the guard's job, and a
  // webhook may have landed since it ran) or another request's reservation —
  // both mean "not ours". Only a reservation past its TTL may be taken over.
  //
  // The takeover is a single conditional UPDATE, so it is the database, not this
  // process, that decides the winner: under READ COMMITTED a second caller
  // blocks on the row lock, then re-evaluates `updatedAt` against the value the
  // winner just wrote and matches nothing.
  try {
    const staleBefore = new Date(now.getTime() - CHECKOUT_RESERVATION_TTL_MS);
    const { count } = await prisma.lmsSubscription.updateMany({
      where: {
        userId,
        status: CHECKOUT_RESERVATION_STATUS,
        updatedAt: { lt: staleBefore },
      },
      // Rewriting the same status is the point: `@updatedAt` restamps the row,
      // which is what makes this reservation fresh and the next one wait.
      data: { status: CHECKOUT_RESERVATION_STATUS, statusEventAt: null },
    });
    return count === 1 ? 'reserved' : 'busy';
  } catch (error) {
    console.error('[subscription/checkout] reservation takeover failed:', error);
    return 'unavailable';
  }
}

/**
 * Give the reservation back when the checkout could not be opened, so the
 * learner can retry immediately instead of waiting out the TTL.
 *
 * Scoped to `status: CHECKOUT_RESERVATION_STATUS`, so it can never delete a real
 * membership — including one a webhook wrote in between. Best effort: a failure
 * to release is logged and swallowed, because the TTL already bounds the damage
 * and the caller is usually already handling an error.
 */
export async function releaseMembershipCheckout(userId: string): Promise<void> {
  if (!userId?.trim() || !process.env.DATABASE_URL?.trim()) return;

  try {
    await prisma.lmsSubscription.deleteMany({
      where: { userId, status: CHECKOUT_RESERVATION_STATUS },
    });
  } catch (error) {
    console.error('[subscription/checkout] reservation release failed:', error);
  }
}

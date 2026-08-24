/**
 * Per-payer checkout reservations — close the concurrent-first-purchase race on
 * all three subscription checkout routes (individual, teams, org).
 *
 * The duplicate-membership guard stops a payer who ALREADY holds a live
 * subscription from opening a second checkout. It cannot stop two requests that
 * arrive together from a payer who holds none: both read "no row", both are
 * allowed, both open a Stripe Checkout Session. Pay both and Stripe bills twice
 * while the second webhook upserts onto the same row (`userId` / `teamId` are
 * `@unique`) — one row here, two charges there, and nothing downstream able to
 * see the difference. Reported by CodeRabbit on #696.
 *
 * A read cannot arbitrate between two callers who read the same absence, so the
 * atomic primitive is the unique constraint itself: a reservation is a real
 * subscription row written BEFORE Stripe is called, carrying
 * `status: 'checkout_pending'`. Whoever wins the insert owns the checkout; the
 * loser gets `busy`. No new table, no migration, no advisory lock.
 *
 * `checkout_pending` is NOT a Stripe status. `decideMembershipEntitlement` maps
 * it to "no membership at all", and the teams and org entitlement paths reuse
 * that same decision verbatim — so one branch covers all three products.
 *
 * The two TTLs are deliberately paired, not independently tuned:
 *
 *   session (35 min)     ├────────────────────────┤ Stripe refuses payment after this
 *   reservation (40 min) ├──────────────────────────┤ only now may another take over
 *
 * The Checkout Session is created with `expires_at`, so by the time a
 * reservation is stale enough to steal, the session it was protecting can no
 * longer be paid. Without that pairing a stale-reservation takeover would hand
 * out a second session while the first was still payable — reintroducing the
 * very duplicate this module exists to prevent. Change one, change the other.
 */
import { prisma } from '@/lib/prisma';
import { CHECKOUT_RESERVATION_STATUS, PAST_DUE_GRACE_DAYS } from '@/lib/server/entitlements';

export { CHECKOUT_RESERVATION_STATUS };

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
  /** A live subscription or another request's fresh reservation holds the row. */
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
 * Which existing rows a new checkout may claim.
 *
 * The insert only fails when a row already exists, and that row is one of three
 * things: a LIVE subscription (never claimable — that is the duplicate we are
 * preventing), another request's FRESH reservation (not yet claimable), or a
 * row the payer is entitled to buy their way out of — a stale reservation, a
 * cancelled/unpaid/expired membership, an abandoned `incomplete` checkout, or a
 * past-due one beyond its grace window.
 *
 * That last group matters more than it looks: without it a learner whose
 * membership was ever cancelled could NEVER re-subscribe, because their old row
 * would fail every insert and match no takeover. The duplicate-membership guard
 * deliberately lets those states through, so the reservation must too, or the
 * two disagree and the guard's permission is meaningless.
 *
 * The liveness rule is expressed here as a query rather than delegated to
 * `decideMembershipEntitlement`, because it has to run INSIDE the atomic UPDATE
 * — a read-then-decide would reopen the race this module exists to close. It is
 * written as an allow-list of provably-not-live states (never a deny-list of
 * live ones), so an unrecognised or oddly-cased status is left alone rather than
 * stolen: unknown means refuse, not proceed.
 */
function claimableWhere(now: Date) {
  const staleBefore = new Date(now.getTime() - CHECKOUT_RESERVATION_TTL_MS);
  const graceCutoff = new Date(now.getTime() - PAST_DUE_GRACE_DAYS * 24 * 60 * 60 * 1000);

  return {
    OR: [
      // Another checkout that was started and abandoned long enough ago that its
      // Stripe session has expired.
      { status: CHECKOUT_RESERVATION_STATUS, updatedAt: { lt: staleBefore } },
      // Terminal states, plus a checkout that was never paid for.
      { status: { in: ['canceled', 'unpaid', 'incomplete_expired', 'incomplete'] } },
      // Past due with no known period end cannot be proven inside grace, and
      // `decideMembershipEntitlement` already treats it as lapsed.
      { status: 'past_due', currentPeriodEnd: null },
      { status: 'past_due', currentPeriodEnd: { lt: graceCutoff } },
    ],
  };
}

/**
 * What a takeover must write to detach the row from the subscription it used to
 * describe. Reported by Cursor Bugbot on #699, and correct: claiming a LAPSED
 * row (rather than only a stale reservation) means the row can still carry the
 * old `stripeSubscriptionId`, and two webhook paths would then quietly undo the
 * reservation.
 *
 *  - `markSubscriptionStatusBySubscriptionId` updates by `stripeSubscriptionId`
 *    with no status filter and no ordering guard, so ANY late event for the old
 *    subscription overwrites `checkout_pending`. Nulling the id severs that.
 *  - `upsertSubscription` discards a snapshot only when the stored
 *    `statusEventAt` is NEWER than the event. Stamping it with the takeover time
 *    makes every event predating this claim stale, while the new subscription's
 *    own events — which are necessarily later — still apply.
 *
 * The earlier `statusEventAt: null` was actively wrong here: "always
 * overwritable" is the right posture for a webhook write and the wrong one for a
 * claim that has to survive until checkout completes.
 *
 * Cost, accepted: a refund or dispute event arriving later for the OLD
 * subscription can no longer resolve this row by id. That row was already
 * terminal — which is why it was claimable — so the revocation it would trigger
 * is a no-op in practice.
 */
function severOldSubscription(now: Date) {
  return { stripeSubscriptionId: null, statusEventAt: now };
}

/**
 * The shared claim algorithm. Callers supply typed Prisma calls for their own
 * table, so the three products share this logic without any casting.
 */
async function claimCheckout(
  ops: {
    insert: () => Promise<unknown>;
    takeOver: (claimable: ReturnType<typeof claimableWhere>) => Promise<number>;
  },
  now: Date,
): Promise<ReservationOutcome> {
  try {
    await ops.insert();
    return 'reserved';
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      console.error('[checkout-reservation] insert failed:', error);
      return 'unavailable';
    }
  }

  // A row already exists. The takeover is a single conditional UPDATE, so it is
  // the database — not this process — that decides the winner: under READ
  // COMMITTED a second caller blocks on the row lock, then re-evaluates the
  // WHERE against what the winner just wrote and matches nothing.
  try {
    const count = await ops.takeOver(claimableWhere(now));
    return count === 1 ? 'reserved' : 'busy';
  } catch (error) {
    console.error('[checkout-reservation] takeover failed:', error);
    return 'unavailable';
  }
}

function unusable(id: string): boolean {
  return !id?.trim() || !process.env.DATABASE_URL?.trim();
}

/* ------------------------------------------------------------------ */
/* Individual membership — keyed on LmsSubscription.userId            */
/* ------------------------------------------------------------------ */

export async function reserveMembershipCheckout(
  userId: string,
  now: Date = new Date(),
): Promise<ReservationOutcome> {
  if (unusable(userId)) return 'unavailable';

  return claimCheckout(
    {
      insert: () =>
        prisma.lmsSubscription.create({
          data: { userId, status: CHECKOUT_RESERVATION_STATUS, statusEventAt: now },
        }),
      takeOver: async (claimable) => {
        const { count } = await prisma.lmsSubscription.updateMany({
          where: { userId, ...claimable },
          data: { status: CHECKOUT_RESERVATION_STATUS, ...severOldSubscription(now) },
        });
        return count;
      },
    },
    now,
  );
}

export async function releaseMembershipCheckout(userId: string): Promise<void> {
  if (unusable(userId)) return;
  try {
    await prisma.lmsSubscription.deleteMany({
      where: { userId, status: CHECKOUT_RESERVATION_STATUS },
    });
  } catch (error) {
    console.error('[checkout-reservation] release failed:', error);
  }
}

/* ------------------------------------------------------------------ */
/* Teams seat subscription — keyed on LmsTeamSubscription.teamId      */
/* ------------------------------------------------------------------ */

export async function reserveTeamCheckout(
  teamId: string,
  now: Date = new Date(),
): Promise<ReservationOutcome> {
  if (unusable(teamId)) return 'unavailable';

  return claimCheckout(
    {
      insert: () =>
        prisma.lmsTeamSubscription.create({
          // seatLimit 0 until Stripe confirms the paid quantity — a reservation
          // must never hand out seats.
          data: {
            teamId,
            status: CHECKOUT_RESERVATION_STATUS,
            seatLimit: 0,
            statusEventAt: now,
          },
        }),
      takeOver: async (claimable) => {
        const { count } = await prisma.lmsTeamSubscription.updateMany({
          where: { teamId, ...claimable },
          data: {
            status: CHECKOUT_RESERVATION_STATUS,
            seatLimit: 0,
            ...severOldSubscription(now),
          },
        });
        return count;
      },
    },
    now,
  );
}

export async function releaseTeamCheckout(teamId: string): Promise<void> {
  if (unusable(teamId)) return;
  try {
    await prisma.lmsTeamSubscription.deleteMany({
      where: { teamId, status: CHECKOUT_RESERVATION_STATUS },
    });
  } catch (error) {
    console.error('[checkout-reservation] team release failed:', error);
  }
}

/* ------------------------------------------------------------------ */
/* Org monthly subscription — keyed on LmsOrgSubscription.teamId      */
/* ------------------------------------------------------------------ */

export async function reserveOrgCheckout(
  params: {
    teamId: string;
    organisationName: string;
    contactEmail: string;
    entitledCategory?: string;
  },
  now: Date = new Date(),
): Promise<ReservationOutcome> {
  if (unusable(params.teamId)) return 'unavailable';

  const details = {
    organisationName: params.organisationName.slice(0, 255),
    contactEmail: params.contactEmail.trim().toLowerCase(),
    ...(params.entitledCategory ? { entitledCategory: params.entitledCategory } : {}),
  };

  return claimCheckout(
    {
      insert: () =>
        prisma.lmsOrgSubscription.create({
          data: {
            teamId: params.teamId,
            status: CHECKOUT_RESERVATION_STATUS,
            seatModel: 'unlimited',
            stripeSubscriptionId: null,
            statusEventAt: now,
            ...details,
          },
        }),
      takeOver: async (claimable) => {
        const { count } = await prisma.lmsOrgSubscription.updateMany({
          where: { teamId: params.teamId, ...claimable },
          data: {
            status: CHECKOUT_RESERVATION_STATUS,
            ...severOldSubscription(now),
            ...details,
          },
        });
        return count;
      },
    },
    now,
  );
}

export async function releaseOrgCheckout(teamId: string): Promise<void> {
  if (unusable(teamId)) return;
  try {
    await prisma.lmsOrgSubscription.deleteMany({
      where: { teamId, status: CHECKOUT_RESERVATION_STATUS },
    });
  } catch (error) {
    console.error('[checkout-reservation] org release failed:', error);
  }
}

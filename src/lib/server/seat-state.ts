import type { Prisma } from '@/generated/prisma/client';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { isStripeCheckoutPaymentReference } from '@/lib/lms/course-prerequisites';
import { isUniqueConstraintError } from '@/lib/server/db-errors';
import { runSerializable } from '@/lib/server/db-tx';
import { isRevokedStatus } from '@/lib/server/enrollment-access';
import {
  issuePreparedEnrolment,
  prepareEnrolment,
  type EnrollResult,
  type PreparedEnrolment,
} from '@/lib/server/enrollment-service';
import { sessionClaimsForUserId } from '@/lib/server/lms-auth';
import {
  reactivateDisputeWonEnrollmentsByPaymentReference,
  revokeEnrollmentsByPaymentReference,
} from '@/lib/server/stripe-revocation';
import { readTeamCourseSlug } from '@/lib/server/team-course-slug-db';
import {
  clearDisputedCheckoutReversal,
  isCheckoutPaymentReversed,
  PAYMENT_REVERSED,
  recordCheckoutPaymentReversed,
  type PaymentReversalReason,
} from '@/lib/server/payment-integrity-ledger';
import { countTeamPaidSeatsUsed, teamPaidSeatHolders } from '@/lib/server/team-seat-refund';

/**
 * GP-759, Phill's ruling 23/11/2026 ("Fix the design once"): the ONE owner of session and team
 * seat state.
 *
 * Session state is whether a Stripe checkout session still gives access (its reversal marker and
 * the enrolments it paid for). Seat state is a team's seat blocks, its seat limit and the member
 * seats (`team:<teamId>` enrolments) they pay for. Every grant (checkout fulfilment, seat block
 * provisioning, token and direct invites) and every reversal (refund, chargeback, dispute won)
 * runs inside `runSeatStateStep`: one SERIALIZABLE transaction, retried on a serialisation
 * conflict, in which the check and the write happen together. Two writers that read and write
 * the same rows cannot both commit, so a last seat is taken once and a refund either lands
 * before a fulfilment (which then sees the marker) or after it (and takes the seats back).
 *
 * The writers below take a `SeatTx`, which only `runSeatStateStep` hands out. Nothing else writes
 * these rows: `enrollStudentInCourse` refuses `cs_*` and `team:*` references, and
 * `seat-state-owner.test.ts` fails if another file writes a seat block or a reversal marker, or
 * calls a revocation writer. Slow or side-effecting work (user lookup, password hash, course and
 * prerequisite reads) is done before the step, because the step may be retried.
 *
 * Teams subscription seats (`lmsTeamSubscription.seatLimit`, expand-seats) are not changed here.
 * A future seat-limit write can call in with `runSeatStateStep` and read
 * `teamHasRoomForNewMember` on the same `SeatTx`.
 */

declare const seatStep: unique symbol;
/** A transaction client inside the seat step. Only `runSeatStateStep` makes one. */
export type SeatTx = Prisma.TransactionClient & { readonly [seatStep]: true };

const MAX_UNIQUE_CLASH_RERUNS = 2;

/**
 * Run `fn` as the seat step. A serialisation conflict is retried by `runSerializable`. A
 * unique-key clash (for example the webhook and the success page fulfilling the same session at
 * once) has aborted the transaction, so the whole step is run again: the rerun reads the row the
 * other writer committed and answers as a duplicate ('already_enrolled'), as the shared writer
 * does outside a transaction.
 */
export async function runSeatStateStep<T>(fn: (tx: SeatTx) => Promise<T>): Promise<T> {
  for (let rerun = 0; ; rerun += 1) {
    try {
      return await runSerializable((tx) => fn(tx as SeatTx));
    } catch (error) {
      if (rerun < MAX_UNIQUE_CLASH_RERUNS && isUniqueConstraintError(error)) continue;
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Session reversal markers: stored by payment-integrity-ledger.ts (`payment-reversed:<cs>` in
// `stripe_webhook_events`); written and read only here, on the step's transaction.
// ---------------------------------------------------------------------------------------------

export { PAYMENT_REVERSED, PAYMENT_REVERSED_BODY } from '@/lib/server/payment-integrity-ledger';

/** Whether this checkout session's payment is reversed (read on the step's transaction). */
export function isCheckoutSessionReversed(tx: SeatTx, checkoutSessionId: string): Promise<boolean> {
  return isCheckoutPaymentReversed(tx, checkoutSessionId);
}

// ---------------------------------------------------------------------------------------------
// Seat checks (read on the step's transaction).
// ---------------------------------------------------------------------------------------------

/**
 * Whether a paid seat in this course is free for `userId` in a course-purchase team: seats are
 * the team's blocks for the course, holders are `teamPaidSeatHolders` (not counting `userId`). A
 * team with no blocks for the course (older teams) is left to the team seat limit.
 */
export async function courseSeatIsFree(
  tx: SeatTx,
  teamId: string,
  courseSlug: string,
  userId: string,
): Promise<boolean> {
  const slug = courseSlug.trim().toLowerCase();
  const blocks = (
    await tx.lmsTeamCoursePurchase.findMany({ where: { teamId }, select: { courseSlug: true, seatLimit: true } })
  ).filter((p) => p.courseSlug.trim().toLowerCase() === slug);
  if (blocks.length === 0) return true;
  const courseSeats = blocks.reduce((sum, p) => sum + p.seatLimit, 0);
  if (courseSeats <= 0) return false;
  const course = await tx.lmsCourse.findUnique({ where: { slug }, select: { id: true } });
  if (!course) return true; // the enrolment writer reports COURSE_NOT_FOUND
  const holders = (await teamPaidSeatHolders(tx, teamId, course.id, slug)).filter((h) => h.studentId !== userId);
  return holders.length < courseSeats;
}

/**
 * Whether the team has room for one more member against its seat limit: the Teams subscription
 * limit when it has one, otherwise the team's own limit, counted by paid seats for a
 * course-purchase team (`countTeamPaidSeatsUsed`) and by members for other teams.
 */
export async function teamHasRoomForNewMember(tx: SeatTx, teamId: string): Promise<boolean> {
  const team = await tx.lmsTeam.findUnique({ where: { id: teamId }, select: { seatLimit: true, bundleTier: true } });
  if (!team) return false;
  const teamSub =
    team.bundleTier === 'teams_subscription'
      ? await tx.lmsTeamSubscription.findUnique({ where: { teamId } })
      : null;
  const limit = teamSub ? teamSub.seatLimit : team.seatLimit;
  const paidSeatsUsed = teamSub ? null : await countTeamPaidSeatsUsed(tx, teamId);
  const used = paidSeatsUsed ?? (await tx.lmsTeamMember.count({ where: { teamId } }));
  return used < limit;
}

// ---------------------------------------------------------------------------------------------
// Grants.
// ---------------------------------------------------------------------------------------------

/** A member seat in a team's purchased course, made ready before the step. */
export type TeamMemberSeat = { teamId: string; slug: string; enrolment: PreparedEnrolment };

/** The reading half of a member seat. Null when the team has no course or the course is gone. */
export async function prepareTeamMemberSeat(
  userId: string,
  teamId: string,
  slug?: string | null,
): Promise<TeamMemberSeat | null> {
  const courseSlug = slug ?? (await readTeamCourseSlug(teamId));
  if (!courseSlug) return null;
  const claims = await sessionClaimsForUserId(userId);
  if (!claims) return null;
  try {
    // Without the prerequisite the seat is issued LOCKED, not skipped (02/11/2026).
    const enrolment = await prepareEnrolment(claims, courseSlug, `team:${teamId}`, { onPrerequisiteNotMet: 'lock' });
    return { teamId, slug: courseSlug, enrolment };
  } catch (e) {
    if (e instanceof Error && e.message === 'COURSE_NOT_FOUND') return null;
    throw e;
  }
}

/**
 * Whether the member already holds this course through a live enrolment (any payment). Such a
 * member needs no seat and uses none (Phill's ruling 22/11/2026: only seats the team paid for).
 */
export async function memberHoldsCourse(tx: SeatTx, seat: TeamMemberSeat): Promise<boolean> {
  const held = await tx.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId: seat.enrolment.studentId, courseId: seat.enrolment.courseId } },
    select: { status: true },
  });
  return held !== null && !isRevokedStatus(held.status);
}

/**
 * Issue a member seat if the team has a paid seat free for that member. A member who already
 * holds the course (paid for elsewhere, Phill's ruling 22/11/2026) needs no seat and uses none.
 */
export async function issueTeamMemberSeat(
  tx: SeatTx,
  seat: TeamMemberSeat,
): Promise<'issued' | 'no_seat' | 'already_enrolled'> {
  if (seat.enrolment.paymentReference !== `team:${seat.teamId}`) throw new Error('TEAM_SEAT_REFERENCE_MISMATCH');
  if (await memberHoldsCourse(tx, seat)) return 'already_enrolled';
  if (!(await courseSeatIsFree(tx, seat.teamId, seat.slug, seat.enrolment.studentId))) return 'no_seat';
  await issuePreparedEnrolment(tx, seat.enrolment);
  return 'issued';
}

/** Run a member seat on its own step (no other write with it). */
export async function enrollTeamMemberInPurchasedCourse(userId: string, teamId: string): Promise<void> {
  const seat = await prepareTeamMemberSeat(userId, teamId);
  if (!seat) return;
  const outcome = await runSeatStateStep((tx) => issueTeamMemberSeat(tx, seat));
  if (outcome === 'no_seat') {
    console.warn('[seat-state] no paid seat left for member', { teamId, userId });
  }
}

const COURSE_BUNDLE_TIER = 'course_purchase';

export type TeamSeatBlock = {
  ownerId: string;
  courseSlug: string;
  seatCount: number;
  paymentReference: string;
  /** Slug for a new team, chosen before the step (the step may be retried). */
  newTeamSlug: string;
};

/** Write the team's seat block for a paid team checkout (de-duplicated by payment reference). */
async function writeTeamSeatBlock(
  tx: SeatTx,
  block: TeamSeatBlock,
): Promise<{ teamId: string; teamSlug: string } | 'already_on_team'> {
  const slug = block.courseSlug.trim().toLowerCase();
  const ref = block.paymentReference.trim();
  const existingMembership = await tx.lmsTeamMember.findFirst({
    where: { userId: block.ownerId },
    include: { team: true },
  });

  let team: { id: string; slug: string };
  if (existingMembership) {
    // The buyer is a member of someone else's team: no block. The buyer's own enrolment, written
    // earlier in this step, still commits (the caller reports ALREADY_ON_TEAM after the step).
    if (existingMembership.team.ownerId !== block.ownerId) return 'already_on_team';
    team = existingMembership.team;
  } else {
    team = await tx.lmsTeam.create({
      data: {
        name: 'My team',
        slug: block.newTeamSlug,
        ownerId: block.ownerId,
        bundleTier: COURSE_BUNDLE_TIER,
        seatLimit: 0,
        members: { create: { userId: block.ownerId, role: 'owner' } },
      },
      select: { id: true, slug: true },
    });
  }

  // A replayed fulfilment of a session already on record changes nothing (a refunded block keeps
  // its row at 0 seats so it cannot come back).
  const recorded = await tx.lmsTeamCoursePurchase.findFirst({ where: { paymentReference: ref } });
  if (recorded) return { teamId: team.id, teamSlug: team.slug };

  await tx.lmsTeamCoursePurchase.create({
    data: { teamId: team.id, courseSlug: slug, seatLimit: block.seatCount, paymentReference: ref },
  });
  const total = await tx.lmsTeamCoursePurchase.aggregate({ where: { teamId: team.id }, _sum: { seatLimit: true } });
  await tx.lmsTeam.update({
    where: { id: team.id },
    data: { seatLimit: total._sum.seatLimit ?? 0, bundleTier: COURSE_BUNDLE_TIER, courseSlug: slug },
  });
  return { teamId: team.id, teamSlug: team.slug };
}

/**
 * Fulfil a paid checkout: the buyer's enrolment and, for a team checkout, its seat block, in one
 * step that first checks the session was not reversed. Throws `PAYMENT_REVERSED` when it was.
 */
export function fulfilCheckoutInStep(
  enrolment: PreparedEnrolment,
  block: TeamSeatBlock | null,
): Promise<{ result: EnrollResult; team: { teamId: string; teamSlug: string } | 'already_on_team' | null }> {
  return runSeatStateStep(async (tx) => {
    const result = await issueCheckoutEnrolment(tx, enrolment);
    if (!block) return { result, team: null };
    // The buyer may hold the course through another payment ('already_enrolled' issued nothing),
    // so check the session again before its seats are provisioned.
    if (isStripeCheckoutPaymentReference(block.paymentReference) && (await isCheckoutSessionReversed(tx, block.paymentReference))) {
      throw new Error(PAYMENT_REVERSED);
    }
    return { result, team: await writeTeamSeatBlock(tx, block) };
  });
}

/**
 * A checkout enrolment: a reversed session never issues or reactivates access, whether the
 * reversal is on the row (revoked for this very session) or only in the marker (it landed before
 * any row existed). A new paid session still reactivates a revoked row (re-purchase).
 */
async function issueCheckoutEnrolment(tx: SeatTx, enrolment: PreparedEnrolment): Promise<EnrollResult> {
  const ref = enrolment.paymentReference;
  if (isStripeCheckoutPaymentReference(ref)) {
    const existing = await tx.lmsEnrollment.findUnique({
      where: { studentId_courseId: { studentId: enrolment.studentId, courseId: enrolment.courseId } },
      select: { status: true, paymentReference: true, revokedReason: true },
    });
    if (!existing || isRevokedStatus(existing.status)) {
      const revokedForThisPayment =
        existing !== null &&
        existing.paymentReference === ref &&
        (existing.revokedReason === 'refunded' || existing.revokedReason === 'disputed');
      if (revokedForThisPayment || (await isCheckoutSessionReversed(tx, ref))) {
        throw new Error(PAYMENT_REVERSED);
      }
    }
  }
  return issuePreparedEnrolment(tx, enrolment);
}

/** Prepare the buyer side of a checkout before the step (see `fulfilCheckoutInStep`). */
export function prepareCheckoutEnrolment(
  claims: SessionClaims,
  courseSlug: string,
  paymentReference: string,
  purchaseMode: 'self' | 'team',
): Promise<PreparedEnrolment> {
  // A team buyer need not hold the course prerequisite (founder decision 02/11/2026): their own
  // seat is issued LOCKED (prerequisiteGated) until they complete it, like any seat.
  return prepareEnrolment(claims, courseSlug, paymentReference, {
    onPrerequisiteNotMet: purchaseMode === 'team' ? 'lock' : 'refuse',
  });
}

// ---------------------------------------------------------------------------------------------
// Reversals.
// ---------------------------------------------------------------------------------------------

/**
 * A full refund of a team seat checkout takes those seats back, per refunded block:
 *  1. the block's `seatLimit` becomes 0 (the row is kept, so a replay cannot re-add the seats);
 *  2. the team's `seatLimit` becomes the sum of its remaining blocks;
 *  3. seats the remaining blocks no longer cover are revoked, newest member seat first, counting
 *     only seats this team paid for (`teamPaidSeatHolders`) and revoking only `team:<teamId>`
 *     seats. Membership is not removed; revoked rows keep `revokedReason = 'refunded'`.
 */
async function revokeSeatBlocksForRefund(
  tx: SeatTx,
  ref: string,
  eventTimestamp: Date,
): Promise<{ blocks: number; seatsRevoked: number }> {
  const blocks = await tx.lmsTeamCoursePurchase.findMany({
    where: { paymentReference: ref, seatLimit: { gt: 0 } },
    select: { id: true, teamId: true, courseSlug: true, seatLimit: true },
  });

  let seatsRevoked = 0;
  for (const block of blocks) {
    await tx.lmsTeamCoursePurchase.update({ where: { id: block.id }, data: { seatLimit: 0 } });
    const remaining = await tx.lmsTeamCoursePurchase.findMany({
      where: { teamId: block.teamId },
      select: { courseSlug: true, seatLimit: true },
    });
    const slug = block.courseSlug.trim().toLowerCase();
    const teamSeats = remaining.reduce((sum, p) => sum + p.seatLimit, 0);
    const courseSeats = remaining
      .filter((p) => p.courseSlug.trim().toLowerCase() === slug)
      .reduce((sum, p) => sum + p.seatLimit, 0);
    await tx.lmsTeam.update({ where: { id: block.teamId }, data: { seatLimit: teamSeats } });

    console.warn('[seat-state] seat block refunded', {
      teamId: block.teamId,
      courseSlug: block.courseSlug,
      seatsInBlock: block.seatLimit,
      paymentReference: ref,
    });

    const course = await tx.lmsCourse.findUnique({ where: { slug }, select: { id: true } });
    if (!course) continue;
    const holders = await teamPaidSeatHolders(tx, block.teamId, course.id, slug);
    const excess = holders.length - courseSeats;
    if (excess <= 0) continue;
    const toRevoke = holders
      .filter((h) => h.paymentReference === `team:${block.teamId}`)
      .slice(0, excess)
      .map((h) => h.id);
    if (toRevoke.length === 0) continue;
    const result = await tx.lmsEnrollment.updateMany({
      where: { id: { in: toRevoke } },
      data: {
        status: 'revoked',
        revokedReason: 'refunded',
        certificateIssuedAt: null,
        completedAt: null,
        statusEventAt: eventTimestamp,
      },
    });
    seatsRevoked += result.count;
  }
  return { blocks: blocks.length, seatsRevoked };
}

/**
 * A refund or chargeback of a checkout session: record the reversal, revoke the enrolments it
 * paid for, and for a full refund take its team seats back, in one step.
 */
export function applyCheckoutPaymentReversal(
  checkoutSessionId: string,
  reason: PaymentReversalReason,
  eventTimestamp: Date,
): Promise<{ revoked: number; blocks: number; seatsRevoked: number }> {
  const ref = checkoutSessionId.trim();
  return runSeatStateStep(async (tx) => {
    await recordCheckoutPaymentReversed(tx, ref, reason, eventTimestamp);
    const { revoked } = await revokeEnrollmentsByPaymentReference(ref, reason, eventTimestamp, tx);
    const seats =
      reason === 'refunded' ? await revokeSeatBlocksForRefund(tx, ref, eventTimestamp) : { blocks: 0, seatsRevoked: 0 };
    return { revoked, ...seats };
  });
}

/** A dispute won by the merchant: lift the dispute marker and restore the access it revoked. */
export function applyDisputeWon(checkoutSessionId: string, eventTimestamp: Date): Promise<{ reactivated: number }> {
  const ref = checkoutSessionId.trim();
  return runSeatStateStep(async (tx) => {
    await clearDisputedCheckoutReversal(tx, ref, eventTimestamp);
    return reactivateDisputeWonEnrollmentsByPaymentReference(ref, eventTimestamp, tx);
  });
}

import { prisma } from '@/lib/prisma';

type SeatDb = Pick<typeof prisma, 'lmsTeamCoursePurchase' | 'lmsEnrollment'>;

/**
 * GP-759 (c), Phill's ruling 22/11/2026: "Only seats that team paid for." The ONE owner of what
 * counts as a seat this team paid for in a course, used by the refund rule and the seat check:
 * live (active or completed) enrolments in the course whose payment reference is the team's own
 * seat reference (`team:<teamId>`) or the checkout of one of the team's seat blocks for that
 * course (the buyer's own seat). A member whose access was paid for elsewhere (another team, or
 * their own purchase) is not counted and is never revoked by this team's refund. Newest first.
 */
export async function teamPaidSeatHolders(
  db: SeatDb,
  teamId: string,
  courseId: string,
  courseSlug: string,
): Promise<Array<{ id: string; studentId: string; paymentReference: string | null }>> {
  const slug = courseSlug.trim().toLowerCase();
  const blockRefs = (
    await db.lmsTeamCoursePurchase.findMany({
      where: { teamId },
      select: { courseSlug: true, paymentReference: true },
    })
  )
    .filter((p) => p.courseSlug.trim().toLowerCase() === slug && p.paymentReference)
    .map((p) => p.paymentReference as string);
  return db.lmsEnrollment.findMany({
    where: {
      courseId,
      status: { in: ['active', 'completed'] },
      paymentReference: { in: [`team:${teamId}`, ...blockRefs] },
    },
    orderBy: { enrolledAt: 'desc' },
    select: { id: true, studentId: true, paymentReference: true },
  });
}

/**
 * GP-759 (c): a full refund of a team seat checkout takes those seats back.
 *
 * Before this, `charge.refunded` revoked only the buyer's own enrolment (keyed by the checkout
 * session). The seat block (`lms_team_course_purchases`, one row per team checkout) and every
 * member seat (`team:<teamId>` enrolments) stayed live.
 *
 * Rule, applied per refunded block, in one transaction:
 *  1. The block's `seatLimit` becomes 0. The row is kept (with its payment reference) so a
 *     replayed fulfilment of the same session is de-duplicated and cannot re-add the seats.
 *  2. The team's `seatLimit` becomes the sum of its remaining blocks, so no new member can join
 *     on the refunded seats.
 *  3. Seats the remaining blocks for that course no longer cover are revoked, newest member
 *     seat first (latest `enrolledAt`). Only seats this team paid for are counted
 *     (`teamPaidSeatHolders`), and only `team:<teamId>` seats are revoked here; the buyer's
 *     own enrolment is revoked by its checkout session in the caller. Team membership is not
 *     removed, and revoked rows keep their history (`revokedReason = 'refunded'`).
 *
 * Idempotent: a block already at 0 is skipped. Refunds only: a chargeback revokes the buyer's
 * own seat as before, and the seat block follows if the chargeback is later refunded.
 */
export async function revokeTeamSeatBlocksForRefund(
  paymentReference: string,
  eventTimestamp: Date,
): Promise<{ blocks: number; seatsRevoked: number }> {
  const ref = paymentReference.trim();
  if (!ref) return { blocks: 0, seatsRevoked: 0 };

  const blocks = await prisma.lmsTeamCoursePurchase.findMany({
    where: { paymentReference: ref, seatLimit: { gt: 0 } },
    select: { id: true, teamId: true, courseSlug: true, seatLimit: true },
  });

  let seatsRevoked = 0;
  for (const block of blocks) {
    seatsRevoked += await prisma.$transaction(async (tx) => {
      await tx.lmsTeamCoursePurchase.update({
        where: { id: block.id },
        data: { seatLimit: 0 },
      });

      const remaining = await tx.lmsTeamCoursePurchase.findMany({
        where: { teamId: block.teamId },
        select: { courseSlug: true, seatLimit: true },
      });
      const slug = block.courseSlug.trim().toLowerCase();
      const teamSeats = remaining.reduce((sum, p) => sum + p.seatLimit, 0);
      const courseSeats = remaining
        .filter((p) => p.courseSlug.trim().toLowerCase() === slug)
        .reduce((sum, p) => sum + p.seatLimit, 0);

      await tx.lmsTeam.update({
        where: { id: block.teamId },
        data: { seatLimit: teamSeats },
      });

      const course = await tx.lmsCourse.findUnique({ where: { slug }, select: { id: true } });
      if (!course) return 0;

      const holders = await teamPaidSeatHolders(tx, block.teamId, course.id, slug);
      const excess = holders.length - courseSeats;
      if (excess <= 0) return 0;

      const teamSeatRef = `team:${block.teamId}`;
      const toRevoke = holders
        .filter((h) => h.paymentReference === teamSeatRef)
        .slice(0, excess)
        .map((h) => h.id);
      if (toRevoke.length === 0) return 0;

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
      return result.count;
    });

    console.warn('[team-seat-refund] seat block refunded', {
      teamId: block.teamId,
      courseSlug: block.courseSlug,
      seatsInBlock: block.seatLimit,
      paymentReference: ref,
    });
  }

  return { blocks: blocks.length, seatsRevoked };
}

/**
 * GP-759 (c): whether a paid seat in this course is free for `userId` in a course-purchase team.
 * Counts the same way as the refund rule above: seats are the team's blocks for the course, and
 * holders are the team's members with an active or completed enrolment in it (not counting
 * `userId`). Team membership survives a refund, so a spare invite or a re-accept must pass this
 * before a refunded member seat is issued again. A team with no blocks for the course (older
 * teams, before seat blocks existed) is left to the team seat limit, as before.
 */
export async function teamCourseSeatIsFree(
  teamId: string,
  courseSlug: string,
  userId: string,
): Promise<boolean> {
  const slug = courseSlug.trim().toLowerCase();
  const blocks = (
    await prisma.lmsTeamCoursePurchase.findMany({
      where: { teamId },
      select: { courseSlug: true, seatLimit: true },
    })
  ).filter((p) => p.courseSlug.trim().toLowerCase() === slug);
  if (blocks.length === 0) return true;
  const courseSeats = blocks.reduce((sum, p) => sum + p.seatLimit, 0);
  if (courseSeats <= 0) return false;

  const course = await prisma.lmsCourse.findUnique({ where: { slug }, select: { id: true } });
  if (!course) return true; // the enrolment writer reports COURSE_NOT_FOUND
  const holders = (await teamPaidSeatHolders(prisma, teamId, course.id, slug)).filter(
    (h) => h.studentId !== userId,
  );
  return holders.length < courseSeats;
}

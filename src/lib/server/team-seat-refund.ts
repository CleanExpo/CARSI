import type { prisma } from '@/lib/prisma';
import { ACCESS_GRANTING_STATUS_LIST } from '@/lib/server/enrollment-access';

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
      status: { in: [...ACCESS_GRANTING_STATUS_LIST] },
      paymentReference: { in: [`team:${teamId}`, ...blockRefs] },
    },
    orderBy: { enrolledAt: 'desc' },
    select: { id: true, studentId: true, paymentReference: true },
  });
}

/**
 * Seats in use against a course-purchase team's own seat limit (the sum of its seat blocks), by
 * the same rule: every seat this team paid for that is held, across the team's courses. Returns
 * null when the team has no seat blocks (Teams subscription and older teams), where the caller's
 * member count applies as before.
 */
export async function countTeamPaidSeatsUsed(
  db: SeatDb & Pick<typeof prisma, 'lmsCourse'>,
  teamId: string,
): Promise<number | null> {
  const blocks = await db.lmsTeamCoursePurchase.findMany({
    where: { teamId },
    select: { courseSlug: true },
  });
  if (blocks.length === 0) return null;
  const slugs = [...new Set(blocks.map((b) => b.courseSlug.trim().toLowerCase()))];
  let used = 0;
  for (const slug of slugs) {
    const course = await db.lmsCourse.findUnique({ where: { slug }, select: { id: true } });
    if (!course) continue;
    used += (await teamPaidSeatHolders(db, teamId, course.id, slug)).length;
  }
  return used;
}

import { prisma } from '@/lib/prisma';
import {
  findTeamCoursePurchaseByPaymentReference,
  findTeamCoursePurchasesByTeamId,
  insertTeamCoursePurchase,
} from '@/lib/server/team-course-purchase-db';
import { readTeamCourseSlug } from '@/lib/server/team-course-slug-db';

export type TeamCoursePurchaseRow = {
  id: string;
  course_slug: string;
  course_title: string;
  seat_limit: number;
  seats_used: number;
  seats_remaining: number;
  purchased_at: string;
};

/** Team members with an active enrolment in this course (includes owner). */
export async function countSeatsUsedForTeamCourse(
  teamId: string,
  courseSlug: string,
): Promise<number> {
  const slug = courseSlug.trim().toLowerCase();
  const members = await prisma.lmsTeamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });
  if (members.length === 0) return 0;

  const userIds = members.map((m) => m.userId);
  const course = await prisma.lmsCourse.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!course) return 0;

  return prisma.lmsEnrollment.count({
    where: {
      studentId: { in: userIds },
      courseId: course.id,
      status: { notIn: ['cancelled'] },
    },
  });
}

export async function getTeamCoursePurchases(teamId: string): Promise<TeamCoursePurchaseRow[]> {
  let purchases = await findTeamCoursePurchasesByTeamId(teamId);

  if (purchases.length === 0) {
    const legacySlug = await readTeamCourseSlug(teamId);
    const team = await prisma.lmsTeam.findUnique({
      where: { id: teamId },
      select: { seatLimit: true, createdAt: true },
    });
    if (legacySlug && team) {
      purchases = [
        {
          id: `legacy-${teamId}`,
          teamId,
          courseSlug: legacySlug,
          seatLimit: team.seatLimit,
          paymentReference: null,
          purchasedAt: team.createdAt,
        },
      ];
    }
  }

  const slugs = [...new Set(purchases.map((p) => p.courseSlug.trim().toLowerCase()))];
  const courses = await prisma.lmsCourse.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, title: true },
  });
  const titleBySlug = new Map(
    courses.map((c) => [c.slug.trim().toLowerCase(), c.title]),
  );

  const rows: TeamCoursePurchaseRow[] = [];
  for (const p of purchases) {
    const slug = p.courseSlug.trim().toLowerCase();
    const seatsUsed = await countSeatsUsedForTeamCourse(teamId, slug);
    rows.push({
      id: p.id,
      course_slug: slug,
      course_title: titleBySlug.get(slug) ?? slug.replace(/-/g, ' '),
      seat_limit: p.seatLimit,
      seats_used: seatsUsed,
      seats_remaining: Math.max(0, p.seatLimit - seatsUsed),
      purchased_at: p.purchasedAt.toISOString(),
    });
  }

  return rows;
}

/** Aggregated seat pools by course (multiple purchases of same course sum seats). */
export async function getTeamCourseSeatPools(teamId: string) {
  const purchases = await getTeamCoursePurchases(teamId);
  const bySlug = new Map<
    string,
    TeamCoursePurchaseRow & { purchase_count: number; purchases: TeamCoursePurchaseRow[] }
  >();

  for (const p of purchases) {
    const existing = bySlug.get(p.course_slug);
    if (!existing) {
      bySlug.set(p.course_slug, {
        ...p,
        purchase_count: 1,
        purchases: [p],
      });
    } else {
      const seatLimit = existing.seat_limit + p.seat_limit;
      const seatsUsed = Math.max(existing.seats_used, p.seats_used);
      bySlug.set(p.course_slug, {
        ...existing,
        seat_limit: seatLimit,
        seats_used: seatsUsed,
        seats_remaining: Math.max(0, seatLimit - seatsUsed),
        purchase_count: existing.purchase_count + 1,
        purchases: [...existing.purchases, p],
      });
    }
  }

  return [...bySlug.values()];
}

export async function addTeamCoursePurchase(params: {
  teamId: string;
  courseSlug: string;
  seatLimit: number;
  paymentReference?: string;
}): Promise<void> {
  const ref = params.paymentReference?.trim();
  if (ref) {
    const existing = await findTeamCoursePurchaseByPaymentReference(ref);
    if (existing) return;
  }

  await insertTeamCoursePurchase(params);
}

export async function assertCourseSeatsAvailable(
  teamId: string,
  courseSlugs: string[],
): Promise<void> {
  const pools = await getTeamCourseSeatPools(teamId);
  const poolBySlug = new Map(pools.map((p) => [p.course_slug, p]));

  for (const slug of courseSlugs) {
    const pool = poolBySlug.get(slug);
    if (!pool) {
      throw new Error('NO_SEATS_FOR_COURSE');
    }
    if (pool.seats_remaining <= 0) {
      throw new Error('COURSE_SEATS_FULL');
    }
  }
}

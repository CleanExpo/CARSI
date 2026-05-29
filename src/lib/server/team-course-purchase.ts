import { Prisma } from '@/generated/prisma/client';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { createUniqueTeamSlug } from '@/lib/server/teams';

const COURSE_BUNDLE_TIER = 'course_purchase';

export function buildTeamDashboardUrl(
  origin: string,
  params: { courseSlug: string; seats: number; fromPurchase?: boolean },
): string {
  const base = origin.replace(/\/$/, '');
  const q = new URLSearchParams({
    from_purchase: params.fromPurchase !== false ? '1' : '0',
    course: params.courseSlug,
    seats: String(params.seats),
  });
  return `${base}/dashboard/team?${q.toString()}`;
}

async function writeTeamCourseSlugTx(
  tx: Prisma.TransactionClient,
  teamId: string,
  courseSlug: string,
): Promise<void> {
  const slug = courseSlug.trim().toLowerCase();
  try {
    await tx.lmsTeam.update({
      where: { id: teamId },
      data: { courseSlug: slug },
    });
  } catch {
    await tx.$executeRaw`
      UPDATE lms_teams SET course_slug = ${slug} WHERE id = ${teamId}::uuid
    `;
  }
}

async function insertTeamCoursePurchaseTx(
  tx: Prisma.TransactionClient,
  params: {
    teamId: string;
    courseSlug: string;
    seatLimit: number;
    paymentReference?: string;
  },
): Promise<boolean> {
  const slug = params.courseSlug.trim().toLowerCase();
  const ref = params.paymentReference?.trim() || null;

  if (ref) {
    const existing = await tx.lmsTeamCoursePurchase.findFirst({
      where: { paymentReference: ref },
    });
    if (existing) return false;
  }

  await tx.lmsTeamCoursePurchase.create({
    data: {
      teamId: params.teamId,
      courseSlug: slug,
      seatLimit: params.seatLimit,
      paymentReference: ref,
    },
  });
  return true;
}

async function sumTeamCoursePurchaseSeatsTx(
  tx: Prisma.TransactionClient,
  teamId: string,
): Promise<number> {
  const total = await tx.lmsTeamCoursePurchase.aggregate({
    where: { teamId },
    _sum: { seatLimit: true },
  });
  return total._sum.seatLimit ?? 0;
}

/**
 * After a multi-seat course purchase: enrol the buyer and provision a team with seat_limit = seats.
 */
export async function provisionTeamCoursePurchase(params: {
  ownerId: string;
  ownerEmail: string;
  ownerName: string | null;
  courseSlug: string;
  seatCount: number;
  paymentReference: string;
}): Promise<{ teamId: string; teamSlug: string }> {
  const { ownerId, courseSlug, seatCount, paymentReference } = params;

  return prisma.$transaction(async (tx) => {
    const existingMembership = await tx.lmsTeamMember.findFirst({
      where: { userId: ownerId },
      include: { team: true },
    });

    if (existingMembership) {
      const team = existingMembership.team;
      if (team.ownerId !== ownerId) {
        throw new Error('ALREADY_ON_TEAM');
      }

      await insertTeamCoursePurchaseTx(tx, {
        teamId: team.id,
        courseSlug,
        seatLimit: seatCount,
        paymentReference,
      });

      const totalSeats = await sumTeamCoursePurchaseSeatsTx(tx, team.id);
      await tx.lmsTeam.update({
        where: { id: team.id },
        data: {
          seatLimit: totalSeats > 0 ? totalSeats : seatCount,
          bundleTier: COURSE_BUNDLE_TIER,
        },
      });
      await writeTeamCourseSlugTx(tx, team.id, courseSlug);
      return { teamId: team.id, teamSlug: team.slug };
    }

    const name = 'My team';
    const slug = await createUniqueTeamSlug(name);

    const team = await tx.lmsTeam.create({
      data: {
        name,
        slug,
        ownerId,
        bundleTier: COURSE_BUNDLE_TIER,
        seatLimit: seatCount,
        members: {
          create: { userId: ownerId, role: 'owner' },
        },
      },
      select: { id: true, slug: true },
    });

    await writeTeamCourseSlugTx(tx, team.id, courseSlug);
    await insertTeamCoursePurchaseTx(tx, {
      teamId: team.id,
      courseSlug,
      seatLimit: seatCount,
      paymentReference,
    });

    return { teamId: team.id, teamSlug: team.slug };
  });
}

export async function fulfillCourseCheckoutForUser(params: {
  claims: SessionClaims;
  courseSlug: string;
  paymentReference: string;
  purchaseMode: 'self' | 'team';
  teamSeatCount?: number;
}): Promise<{
  kind: 'self' | 'team';
  enrollmentId?: string;
  courseId?: string;
  teamSlug?: string;
  redirectPath: string;
  alreadyEnrolled: boolean;
}> {
  const { claims, courseSlug, paymentReference, purchaseMode, teamSeatCount } = params;

  const result = await enrollStudentInCourse(claims, courseSlug, paymentReference);
  const alreadyEnrolled = result === 'already_enrolled';

  if (purchaseMode !== 'team' || !teamSeatCount || teamSeatCount < 2) {
    const { getFirstLessonLearnPath } = await import('@/lib/server/first-lesson');
    const learnPath = (await getFirstLessonLearnPath(courseSlug)) ?? '/dashboard/student';
    return {
      kind: 'self',
      alreadyEnrolled,
      enrollmentId: alreadyEnrolled ? undefined : result.enrollmentId,
      courseId: alreadyEnrolled ? undefined : result.courseId,
      redirectPath: learnPath,
    };
  }

  const user = await prisma.lmsUser.findUnique({
    where: { id: claims.sub },
    select: { email: true, fullName: true },
  });
  if (!user) throw new Error('USER_NOT_FOUND');

  const { teamSlug } = await provisionTeamCoursePurchase({
    ownerId: claims.sub,
    ownerEmail: user.email,
    ownerName: user.fullName,
    courseSlug,
    seatCount: teamSeatCount,
    paymentReference,
  });

  return {
    kind: 'team',
    alreadyEnrolled,
    teamSlug,
    enrollmentId: alreadyEnrolled ? undefined : result.enrollmentId,
    courseId: alreadyEnrolled ? undefined : result.courseId,
    redirectPath: `/dashboard/team?from_purchase=1&course=${encodeURIComponent(courseSlug)}&seats=${teamSeatCount}`,
  };
}

/** Enrol a team member in the team's purchased course when they accept an invite. */
export async function enrollTeamMemberInPurchasedCourse(
  userId: string,
  teamId: string,
): Promise<void> {
  const { readTeamCourseSlug } = await import('@/lib/server/team-course-slug-db');
  const slug = await readTeamCourseSlug(teamId);
  if (!slug) return;

  const claims = await sessionClaimsForUserId(userId);
  if (!claims) return;

  try {
    await enrollStudentInCourse(claims, slug, `team:${teamId}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg !== 'COURSE_NOT_FOUND') {
      console.error('[team-course-purchase] member enrol', e);
    }
  }
}

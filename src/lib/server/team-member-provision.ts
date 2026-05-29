import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { enrollStudentInCourse } from '@/lib/server/enrollment-service';
import { hashPassword, sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { generateMemberTempPassword } from '@/lib/server/member-temp-password';
import { sendTeamMemberAddedEmail } from '@/lib/server/transactional-email';
import { assertCourseSeatsAvailable } from '@/lib/server/team-course-seats';
import { listTeamCoursePurchaseSlugs } from '@/lib/server/team-course-purchase-db';
import { readTeamCourseSlug } from '@/lib/server/team-course-slug-db';
import { repairAndGetTeamForUser } from '@/lib/server/teams';

/**
 * Add a team member by email and grant access only to the selected courses.
 * Each person gets their own unique sign-in password in the email.
 */
export async function addCourseTeamMemberByEmail(params: {
  ownerId: string;
  inviterName: string;
  email: string;
  appOrigin: string;
  courseSlugs: string[];
}): Promise<{ email: string; account_created: boolean; courses: string[] }> {
  const email = params.email.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new Error('INVALID_EMAIL');
  }

  const slugs = [
    ...new Set(
      params.courseSlugs.map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0),
    ),
  ];
  if (slugs.length === 0) {
    throw new Error('NO_COURSES_SELECTED');
  }

  const team = await repairAndGetTeamForUser(params.ownerId);
  if (!team || team.ownerId !== params.ownerId) {
    throw new Error('NO_TEAM');
  }

  const membership = team.members.find((m) => m.userId === params.ownerId);
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('FORBIDDEN');
  }

  const ownerEnrollments = await prisma.lmsEnrollment.findMany({
    where: {
      studentId: params.ownerId,
      status: { notIn: ['cancelled'] },
      course: { slug: { in: slugs } },
    },
    include: { course: { select: { slug: true, title: true } } },
  });

  const allowedSlugs = new Set(
    ownerEnrollments.map((e) => e.course.slug.trim().toLowerCase()),
  );
  const invalid = slugs.filter((s) => !allowedSlugs.has(s));
  if (invalid.length > 0) {
    throw new Error('OWNER_NOT_ENROLLED');
  }

  const teamPurchaseSlugs = new Set(await listTeamCoursePurchaseSlugs(team.id));
  const legacySlug =
    team.courseSlug?.trim().toLowerCase() ?? (await readTeamCourseSlug(team.id));
  if (legacySlug) teamPurchaseSlugs.add(legacySlug);

  const teamCourseSlugs = slugs.filter((s) => teamPurchaseSlugs.has(s));
  if (teamCourseSlugs.length > 0) {
    try {
      await assertCourseSeatsAvailable(team.id, teamCourseSlugs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'COURSE_SEATS_FULL') throw new Error('COURSE_SEATS_FULL');
      if (msg === 'NO_SEATS_FOR_COURSE') throw new Error('NO_SEATS_FOR_COURSE');
      throw e;
    }
  }

  const courseTitles = ownerEnrollments
    .filter((e) => slugs.includes(e.course.slug.trim().toLowerCase()))
    .map((e) => e.course.title);

  const existingOnTeam = team.members.find((m) => m.user.email.toLowerCase() === email);
  if (existingOnTeam) {
    throw new Error('ALREADY_MEMBER');
  }

  let user = await prisma.lmsUser.findUnique({ where: { email } });
  let accountCreated = false;

  const memberPassword = generateMemberTempPassword();
  const hashedPassword = await hashPassword(memberPassword);

  if (!user) {
    const id = randomUUID();
    user = await prisma.lmsUser.create({
      data: {
        id,
        email,
        hashedPassword,
        fullName: email.split('@')[0],
        isActive: true,
        isVerified: false,
      },
    });
    accountCreated = true;
  } else {
    await prisma.lmsUser.update({
      where: { id: user.id },
      data: { hashedPassword },
    });
  }

  await prisma.lmsTeamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
    create: { teamId: team.id, userId: user.id, role: 'member' },
    update: {},
  });

  const memberClaims = await sessionClaimsForUserId(user.id);
  if (!memberClaims) {
    throw new Error('USER_INACTIVE');
  }

  for (const slug of slugs) {
    try {
      await enrollStudentInCourse(memberClaims, slug, `team:${team.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg !== 'COURSE_NOT_FOUND') {
        console.error('[team-member-provision] enrol', slug, e);
      }
    }
  }

  const memberName = user.fullName?.trim() || email.split('@')[0] || 'there';

  void sendTeamMemberAddedEmail({
    to: email,
    memberName,
    inviterName: params.inviterName,
    teamName: team.name,
    courseTitles,
    appOrigin: params.appOrigin,
    temporaryPassword: memberPassword,
  }).catch((e) => console.error('[team-member-provision] email', e));

  return { email, account_created: accountCreated, courses: courseTitles };
}

import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { hashPassword, sessionClaimsForUserId } from '@/lib/server/lms-auth';
import { generateMemberTempPassword } from '@/lib/server/member-temp-password';
import { sendTeamMemberAddedEmail } from '@/lib/server/transactional-email';
import { assertCourseSeatsAvailable } from '@/lib/server/team-course-seats';
import { listTeamCoursePurchaseSlugs } from '@/lib/server/team-course-purchase-db';
import { readTeamCourseSlug } from '@/lib/server/team-course-slug-db';
import {
  issueTeamMemberSeat,
  prepareTeamMemberSeat,
  runSeatStateStep,
  type TeamMemberSeat,
} from '@/lib/server/seat-state';
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

  const isCoursePurchaseTeam =
    team.bundleTier === 'course_purchase' && teamPurchaseSlugs.size > 0;
  const teamCourseSlugs = slugs.filter((s) => teamPurchaseSlugs.has(s));

  // Set when a full pool's refusal is deferred to the seat step. Only a proven holder may then
  // join, so every selected course must reach that step as a prepared seat (see below).
  let fullPoolDeferred = false;
  if (isCoursePurchaseTeam) {
    const notInPool = slugs.filter((s) => !teamPurchaseSlugs.has(s));
    if (notInPool.length > 0) {
      throw new Error('NOT_TEAM_PURCHASE_COURSE');
    }
    if (teamCourseSlugs.length > 0) {
      try {
        await assertCourseSeatsAvailable(team.id, teamCourseSlugs);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // A full pool is decided in the seat step below, once the member is known: a learner
        // who already holds the course through another payment joins without a seat (GP-759
        // follow-up, ruling 22/11/2026). Everyone else is refused there with COURSE_SEATS_FULL.
        if (msg !== 'COURSE_SEATS_FULL') {
          if (msg === 'NO_SEATS_FOR_COURSE') throw new Error('NO_SEATS_FOR_COURSE');
          throw e;
        }
        // Someone with no account cannot hold the course yet: refuse now, before an account
        // is created for them.
        if (!(await prisma.lmsUser.findUnique({ where: { email }, select: { id: true } }))) {
          throw new Error('COURSE_SEATS_FULL');
        }
        fullPoolDeferred = true;
      }
    }
  }

  const enrollSlugs = isCoursePurchaseTeam ? teamCourseSlugs : slugs;

  const courseTitles = ownerEnrollments
    .filter((e) => enrollSlugs.includes(e.course.slug.trim().toLowerCase()))
    .map((e) => e.course.title);

  const existingOnTeam = team.members.find((m) => m.user.email.toLowerCase() === email);
  if (existingOnTeam) {
    throw new Error('ALREADY_MEMBER');
  }

  let user = await prisma.lmsUser.findUnique({ where: { email } });
  let accountCreated = false;
  let memberPassword: string | null = null;

  if (!user) {
    memberPassword = generateMemberTempPassword();
    const hashedPassword = await hashPassword(memberPassword);
    const id = randomUUID();
    user = await prisma.lmsUser.create({
      data: {
        id,
        email,
        hashedPassword,
        // No email-derived name — store null when unknown (#302). The member
        // sets their real name on first login / before certificate issuance.
        fullName: null,
        isActive: true,
        isVerified: false,
      },
    });
    accountCreated = true;
  }

  const memberClaims = await sessionClaimsForUserId(user.id);
  if (!memberClaims) {
    throw new Error('USER_INACTIVE');
  }

  // Reading half of each seat before the step (the step may be retried).
  const seats: TeamMemberSeat[] = [];
  for (const slug of enrollSlugs) {
    try {
      const seat = await prepareTeamMemberSeat(user.id, team.id, slug);
      if (seat) seats.push(seat);
    } catch (e) {
      console.error('[team-member-provision] enrol', slug, e);
    }
  }
  // A deferred full-pool refusal is only lifted by the step proving the member holds each course.
  // A seat that could not be prepared cannot prove that, so the refusal stands (GP-759 follow-up,
  // Codex round 2): no member row, no email.
  if (fullPoolDeferred && seats.length !== enrollSlugs.length) {
    throw new Error('COURSE_SEATS_FULL');
  }

  // GP-759 (Phill, 23/11/2026): the paid-seat checks, the member row and the seats are written
  // together in the one seat step (seat-state.ts), so two invites at the last seat cannot both
  // take it. The check above is only an early answer; this one decides. A member with no paid
  // seat left is not added (COURSE_SEATS_FULL), and no email is sent.
  const memberUserId = user.id;
  await runSeatStateStep(async (tx) => {
    for (const seat of seats) {
      // A member without the course prerequisite still gets their seat, issued LOCKED
      // (prerequisiteGated) until they complete it - founder decision 02/11/2026.
      if ((await issueTeamMemberSeat(tx, seat)) === 'no_seat') {
        throw new Error('COURSE_SEATS_FULL');
      }
    }
    await tx.lmsTeamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: memberUserId } },
      create: { teamId: team.id, userId: memberUserId, role: 'member' },
      update: {},
    });
  });

  const memberName = user.fullName?.trim() || email.split('@')[0] || 'there';

  void sendTeamMemberAddedEmail({
    to: email,
    memberName,
    inviterName: params.inviterName,
    teamName: team.name,
    courseTitles,
    appOrigin: params.appOrigin,
    ...(memberPassword ? { temporaryPassword: memberPassword } : {}),
  }).catch((e) => console.error('[team-member-provision] email', e));

  return { email, account_created: accountCreated, courses: courseTitles };
}

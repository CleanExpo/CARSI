/**
 * Grant tobyb@ccwarehouse.com.au complimentary access to every published CARSI course.
 *
 * Run from the CARSI repo root, with DATABASE_URL set (same env the app uses):
 *   npx tsx scripts/grant-toby-comp-access.ts
 *
 * Safe to re-run. Re-running after publishing new courses adds only the missing
 * enrolments and does NOT reset an existing password.
 *
 * IMPORTANT: `import 'dotenv/config'` must run before any import of `@/lib/prisma`.
 * ES modules hoist static imports, and `@/lib/prisma` resolves the connection string
 * eagerly at module load (`export const prisma = getPrismaClient()`), so loading `.env`
 * any later is too late — Prisma would bind the placeholder URL and fail with P1000.
 */
import 'dotenv/config';

import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';
import { adminGrantEnrollment } from '@/lib/admin/admin-enrollment-mutations';
import {
  accountActionFor,
  enrolmentsWithoutAccess,
  grantExitCode,
} from '@/lib/admin/comp-access-grant';

const EMAIL = 'tobyb@ccwarehouse.com.au';
const FULL_NAME = 'Toby B';
const PAYMENT_REFERENCE = 'admin:yearly-membership:free';
const NOTE_ROLE = 'CCW third-party supplier — complimentary demo access';

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set — run this with the app environment loaded.');
  }

  const email = EMAIL.trim().toLowerCase();

  // 1. Find or create the learner account.
  //    Unlike grantYearlyMembership(), this deliberately does NOT touch the
  //    password of an existing user, so re-running never locks Toby out.
  const existing = await prisma.lmsUser.findUnique({ where: { email } });
  const action = accountActionFor(existing);
  const accountCreated = action === 'create';
  const reactivated = action === 'reactivate';

  //    Branching on `existing` rather than on `action` keeps the null-narrowing that proves
  //    `user` is non-null below; `accountActionFor` returns 'create' exactly when there is no
  //    row, so the two agree by construction.
  let user;
  if (!existing) {
    const { generateMemberTempPassword } = await import('@/lib/server/member-temp-password');
    const { hashPassword } = await import('@/lib/server/lms-auth');
    const temporaryPassword = generateMemberTempPassword();

    user = await prisma.lmsUser.create({
      data: {
        id: randomUUID(),
        email,
        hashedPassword: await hashPassword(temporaryPassword),
        fullName: FULL_NAME,
        isActive: true,
        isVerified: false,
      },
    });
    console.log('\n  ACCOUNT CREATED');
    console.log(`  Temporary password: ${temporaryPassword}`);
    console.log('  ^ send this to Toby via a channel you trust, then delete it.\n');
  } else if (reactivated) {
    //  `isActive` IS reset, unlike the password — skipping it was collateral of skipping the
    //  password, not intent. Both `authenticateWithPassword` and `sessionClaimsForUserId`
    //  return null for an inactive user, so enrolments granted to a deactivated account are
    //  unreachable: the grant would look complete while Toby could not sign in to use it.
    user = await prisma.lmsUser.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
  } else {
    user = existing;
  }

  // 2. Enrol in every published course.
  const courses = await prisma.lmsCourse.findMany({
    where: lmsPublishedCourseWhere,
    select: { slug: true, title: true },
    orderBy: { title: 'asc' },
  });

  if (courses.length === 0) throw new Error('No published courses found.');

  let created = 0;
  let already = 0;
  const failed: string[] = [];

  for (const course of courses) {
    try {
      const result = await adminGrantEnrollment({
        studentId: user.id,
        courseSlug: course.slug,
        paymentReference: PAYMENT_REFERENCE,
      });
      if (result.kind === 'created') {
        created += 1;
        console.log(`  + ${course.title}`);
      } else {
        already += 1;
      }
    } catch (e) {
      failed.push(`${course.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3. Report any enrolment that exists but does NOT grant access.
  //    adminGrantEnrollment() reports a revoked row as 'already_enrolled' and leaves it
  //    revoked, so without this the summary would claim access that the read gates deny.
  //    Reported, never auto-reactivated: `revokedReason` carries dispute/refund meaning
  //    that a complimentary grant must not silently overwrite.
  //
  //    Filtered in memory through `isEnrolmentAccessAllowed`, the same WS3 predicate the
  //    read gates use, rather than a `status: { not: 'active' }` query. The allow-set is
  //    {active, completed}, so the narrower query flagged every COMPLETED course as having
  //    no access — on a re-run after Toby finishes one, the report would have claimed he
  //    was locked out of content and certificates he can still reach. Reusing the predicate
  //    also normalises case/whitespace the free-text column permits, which `notIn` cannot,
  //    and keeps this report from ever disagreeing with the gates it is reporting on.
  const enrolments = await prisma.lmsEnrollment.findMany({
    where: { studentId: user.id },
    select: { status: true, revokedReason: true, course: { select: { slug: true } } },
    orderBy: { enrolledAt: 'asc' },
  });
  const inactive = enrolmentsWithoutAccess(enrolments);

  console.log('\n  ---');
  const accountNote = accountCreated
    ? ' (new)'
    : reactivated
      ? ' (existing, reactivated)'
      : ' (existing)';
  console.log(`  Account:           ${email}${accountNote}`);
  console.log(`  Role note:         ${NOTE_ROLE}`);
  console.log(`  Published courses: ${courses.length}`);
  console.log(`  Newly enrolled:    ${created}`);
  console.log(`  Already enrolled:  ${already}`);
  if (inactive.length) {
    console.log(`  NO ACCESS (${inactive.length}) — enrolment row exists but the gates deny it:`);
    for (const en of inactive) {
      const reason = en.revokedReason ? ` (${en.revokedReason})` : '';
      console.log(`    - ${en.course.slug}: ${en.status}${reason}`);
    }
  }
  if (failed.length) {
    console.log(`  FAILED (${failed.length}):`);
    for (const f of failed) console.log(`    - ${f}`);
  }
  console.log('  ---\n');

  // Any failure means Toby is missing a course, so the grant is incomplete — exit non-zero.
  // The rule itself lives in `grantExitCode` (unit-tested in comp-access-grant.test.ts);
  // it previously reported a partial failure as success.
  process.exitCode = grantExitCode({ created, alreadyEnrolled: already, failed: failed.length });
}

main()
  .catch((e) => {
    console.error('\n  FAILED:', e instanceof Error ? e.message : e, '\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

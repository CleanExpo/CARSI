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
  let user = await prisma.lmsUser.findUnique({ where: { email } });
  let accountCreated = false;

  if (!user) {
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
    accountCreated = true;

    console.log('\n  ACCOUNT CREATED');
    console.log(`  Temporary password: ${temporaryPassword}`);
    console.log('  ^ send this to Toby via a channel you trust, then delete it.\n');
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

  // 3. Report any enrolment that exists but is not active.
  //    adminGrantEnrollment() reports a revoked row as 'already_enrolled' and leaves it
  //    revoked, so without this the summary would claim access that the read gates deny.
  //    Reported, never auto-reactivated: `revokedReason` carries dispute/refund meaning
  //    that a complimentary grant must not silently overwrite.
  const inactive = await prisma.lmsEnrollment.findMany({
    where: { studentId: user.id, status: { not: 'active' } },
    select: { status: true, revokedReason: true, course: { select: { slug: true } } },
    orderBy: { enrolledAt: 'asc' },
  });

  console.log('\n  ---');
  console.log(`  Account:           ${email}${accountCreated ? ' (new)' : ' (existing)'}`);
  console.log(`  Role note:         ${NOTE_ROLE}`);
  console.log(`  Published courses: ${courses.length}`);
  console.log(`  Newly enrolled:    ${created}`);
  console.log(`  Already enrolled:  ${already}`);
  if (inactive.length) {
    console.log(`  NOT ACTIVE (${inactive.length}) — no access despite the enrolment row:`);
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
  // Gating this on "every course failed" (created === 0 && already === 0) reported a partial
  // failure as success: 24 of 25 enrolled with 1 erroring exited 0, so an operator or wrapper
  // reading the exit status saw a clean run while Toby silently lacked a course.
  if (failed.length) {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error('\n  FAILED:', e instanceof Error ? e.message : e, '\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

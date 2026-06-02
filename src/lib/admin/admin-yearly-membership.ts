import { randomUUID } from 'node:crypto';

import { adminGrantEnrollment } from '@/lib/admin/admin-enrollment-mutations';
import { prisma } from '@/lib/prisma';
import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';
import { generateMemberTempPassword } from '@/lib/server/member-temp-password';
import { hashPassword } from '@/lib/server/lms-auth';
import { sendYearlyMembershipEmail } from '@/lib/server/transactional-email';

const MEMBERSHIP_DURATION_LABEL = '12 months from activation';

export function yearlyMembershipPaymentReference(priceAud: number): string {
  if (priceAud <= 0) return 'admin:yearly-membership:free';
  const cents = Math.round(priceAud * 100);
  return `admin:yearly-membership:${cents}`;
}

export function formatYearlyMembershipPriceLabel(priceAud: number): string {
  if (priceAud <= 0) return 'Complimentary (no charge)';
  return `$${priceAud.toFixed(2)} AUD (lump sum)`;
}

export async function countPublishedCoursesForYearlyMembership(): Promise<number> {
  if (!process.env.DATABASE_URL?.trim()) return 0;
  return prisma.lmsCourse.count({ where: lmsPublishedCourseWhere });
}

export async function listPublishedCourseSlugsForYearlyMembership(): Promise<string[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  const rows = await prisma.lmsCourse.findMany({
    where: lmsPublishedCourseWhere,
    select: { slug: true },
    orderBy: { title: 'asc' },
  });
  return rows.map((r) => r.slug.trim().toLowerCase()).filter(Boolean);
}

export async function grantYearlyMembership(params: {
  email: string;
  fullName?: string | null;
  priceAud: number;
  appOrigin: string;
}): Promise<{
  userId: string;
  email: string;
  accountCreated: boolean;
  passwordIssued: boolean;
  coursesGranted: number;
  alreadyEnrolled: number;
  coursesFailed: number;
  publishedCourseCount: number;
  priceLabel: string;
}> {
  const email = params.email.trim().toLowerCase();
  if (!email.includes('@')) throw new Error('INVALID_EMAIL');

  const priceAud = Number.isFinite(params.priceAud) ? Math.max(0, params.priceAud) : -1;
  if (priceAud < 0) throw new Error('INVALID_PRICE');

  const slugs = await listPublishedCourseSlugsForYearlyMembership();
  if (slugs.length === 0) throw new Error('NO_PUBLISHED_COURSES');

  const paymentReference = yearlyMembershipPaymentReference(priceAud);
  const temporaryPassword = generateMemberTempPassword();
  const hashedPassword = await hashPassword(temporaryPassword);
  const displayName = params.fullName?.trim() || email.split('@')[0] || 'Learner';

  let user = await prisma.lmsUser.findUnique({ where: { email } });
  let accountCreated = false;

  if (!user) {
    user = await prisma.lmsUser.create({
      data: {
        id: randomUUID(),
        email,
        hashedPassword,
        fullName: displayName,
        isActive: true,
        isVerified: false,
      },
    });
    accountCreated = true;
  } else {
    user = await prisma.lmsUser.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        ...(params.fullName?.trim() ? { fullName: params.fullName.trim() } : {}),
        isActive: true,
      },
    });
  }

  let coursesGranted = 0;
  let alreadyEnrolled = 0;
  let coursesFailed = 0;

  for (const courseSlug of slugs) {
    try {
      const result = await adminGrantEnrollment({
        studentId: user.id,
        courseSlug,
        paymentReference,
      });
      if (result.kind === 'already_enrolled') alreadyEnrolled += 1;
      else coursesGranted += 1;
    } catch (e) {
      coursesFailed += 1;
      console.error('[yearly-membership] grant failed', courseSlug, e);
    }
  }

  if (coursesGranted === 0 && alreadyEnrolled === 0) {
    throw new Error('ENROLLMENT_FAILED');
  }

  const emailResult = await sendYearlyMembershipEmail({
    to: email,
    memberName: user.fullName?.trim() || displayName,
    memberEmail: email,
    temporaryPassword,
    priceLabel: formatYearlyMembershipPriceLabel(priceAud),
    courseCount: slugs.length,
    durationLabel: MEMBERSHIP_DURATION_LABEL,
    appOrigin: params.appOrigin,
  });

  if (!emailResult.sent) {
    console.warn('[yearly-membership] welcome email not sent', emailResult.reason);
  }

  return {
    userId: user.id,
    email,
    accountCreated,
    passwordIssued: true,
    coursesGranted,
    alreadyEnrolled,
    coursesFailed,
    publishedCourseCount: slugs.length,
    priceLabel: formatYearlyMembershipPriceLabel(priceAud),
  };
}

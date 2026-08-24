import { randomUUID } from 'node:crypto';

import { adminGrantEnrollment } from '@/lib/admin/admin-enrollment-mutations';
import { publishedCourseAccess } from '@/lib/admin/comp-access-grant';
import { prisma } from '@/lib/prisma';
import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';
import { generateMemberTempPassword } from '@/lib/server/member-temp-password';
import { hashPassword } from '@/lib/server/lms-auth';
import {
  sendYearlyMembershipEmail,
  type SendEmailResult,
} from '@/lib/server/transactional-email';

const MEMBERSHIP_DURATION_LABEL = '12 months from activation';

/**
 * Prefix every yearly-membership grant stamps onto its enrolments. Exported so a
 * caller can recognise "this learner has already been granted one" without
 * restating the literal — see `compAttendeeMembership`.
 */
export const YEARLY_MEMBERSHIP_PAYMENT_PREFIX = 'admin:yearly-membership:';

export function yearlyMembershipPaymentReference(priceAud: number): string {
  if (priceAud <= 0) return `${YEARLY_MEMBERSHIP_PAYMENT_PREFIX}free`;
  const cents = Math.round(priceAud * 100);
  return `${YEARLY_MEMBERSHIP_PAYMENT_PREFIX}${cents}`;
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

/**
 * Whether the welcome email — which carries the ONLY copy of the temporary
 * password — actually reached the member.
 *
 * This exists because the grant ROTATES an existing member's password before
 * sending. If the send then fails, the member holds credentials that exist
 * nowhere a human can read them, and until now the only trace was a
 * `console.warn` on the server: both admin surfaces reported an unqualified
 * success. An operator who cannot see the failure cannot recover from it.
 */
export type WelcomeEmailDelivery = {
  /** True ONLY when the message was handed to the email provider. */
  delivered: boolean;
  /** Why it did not reach the member; null when it did. */
  reason: 'not_configured' | 'send_failed' | 'provider_error' | 'dev_console' | 'unknown' | null;
};

/**
 * PURE, so the classification is testable without an email provider.
 *
 * `sent: true` is NOT sufficient. `sendEmail` also returns `sent: true` with
 * `reason: 'dev_console'` when it merely prints the message to the server log —
 * which happens whenever `MAILTRAP_API_KEY` is unset with the dev console on, and
 * on provider errors and network failures in that mode. The member cannot read a
 * server log, so for the question this type answers — does this person have their
 * password? — dev-console output is a NON-delivery. Treating it as success would
 * reproduce the original defect in a new place.
 */
export function describeWelcomeEmailDelivery(result: SendEmailResult): WelcomeEmailDelivery {
  const reachedProvider = result.sent && result.reason !== 'dev_console';
  if (reachedProvider) return { delivered: true, reason: null };
  // `sent: false` with no reason is still a non-delivery; name it rather than
  // reporting `null`, which this type reserves for success. It gets its OWN
  // label rather than borrowing `send_failed`: that reason means something
  // specific (the request threw before the provider answered), and an operator
  // reads the label as a diagnosis. Claiming a cause we do not have would be
  // the same class of error this whole change exists to remove.
  return { delivered: false, reason: result.reason ?? 'unknown' };
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
  /** Published courses the member can actually open — what the welcome email promises. */
  reachableCourseCount: number;
  /** Published courses whose enrolment row exists but is denied by the read gates. */
  deniedCourseSlugs: string[];
  priceLabel: string;
  /**
   * Whether the member can actually READ the password this grant issued.
   * Callers must surface a non-delivery: the grant still stands, but the
   * member is locked out until an admin password reset is sent.
   */
  welcomeEmail: WelcomeEmailDelivery;
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

  const existing = await prisma.lmsUser.findUnique({ where: { email } });
  const accountCreated = !existing;

  // An EXISTING member's credentials are deliberately left alone until the grant is known to
  // succeed. This function resets the password to a fresh temporary one and only reveals it in
  // the welcome email — so mutating it before a possible throw would change the password to a
  // value nobody receives and lock a member out of an account that previously worked. The reset
  // happens after the reachability check below.
  //
  // A NEW account is created up front because the enrolment loop needs its id, and there is no
  // prior access to lose: if the grant then throws, the row is inert and a later successful run
  // picks it up through this same path and mails out a password.
  let user =
    existing ??
    (await prisma.lmsUser.create({
      data: {
        id: randomUUID(),
        email,
        hashedPassword,
        fullName: displayName,
        isActive: true,
        isVerified: false,
      },
    }));

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

  // What the member can ACTUALLY reach, read back from the rows rather than inferred from the
  // tallies above. `coursesGranted + alreadyEnrolled` overstates it: `adminGrantEnrollment`
  // reports a revoked row as `already_enrolled` without inspecting its status, so a refunded or
  // disputed enrolment counts as a success. `slugs.length` overstates it further — it is the
  // published total, unchanged by `coursesFailed`.
  const enrolments = await prisma.lmsEnrollment.findMany({
    where: { studentId: user.id },
    select: { status: true, course: { select: { slug: true } } },
  });
  const { reachable, denied } = publishedCourseAccess(enrolments, slugs);
  const reachableCourseCount = reachable.length;
  const deniedCourseSlugs = denied.map((en) => en.course.slug);

  // A membership that reaches nothing is a failed grant, not a member to welcome. This
  // subsumes the old `coursesGranted === 0 && alreadyEnrolled === 0` check, which passed when
  // every enrolment existed but was revoked.
  if (reachableCourseCount === 0) {
    throw new Error('ENROLLMENT_FAILED');
  }

  // Safe to rotate credentials now: the only remaining step is the email that carries them.
  if (existing) {
    user = await prisma.lmsUser.update({
      where: { id: existing.id },
      data: {
        hashedPassword,
        ...(params.fullName?.trim() ? { fullName: params.fullName.trim() } : {}),
        isActive: true,
      },
    });
  }

  if (deniedCourseSlugs.length > 0) {
    // Identified by id, not email — the surrounding logs do not carry member addresses.
    console.warn(
      '[yearly-membership] granted with courses the read gates deny',
      user.id,
      deniedCourseSlugs
    );
  }

  const emailResult = await sendYearlyMembershipEmail({
    to: email,
    memberName: user.fullName?.trim() || displayName,
    memberEmail: email,
    temporaryPassword,
    priceLabel: formatYearlyMembershipPriceLabel(priceAud),
    // The count the member can open, not the count we attempted. Sending `slugs.length` told a
    // member with a revoked or failed enrolment they had courses they could not reach.
    courseCount: reachableCourseCount,
    // Lets the template drop "all N published courses" / "Full library access" when the member
    // is short a course — the number alone was honest while the copy still promised the lot.
    publishedCourseCount: slugs.length,
    durationLabel: MEMBERSHIP_DURATION_LABEL,
    appOrigin: params.appOrigin,
  });

  const welcomeEmail = describeWelcomeEmailDelivery(emailResult);
  if (!welcomeEmail.delivered) {
    // Kept as a server-side trace, but it is no longer the ONLY trace — the
    // caller now receives this and is expected to show it to the operator.
    console.warn('[yearly-membership] welcome email not delivered', welcomeEmail.reason);
  }

  return {
    userId: user.id,
    email,
    accountCreated,
    // A password was always issued. Whether the member can READ it is a
    // separate question, answered by `welcomeEmail` below.
    passwordIssued: true,
    coursesGranted,
    alreadyEnrolled,
    coursesFailed,
    publishedCourseCount: slugs.length,
    reachableCourseCount,
    deniedCourseSlugs,
    priceLabel: formatYearlyMembershipPriceLabel(priceAud),
    welcomeEmail,
  };
}

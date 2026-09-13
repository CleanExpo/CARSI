import { isEnrolmentAccessAllowed } from '@/lib/server/enrollment-access';
import { isProvisionalPasswordHash } from '@/lib/server/lms-auth';
import { prisma } from '@/lib/prisma';

/**
 * A buyer already owns this course when they have an access-granting enrolment
 * (`active` / `completed`). Revoked / refunded rows do not count — those buyers
 * are allowed to pay again (fulfilment reactivates the row).
 *
 * Team seat purchases are not ownership of the payer's own seat in the same
 * way: a member buying seats for other people is legitimate revenue.
 */
export function alreadyOwnsPaidCourse(enrollmentStatus: string | null | undefined): boolean {
  return isEnrolmentAccessAllowed(enrollmentStatus);
}

export type AlreadyEnrolledCheckoutBody = {
  detail: string;
  already_enrolled: true;
  learn_path: string;
  needs_password_setup?: true;
  reset_path?: string;
  login_path?: string;
};

function safeInternalPath(path: string): string {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://')
    ? path
    : '/dashboard/student';
}

/**
 * Shape the 409 the checkout route returns instead of opening Stripe.
 * Guests who never set a password are sent to /forgot-password (the same
 * recovery page the enrolment welcome email uses). Established accounts
 * are sent to sign in. Signed-in owners are sent straight into the course.
 */
export function alreadyEnrolledCheckoutPayload(input: {
  signedIn: boolean;
  hashedPassword: string;
  learnPath: string;
}): AlreadyEnrolledCheckoutBody {
  const learnPath = safeInternalPath(input.learnPath);
  const needsPassword = isProvisionalPasswordHash(input.hashedPassword);

  if (!input.signedIn && needsPassword) {
    return {
      detail:
        'You already own this course. Set a password to open it — no further payment is needed.',
      already_enrolled: true,
      learn_path: learnPath,
      needs_password_setup: true,
      reset_path: '/forgot-password',
    };
  }

  if (!input.signedIn) {
    return {
      detail: 'You already own this course. Sign in to open it — no further payment is needed.',
      already_enrolled: true,
      learn_path: learnPath,
      login_path: `/login?next=${encodeURIComponent(learnPath)}`,
    };
  }

  return {
    detail: 'You already own this course — no payment needed.',
    already_enrolled: true,
    learn_path: learnPath,
  };
}

export type PaidCourseOwnership = {
  userId: string;
  hashedPassword: string;
  enrollmentStatus: string;
};

/**
 * Resolve the payer (session user, else email) and return their access-granting
 * enrolment for this course, or null if they do not already own it.
 */
export async function findActivePaidCourseOwnership(params: {
  studentId?: string;
  email: string;
  courseId: string;
}): Promise<PaidCourseOwnership | null> {
  const email = params.email.trim().toLowerCase();
  if (!params.courseId || (!params.studentId && !email)) return null;

  let user: { id: string; hashedPassword: string } | null = null;
  if (params.studentId) {
    user = await prisma.lmsUser.findUnique({
      where: { id: params.studentId },
      select: { id: true, hashedPassword: true },
    });
  }
  if (!user && email) {
    user = await prisma.lmsUser.findUnique({
      where: { email },
      select: { id: true, hashedPassword: true },
    });
  }
  if (!user) return null;

  const enrollment = await prisma.lmsEnrollment.findUnique({
    where: { studentId_courseId: { studentId: user.id, courseId: params.courseId } },
    select: { status: true },
  });
  if (!enrollment || !alreadyOwnsPaidCourse(enrollment.status)) return null;

  return {
    userId: user.id,
    hashedPassword: user.hashedPassword,
    enrollmentStatus: enrollment.status,
  };
}

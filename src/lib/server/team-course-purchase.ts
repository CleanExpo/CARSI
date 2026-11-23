import type { SessionClaims } from '@/lib/auth/session-jwt';
import { prisma } from '@/lib/prisma';
import {
  fulfilCheckoutInStep,
  prepareCheckoutEnrolment,
  type TeamSeatBlock,
} from '@/lib/server/seat-state';
import { createUniqueTeamSlug } from '@/lib/server/teams';
import type { CheckoutAmountPaid } from '@/lib/server/checkout-payment';

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

export async function fulfillCourseCheckoutForUser(params: {
  claims: SessionClaims;
  courseSlug: string;
  paymentReference: string;
  purchaseMode: 'self' | 'team';
  teamSeatCount?: number;
  /**
   * GP-764: the paid session's own amount and currency (`checkoutAmountPaid(session)`), recorded
   * once per Stripe checkout session. Null for a grant that is not a Stripe checkout (free,
   * discount). Required, so no fulfilment path can forget it.
   */
  amountPaid: CheckoutAmountPaid | null;
}): Promise<{
  kind: 'self' | 'team';
  enrollmentId?: string;
  courseId?: string;
  teamSlug?: string;
  redirectPath: string;
  alreadyEnrolled: boolean;
}> {
  const { claims, courseSlug, paymentReference, purchaseMode, teamSeatCount, amountPaid } = params;
  const isTeam = purchaseMode === 'team' && !!teamSeatCount && teamSeatCount >= 2;

  // GP-759: reads and slow work first; then the buyer's enrolment and the seat block are written
  // in the one seat step, which checks the session was not refunded or charged back.
  const enrolment = await prepareCheckoutEnrolment(claims, courseSlug, paymentReference, purchaseMode);
  let block: TeamSeatBlock | null = null;
  if (isTeam) {
    const user = await prisma.lmsUser.findUnique({
      where: { id: claims.sub },
      select: { email: true },
    });
    if (!user) throw new Error('USER_NOT_FOUND');
    block = {
      ownerId: claims.sub,
      courseSlug,
      seatCount: teamSeatCount,
      paymentReference,
      newTeamSlug: await createUniqueTeamSlug('My team'),
    };
  }

  const { result, team } = await fulfilCheckoutInStep(enrolment, block, amountPaid);
  const alreadyEnrolled = result === 'already_enrolled';
  if (team === 'already_on_team') throw new Error('ALREADY_ON_TEAM');

  if (!team) {
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

  return {
    kind: 'team',
    alreadyEnrolled,
    teamSlug: team.teamSlug,
    enrollmentId: alreadyEnrolled ? undefined : result.enrollmentId,
    courseId: alreadyEnrolled ? undefined : result.courseId,
    redirectPath: `/dashboard/team?from_purchase=1&course=${encodeURIComponent(courseSlug)}&seats=${teamSeatCount}`,
  };
}

/** Enrol a team member in the team's purchased course (through the seat step). */
export { enrollTeamMemberInPurchasedCourse } from '@/lib/server/seat-state';

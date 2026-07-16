/**
 * Server-side check: signed-in learner may claim the CCW attendee $295 membership.
 */
import { prisma } from '@/lib/prisma';
import { baseOfferEligible } from '@/lib/server/ccw-attendance/eligibility';
import { normalizeEmail } from '@/lib/server/ccw-attendance/normalize';

export async function learnerIsCcwAttendeeOfferEligible(params: {
  userId: string;
  email: string;
}): Promise<boolean> {
  const normalized = normalizeEmail(params.email);
  const rows = await prisma.ccwRoadshowSignIn.findMany({
    where: {
      OR: [{ studentId: params.userId }, { normalizedEmail: normalized }],
    },
  });

  return rows.some((row) =>
    baseOfferEligible({
      day1CheckedInAt: row.day1CheckedInAt,
      day2CheckedInAt: row.day2CheckedInAt,
      studentId: row.studentId,
      enrollmentId: row.enrollmentId,
      provisionStatus: row.provisionStatus,
      emailOptIn: row.emailOptIn,
    })
  );
}

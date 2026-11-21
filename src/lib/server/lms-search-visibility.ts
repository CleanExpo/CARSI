/**
 * Which courses the signed-in LMS search may return.
 *
 * Unlisted and draft courses (for example the CARSI roadshow workshop, which is free to
 * enrolled attendees only) must not be discoverable by search. A learner sees published
 * courses, plus an unlisted course only while they hold an access-granting enrolment in it
 * (the same allow-set the lesson and curriculum gates use, so a revoked, refunded,
 * cancelled or pending row reveals nothing). Draft courses stay hidden from learners.
 * Admins see every course.
 */
import type { Prisma } from '@/generated/prisma/client';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { isAdminClaims } from '@/lib/server/carsi-workshop-access';
import { ACCESS_GRANTING_STATUS_LIST } from '@/lib/server/enrollment-access';
import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';

export function lmsSearchVisibilityWhere(claims: SessionClaims): Prisma.LmsCourseWhereInput {
  if (isAdminClaims(claims)) return {};
  return {
    OR: [
      lmsPublishedCourseWhere,
      {
        status: { equals: 'unlisted', mode: 'insensitive' },
        enrollments: {
          some: { studentId: claims.sub, status: { in: [...ACCESS_GRANTING_STATUS_LIST] } },
        },
      },
    ],
  };
}

/**
 * Which courses the signed-in LMS search may return.
 *
 * Unlisted and draft courses (for example the CARSI roadshow workshop, which is free to
 * enrolled attendees only) must not be discoverable by search. A learner sees published
 * courses plus any course they are enrolled in; admins see every course.
 */
import type { Prisma } from '@/generated/prisma/client';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import { isAdminClaims } from '@/lib/server/carsi-workshop-access';
import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';

export function lmsSearchVisibilityWhere(claims: SessionClaims): Prisma.LmsCourseWhereInput {
  if (isAdminClaims(claims)) return {};
  return {
    OR: [lmsPublishedCourseWhere, { enrollments: { some: { studentId: claims.sub } } }],
  };
}

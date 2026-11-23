import type { Prisma } from '@/generated/prisma/client';
import { isRevokedStatus } from '@/lib/server/enrollment-access';

/**
 * GP-432: the one owner of "lock this enrolment before changing the learner's record".
 *
 * Every admin action that changes a learner's record for one enrolment (force-complete, quiz
 * attempt reset, admin revoke) calls this first, inside its own transaction. The row lock
 * (SELECT ... FOR UPDATE) makes those actions and a revocation take turns: whichever locks
 * first finishes, and the other then sees its committed result. A plain read under READ
 * COMMITTED cannot do that: a revocation could commit between the read and the writes, and
 * the action would then change a revoked record (found by the GP-432 verdict review).
 *
 * The Stripe revocation is a single UPDATE on the same row, so it waits on this lock too.
 */
export type LockedEnrollment = { id: string; studentId: string; courseId: string; status: string };

export async function lockEnrollmentRow(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
): Promise<LockedEnrollment | null> {
  const rows = await tx.$queryRaw<LockedEnrollment[]>`
    SELECT id::text AS id, student_id::text AS "studentId", course_id::text AS "courseId", status
    FROM lms_enrollments WHERE id = ${enrollmentId}::uuid FOR UPDATE`;
  return rows[0] ?? null;
}

/**
 * Lock the enrolment and refuse a missing or revoked one. Throws ENROLLMENT_NOT_FOUND or
 * ENROLLMENT_REVOKED; the caller's routes map them to 404 and 409.
 */
export async function lockEnrollmentForAdminChange(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
): Promise<LockedEnrollment> {
  const row = await lockEnrollmentRow(tx, enrollmentId);
  if (!row) throw new Error('ENROLLMENT_NOT_FOUND');
  if (isRevokedStatus(row.status)) throw new Error('ENROLLMENT_REVOKED');
  return row;
}

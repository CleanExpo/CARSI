import type { Prisma } from '@/generated/prisma/client';
import { isEnrolmentAccessAllowed, isRevokedStatus } from '@/lib/server/enrollment-access';

/**
 * GP-432: the ONE owner of "lock this enrolment, re-check it, then change the learner's record".
 *
 * Every writer of a learner-record row for one enrolment (lesson progress, quiz attempts,
 * practical submissions, the completion decision, admin force-complete, quiz-attempt reset,
 * admin revoke) runs its writes inside withLockedEnrollment. It takes the row lock
 * (SELECT ... FOR UPDATE), then checks the LOCKED row against the caller's rule, and only then
 * runs the writes. A revocation either committed before the lock (and is refused here) or waits
 * until the writes commit.
 *
 * Why one owner (GP-432 review rounds 1 and 2, one defect kind: "decided on state read before
 * the enrolment lock, acted on after it"): when the lock returned a row each caller was free to
 * ignore, each writer re-checked (or forgot to re-check) on its own, and a decision made from a
 * read taken before the lock was acted on after it. Here the check cannot be skipped: the
 * callback never runs unless the locked row passes. The raw lock is not exported; a static guard
 * (gp-432-completion-gate.test.ts) refuses any other module that takes the lock itself.
 */
export type LockedEnrollment = { id: string; studentId: string; courseId: string; status: string };

/**
 * What the locked row must satisfy before the writes run.
 *  - 'access'       learner writes: the status must grant access (isEnrolmentAccessAllowed, the
 *                   same predicate every learner read gate uses).
 *  - 'admin-change' admin writes and the completion decision: anything but a revoked/refunded
 *                   row (isRevokedStatus).
 *  - 'revoke'       admin revoke: the row only has to exist.
 */
export type EnrollmentLockRule = 'access' | 'admin-change' | 'revoke';

export type EnrollmentLockRefusalCode = 'ENROLLMENT_NOT_FOUND' | 'ENROLLMENT_REVOKED' | 'ENROLLMENT_NO_ACCESS';

/** Thrown before any write. `message` is the code, so existing string checks keep working. */
export class EnrollmentLockRefusal extends Error {
  readonly code: EnrollmentLockRefusalCode;
  constructor(code: EnrollmentLockRefusalCode) {
    super(code);
    this.name = 'EnrollmentLockRefusal';
    this.code = code;
  }
}

async function lockEnrollmentRow(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
): Promise<LockedEnrollment | null> {
  const rows = await tx.$queryRaw<LockedEnrollment[]>`
    SELECT id::text AS id, student_id::text AS "studentId", course_id::text AS "courseId", status
    FROM lms_enrollments WHERE id = ${enrollmentId}::uuid FOR UPDATE`;
  return rows[0] ?? null;
}

/** The rule check on the locked row. Exported for its unit tests only. */
export function enrollmentLockRefusal(
  row: LockedEnrollment | null,
  params: { studentId?: string; require: EnrollmentLockRule },
): EnrollmentLockRefusalCode | null {
  if (!row) return 'ENROLLMENT_NOT_FOUND';
  // Another learner's enrolment is "not found", never a hint that it exists.
  if (params.studentId !== undefined && row.studentId !== params.studentId) return 'ENROLLMENT_NOT_FOUND';
  if (params.require === 'access') {
    return isEnrolmentAccessAllowed(row.status) ? null : 'ENROLLMENT_NO_ACCESS';
  }
  if (params.require === 'admin-change') {
    return isRevokedStatus(row.status) ? 'ENROLLMENT_REVOKED' : null;
  }
  return null;
}

/**
 * Lock the enrolment row, check it against `require` (and ownership when `studentId` is given),
 * then run `fn` with the locked row, all inside the caller's transaction `tx`. Throws
 * EnrollmentLockRefusal before `fn` runs when the check fails.
 */
export async function withLockedEnrollment<T>(
  tx: Prisma.TransactionClient,
  params: { enrollmentId: string; studentId?: string; require: EnrollmentLockRule },
  fn: (row: LockedEnrollment) => Promise<T>,
): Promise<T> {
  const row = await lockEnrollmentRow(tx, params.enrollmentId);
  const refusal = enrollmentLockRefusal(row, params);
  if (refusal) throw new EnrollmentLockRefusal(refusal);
  return fn(row!);
}

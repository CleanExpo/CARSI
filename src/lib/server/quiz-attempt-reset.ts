import { runSerializable } from '@/lib/server/db-tx';
import { requireCurrentAdmin, type AdminSessionProvenance } from '@/lib/server/current-admin';
import { ADMIN_AUDIT_REASON_MAX } from '@/lib/server/enrollment-service';
import { withLockedEnrollment } from '@/lib/server/enrollment-row-lock';

/**
 * Admin-only: give a learner fresh attempts on a course's quizzes (GP-432). Without this a
 * learner who failed every allowed attempt was stuck for good.
 *
 * Failed attempts are VOIDED (voided_at set), never deleted: they are part of the learner's
 * record. Passed attempts are never touched. Voided attempts stop counting against
 * attemptsAllowed (countCountedQuizAttempts). The current admin is re-checked against the
 * database inside the transaction, and one append-only audit row records who, why and which
 * attempts were voided. With nothing to void, nothing is written.
 */
export async function resetQuizAttemptsForEnrollment(params: {
  enrollmentId: string;
  session: AdminSessionProvenance | null;
  reason: string;
  /** Limit the reset to one quiz of the enrolment's course; omit for every quiz. */
  quizId?: string | null;
}): Promise<{ voided: number; quizIds: string[] }> {
  const reason = params.reason.trim();
  if (!reason || reason.length > ADMIN_AUDIT_REASON_MAX) throw new Error('INVALID_REASON');

  // SERIALIZABLE, like the attempt insert (attempt/route.ts): two resets, or a reset and a new
  // attempt, cannot interleave on the same rows. A losing reset retries, finds nothing left to
  // void, and writes no audit row.
  return runSerializable(async (tx) => {
    const admin = await requireCurrentAdmin(tx, params.session);

    // Locked, and refused when missing or revoked (one owner: enrollment-row-lock.ts); the
    // void and the audit row run only inside the owner, on the checked row.
    return withLockedEnrollment(
      tx,
      { enrollmentId: params.enrollmentId, require: 'admin-change' },
      async (enrollment) => {
        const courseQuizIds = (
          await tx.lmsQuiz.findMany({ where: { courseId: enrollment.courseId }, select: { id: true } })
        ).map((q) => q.id);
        let quizIds = courseQuizIds;
        if (params.quizId) {
          if (!courseQuizIds.includes(params.quizId)) throw new Error('QUIZ_NOT_FOUND');
          quizIds = [params.quizId];
        }
        if (quizIds.length === 0) return { voided: 0, quizIds };

        const failed = await tx.lmsQuizAttempt.findMany({
          where: { quizId: { in: quizIds }, studentId: enrollment.studentId, passed: false, voidedAt: null },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        });
        if (failed.length === 0) return { voided: 0, quizIds };

        const attemptIds = failed.map((a) => a.id);
        const { count } = await tx.lmsQuizAttempt.updateMany({
          where: { id: { in: attemptIds }, studentId: enrollment.studentId, passed: false, voidedAt: null },
          data: { voidedAt: new Date() },
        });

        await tx.lmsLearnerAdminAuditEvent.create({
          data: {
            action: 'quiz_attempts_reset',
            reason,
            actorKind: admin.kind,
            actorRef: admin.ref,
            actorEmail: admin.email,
            studentRef: enrollment.studentId,
            enrollmentRef: enrollment.id,
            courseRef: enrollment.courseId,
            details: { quizIds, voidedAttemptIds: attemptIds },
          },
        });

        return { voided: count, quizIds };
      },
    );
  });
}

import type { RawQueryClient } from '@/lib/server/current-admin';

/**
 * The ONE count of a learner's quiz attempts that use up `attemptsAllowed` (GP-432).
 * An admin reset voids failed attempts (voided_at set); they stay on record but no longer
 * count. Every attempt limit and every "attempts used" figure calls this, never its own
 * COUNT, so the limit the server enforces and the number the learner sees cannot disagree.
 * Works with the Prisma client or an interactive transaction (call it inside the
 * serializable transaction that inserts the attempt).
 */
export async function countCountedQuizAttempts(
  db: RawQueryClient,
  quizId: string,
  studentId: string,
): Promise<number> {
  const rows = await db.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count
    FROM lms_quiz_attempts
    WHERE quiz_id = ${quizId}::uuid AND student_id = ${studentId}::uuid AND voided_at IS NULL`;
  return rows[0]?.count ?? 0;
}

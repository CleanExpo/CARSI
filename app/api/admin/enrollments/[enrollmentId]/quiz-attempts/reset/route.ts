import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import { NotCurrentAdminError } from '@/lib/server/current-admin';
import { resetQuizAttemptsForEnrollment } from '@/lib/server/quiz-attempt-reset';
import { readReviewAdminSession } from '@/lib/server/review-admin-session';

type RouteContext = { params: Promise<{ enrollmentId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/enrollments/:enrollmentId/quiz-attempts/reset  { reason, quizId? }
 * Admin-only (GP-432): voids the learner's failed attempts on the course's quizzes (or one
 * quiz) so they can try again, with an audit row naming the admin and the reason.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { enrollmentId } = await context.params;
  if (typeof enrollmentId !== 'string' || !UUID.test(enrollmentId)) {
    return NextResponse.json({ detail: 'Enrollment not found' }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { reason?: unknown; quizId?: unknown };
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason || reason.length > 1000) {
    return NextResponse.json(
      { detail: 'A reason (1 to 1000 characters) is required; it is kept in the audit log.' },
      { status: 400 },
    );
  }
  let quizId: string | null = null;
  if (body.quizId !== undefined && body.quizId !== null) {
    if (typeof body.quizId !== 'string' || !UUID.test(body.quizId)) {
      return NextResponse.json({ detail: 'Quiz not found for this enrolment' }, { status: 404 });
    }
    quizId = body.quizId;
  }

  try {
    const result = await resetQuizAttemptsForEnrollment({
      enrollmentId,
      session: await readReviewAdminSession(request),
      reason,
      quizId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof NotCurrentAdminError) {
      return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'ENROLLMENT_NOT_FOUND') {
      return NextResponse.json({ detail: 'Enrollment not found' }, { status: 404 });
    }
    if (msg === 'ENROLLMENT_REVOKED') {
      return NextResponse.json(
        { detail: 'This enrolment is revoked or refunded, so its quiz attempts cannot be reset.' },
        { status: 409 },
      );
    }
    if (msg === 'QUIZ_NOT_FOUND') {
      return NextResponse.json({ detail: 'Quiz not found for this enrolment' }, { status: 404 });
    }
    console.error('[admin/quiz-attempts/reset]', e);
    return NextResponse.json({ detail: 'Failed to reset quiz attempts' }, { status: 500 });
  }
}

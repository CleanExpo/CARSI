import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { ACCESS_GRANTING_STATUS_LIST } from '@/lib/server/enrollment-access';
type Ctx = { params: Promise<{ quizId: string }> };

function parseQuizOptions(raw: unknown): { text: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (typeof o === 'string') return { text: o };
      if (o && typeof o === 'object' && 'text' in o) {
        const t = (o as { text?: unknown }).text;
        return typeof t === 'string' ? { text: t } : null;
      }
      return null;
    })
    .filter((x): x is { text: string } => Boolean(x));
}

/** GET /api/lms/quizzes/[quizId] — quiz for enrolled student (no correct answers). */
export async function GET(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { quizId } = await ctx.params;

  try {
    const quiz = await prisma.lmsQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        course: { select: { id: true } },
      },
    });

    if (!quiz) {
      return NextResponse.json({ detail: 'Quiz not found' }, { status: 404 });
    }

    // Allow-set (WS3 / P0-C): only active/completed enrolments may view a quiz —
    // a revoked/refunded row is denied (the old `not: 'cancelled'` admitted it).
    const enrollment = await prisma.lmsEnrollment.findFirst({
      where: {
        studentId: claims.sub,
        courseId: quiz.courseId,
        status: { in: [...ACCESS_GRANTING_STATUS_LIST] },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ detail: 'Enrollment required' }, { status: 403 });
    }

    const attempts = await prisma.lmsQuizAttempt.count({
      where: { quizId, studentId: claims.sub },
    });

    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      pass_percentage: quiz.passPercentage,
      time_limit_minutes: quiz.timeLimitMinutes,
      attempts_allowed: quiz.attemptsAllowed,
      attempts_used: attempts,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        question_text: q.questionText,
        question_type: 'single_choice',
        options: parseQuizOptions(q.options),
        order_index: q.orderIndex,
        points: q.points,
      })),
    });
  } catch (e) {
    console.error('[quizzes GET]', e);
    return NextResponse.json({ detail: 'Failed to load quiz' }, { status: 500 });
  }
}

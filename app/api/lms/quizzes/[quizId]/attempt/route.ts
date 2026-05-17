import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';

type Ctx = { params: Promise<{ quizId: string }> };

/** POST /api/lms/quizzes/[quizId]/attempt — grade and record attempt. */
export async function POST(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { quizId } = await ctx.params;

  let body: { answers?: Record<string, number> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};

  try {
    const quiz = await prisma.lmsQuiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      return NextResponse.json({ detail: 'Quiz not found' }, { status: 404 });
    }

    const enrollment = await prisma.lmsEnrollment.findFirst({
      where: {
        studentId: claims.sub,
        courseId: quiz.courseId,
        status: { not: 'cancelled' },
      },
    });
    if (!enrollment) {
      return NextResponse.json({ detail: 'Enrollment required' }, { status: 403 });
    }

    const attemptsUsed = await prisma.lmsQuizAttempt.count({
      where: { quizId, studentId: claims.sub },
    });
    if (attemptsUsed >= quiz.attemptsAllowed) {
      return NextResponse.json({ detail: 'No attempts remaining' }, { status: 409 });
    }

    let earned = 0;
    let totalPoints = 0;
    for (const q of quiz.questions) {
      totalPoints += q.points;
      const selected = answers[q.id];
      if (typeof selected === 'number' && selected === q.correctIndex) {
        earned += q.points;
      }
    }

    const scorePercent =
      totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0;
    const passed = scorePercent >= quiz.passPercentage;

    const attempt = await prisma.lmsQuizAttempt.create({
      data: {
        quizId,
        studentId: claims.sub,
        scorePercent,
        passed,
        answers,
      },
    });

    return NextResponse.json({
      attempt_id: attempt.id,
      score_percent: scorePercent,
      passed,
      pass_percentage: quiz.passPercentage,
      attempts_remaining: Math.max(0, quiz.attemptsAllowed - attemptsUsed - 1),
    });
  } catch (e) {
    console.error('[quizzes/attempt]', e);
    return NextResponse.json({ detail: 'Failed to submit quiz' }, { status: 500 });
  }
}

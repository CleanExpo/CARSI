import { type NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { runSerializable } from '@/lib/server/db-tx';
import { ACCESS_GRANTING_STATUS_LIST } from '@/lib/server/enrollment-access';
import { computeQuizResult } from '@/lib/server/lms-completion';
import { CHECKPOINT_UUID, CheckpointError } from '@/lib/lms/lesson-checkpoint';
import { getVersionBoundQuizForAttempt, readCheckpointJsonBody } from '@/lib/server/lesson-checkpoint';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

type Ctx = { params: Promise<{ quizId: string }> };

type BoundInput = { answers: Record<string, number>; lessonId: string; contentVersion: string };

function parseBoundInput(value: unknown): BoundInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CheckpointError(400);
  const body = value as Record<string, unknown>;
  if (Object.keys(body).length !== 3 || !['answers', 'lessonId', 'contentVersion'].every((key) => Object.hasOwn(body, key)) ||
      typeof body.lessonId !== 'string' || !CHECKPOINT_UUID.test(body.lessonId) ||
      typeof body.contentVersion !== 'string' || !/^[0-9a-f]{64}$/.test(body.contentVersion) ||
      !body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) throw new CheckpointError(400);
  const answers = Object.entries(body.answers);
  if (answers.length > 200 || answers.some(([id, answer]) => !CHECKPOINT_UUID.test(id) ||
    !Number.isSafeInteger(answer) || (answer as number) < 0 || (answer as number) >= 20)) throw new CheckpointError(400);
  return body as BoundInput;
}

function boundJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function submitBound(studentId: string, quizId: string, body: unknown) {
  try {
    const input = parseBoundInput(body);
    if (getUpstreamBaseUrl() || !process.env.DATABASE_URL?.trim()) throw new CheckpointError(503);
    const result = await runSerializable(async (tx) => {
      const graph = await getVersionBoundQuizForAttempt(tx, studentId, input.lessonId, quizId, input.contentVersion);
      for (const [id, answer] of Object.entries(input.answers)) {
        const question = graph.questions.find((candidate) => candidate.id === id);
        if (!question || !Array.isArray(question.options) || answer >= question.options.length) throw new CheckpointError(400);
      }
      const counts = await tx.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count FROM lms_quiz_attempts
        WHERE quiz_id = ${quizId}::uuid AND student_id = ${studentId}::uuid`;
      const attemptsUsed = counts[0].count;
      if (attemptsUsed >= graph.quiz.attemptsAllowed) throw new CheckpointError(409);
      let earned = 0;
      let totalPoints = 0;
      let correctCount = 0;
      for (const question of graph.questions) {
        totalPoints += question.points;
        if (input.answers[question.id] === question.correctIndex) {
          earned += question.points;
          correctCount += 1;
        }
      }
      const { scorePercent, passed } = computeQuizResult(earned, totalPoints, graph.quiz.passPercentage);
      const attempts = await tx.$queryRaw<{ id: string }[]>`INSERT INTO lms_quiz_attempts
        (id, quiz_id, student_id, score_percent, passed, answers, content_version, created_at)
        VALUES (${randomUUID()}::uuid, ${quizId}::uuid, ${studentId}::uuid, ${scorePercent}, ${passed},
          ${JSON.stringify(input.answers)}::jsonb, ${graph.contentVersion}, NOW()) RETURNING id`;
      if (attempts.length !== 1) throw new CheckpointError(503);
      return { attempt_id: attempts[0].id, score_percent: scorePercent, passed,
        pass_percentage: graph.quiz.passPercentage,
        correct_count: correctCount,
        question_count: graph.questions.length,
        attempts_remaining: Math.max(0, graph.quiz.attemptsAllowed - attemptsUsed - 1) };
    });
    return boundJson(result);
  } catch (error) {
    const status = error instanceof CheckpointError ? error.status : 503;
    return boundJson({ detail: status === 400 ? 'Invalid quiz submission' : status === 404
      ? 'Quiz not found or access denied' : status === 409 ? 'Quiz submission conflict' : 'Quiz submission unavailable' }, status);
  }
}

/** POST /api/lms/quizzes/[quizId]/attempt — grade and record attempt. */
export async function POST(request: NextRequest, ctx: Ctx) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const identityPresent = request.headers.has('x-carsi-learner-id');
  if (identityPresent && request.headers.get('x-carsi-learner-id') !== claims.sub) {
    return boundJson({ detail: 'Unauthorized' }, 401);
  }

  const { quizId } = await ctx.params;

  let parsed: unknown;
  try {
    parsed = await readCheckpointJsonBody(request);
  } catch {
    return boundJson({ detail: 'Invalid JSON' }, 400);
  }

  const bindingPresent = parsed !== null && typeof parsed === 'object' &&
    (Object.hasOwn(parsed, 'lessonId') || Object.hasOwn(parsed, 'contentVersion'));
  if (identityPresent || bindingPresent) {
    if (!identityPresent) return boundJson({ detail: 'Unauthorized' }, 401);
    return submitBound(claims.sub, quizId, parsed);
  }
  if (!parsed || typeof parsed !== 'object') return boundJson({ detail: 'Invalid JSON' }, 400);
  const body = parsed as { answers?: Record<string, number> };

  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};

  try {
    const quiz = await prisma.lmsQuiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) {
      return NextResponse.json({ detail: 'Quiz not found' }, { status: 404 });
    }

    // Allow-set (WS3 / P0-C): a revoked/refunded learner cannot submit a graded
    // attempt (which would also feed the completion sync and drive a re-issue).
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

    let earned = 0;
    let totalPoints = 0;
    let correctCount = 0;
    for (const q of quiz.questions) {
      totalPoints += q.points;
      const selected = answers[q.id];
      if (typeof selected === 'number' && selected === q.correctIndex) {
        earned += q.points;
        correctCount += 1;
      }
    }

    // Pass/fail compares the UNROUNDED ratio so a raw 69.5% cannot round up
    // into a 70% pass; scorePercent stays rounded for display.
    const { scorePercent, passed } = computeQuizResult(
      earned,
      totalPoints,
      quiz.passPercentage,
    );

    // The attempt-limit guard and the insert MUST be atomic. A plain
    // count()-then-create() is a TOCTOU race: concurrent submissions all read
    // the same count, all pass the check, and all insert — blowing past
    // attemptsAllowed. SERIALIZABLE isolation makes Postgres detect the
    // read/write conflict and abort all but one racer (retried below), so the
    // limit holds under concurrency.
    const result = await runSerializable(async (tx) => {
      const attemptsUsed = await tx.lmsQuizAttempt.count({
        where: { quizId, studentId: claims.sub },
      });
      if (attemptsUsed >= quiz.attemptsAllowed) {
        return { limitReached: true as const };
      }
      const attempt = await tx.lmsQuizAttempt.create({
        data: {
          quizId,
          studentId: claims.sub,
          scorePercent,
          passed,
          answers,
        },
      });
      return { limitReached: false as const, attempt, attemptsUsed };
    });

    if (result.limitReached) {
      return NextResponse.json({ detail: 'No attempts remaining' }, { status: 409 });
    }

    return NextResponse.json({
      attempt_id: result.attempt.id,
      score_percent: scorePercent,
      passed,
      pass_percentage: quiz.passPercentage,
      correct_count: correctCount,
      question_count: quiz.questions.length,
      attempts_remaining: Math.max(0, quiz.attemptsAllowed - result.attemptsUsed - 1),
    });
  } catch (e) {
    console.error('[quizzes/attempt]', e);
    return NextResponse.json({ detail: 'Failed to submit quiz' }, { status: 500 });
  }
}

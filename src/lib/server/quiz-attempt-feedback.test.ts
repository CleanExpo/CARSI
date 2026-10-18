import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Corrective feedback on quiz attempts: both submission paths return the authored explanation for
 * each wrong answer, never the correct option, and the version-bound path reads explanations
 * after grading without touching the content version.
 */
const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  upstream: vi.fn(),
  graph: vi.fn(),
  quiz: vi.fn(),
  enrollment: vi.fn(),
  create: vi.fn(),
  count: vi.fn(),
  raw: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsQuiz: { findUnique: mocks.quiz },
    lmsEnrollment: { findFirst: mocks.enrollment },
    $transaction: mocks.transaction,
  },
}));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: mocks.upstream }));
vi.mock('@/lib/server/lesson-checkpoint', async (original) => ({
  ...(await original<typeof import('./lesson-checkpoint')>()),
  getVersionBoundQuizForAttempt: mocks.graph,
}));
import { POST } from '../../../app/api/lms/quizzes/[quizId]/attempt/route';

const studentId = '10000000-0000-4000-8000-000000000001';
const lessonId = '10000000-0000-4000-8000-000000000002';
const quizId = '10000000-0000-4000-8000-000000000003';
const q1 = '10000000-0000-4000-8000-000000000004';
const q2 = '10000000-0000-4000-8000-000000000005';
const version = 'b'.repeat(64);
const WHY = 'A reading above the dry standard for that material means it is still wet.';
const questions = [
  {
    id: q1,
    questionText: 'Which reading shows wet timber?',
    correctIndex: 1,
    points: 1,
    options: ['A', 'B'],
    explanation: WHY,
  },
  {
    id: q2,
    questionText: 'When does drying stop?',
    correctIndex: 0,
    points: 1,
    options: ['A', 'B'],
    explanation: 'At the dry standard.',
  },
];
const quiz = { id: quizId, courseId: lessonId, passPercentage: 80, attemptsAllowed: 3, questions };
const ctx = { params: Promise.resolve({ quizId }) };
const request = (value: unknown, header = true) =>
  new NextRequest('http://localhost/api/lms/quizzes/' + quizId + '/attempt', {
    method: 'POST',
    body: JSON.stringify(value),
    headers: header ? { 'x-carsi-learner-id': studentId } : {},
  });

let order: string[];
beforeEach(() => {
  vi.resetAllMocks();
  order = [];
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
  mocks.claims.mockResolvedValue({ sub: studentId });
  mocks.upstream.mockReturnValue(null);
  // The version-bound graph carries no explanation, exactly like the real loader.
  mocks.graph.mockResolvedValue({
    quiz,
    questions: questions.map(({ explanation: _e, ...q }) => q),
    contentVersion: version,
  });
  mocks.quiz.mockResolvedValue(quiz);
  mocks.enrollment.mockResolvedValue({ id: lessonId });
  mocks.count.mockResolvedValue(0);
  mocks.create.mockResolvedValue({ id: 'legacy-attempt' });
  mocks.raw.mockImplementation(async (sql: TemplateStringsArray) => {
    const text = sql.join('?');
    if (text.includes('COUNT(*)')) {
      order.push('count');
      return [{ count: 0 }];
    }
    if (text.includes('INSERT INTO')) {
      order.push('insert');
      return [{ id: 'bound-attempt' }];
    }
    if (text.includes('explanation')) {
      order.push('explain');
      return questions.map((q) => ({ id: q.id, explanation: q.explanation }));
    }
    return [];
  });
  mocks.transaction.mockImplementation(async (fn) =>
    fn({ $queryRaw: mocks.raw, lmsQuizAttempt: { count: mocks.count, create: mocks.create } })
  );
});
afterEach(() => vi.unstubAllEnvs());

describe('quiz attempt feedback', () => {
  it('version-bound path: explains the wrong answer only, after grading, without the correct option', async () => {
    const res = await POST(
      request({ lessonId, contentVersion: version, answers: { [q1]: 0, [q2]: 0 } }),
      ctx
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feedback).toEqual([
      { question_id: q1, question_text: 'Which reading shows wet timber?', explanation: WHY },
    ]);
    expect(JSON.stringify(body.feedback)).not.toMatch(/correct/i);
    expect(order).toEqual(['count', 'insert', 'explain']);
    expect(mocks.graph).toHaveBeenCalledExactlyOnceWith(
      expect.anything(),
      studentId,
      lessonId,
      quizId,
      version
    );
  });

  it('version-bound path: a fully correct attempt gets no feedback', async () => {
    const res = await POST(
      request({ lessonId, contentVersion: version, answers: { [q1]: 1, [q2]: 0 } }),
      ctx
    );
    expect((await res.json()).feedback).toEqual([]);
  });

  it('legacy path: explains each wrong or skipped answer', async () => {
    const res = await POST(request({ answers: { [q2]: 1 } }, false), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.feedback.map((f: { question_id: string }) => f.question_id)).toEqual([q1, q2]);
    expect(body.feedback[0].explanation).toBe(WHY);
    expect(JSON.stringify(body.feedback)).not.toMatch(/correct/i);
  });
});

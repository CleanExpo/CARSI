import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { CheckpointError } from '@/lib/lms/lesson-checkpoint';

const mocks = vi.hoisted(() => ({ claims: vi.fn(), upstream: vi.fn(), graph: vi.fn(),
  quiz: vi.fn(), enrollment: vi.fn(), create: vi.fn(), count: vi.fn(), raw: vi.fn(), transaction: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: {
  lmsQuiz: { findUnique: mocks.quiz }, lmsEnrollment: { findFirst: mocks.enrollment }, $transaction: mocks.transaction,
} }));
vi.mock('@/lib/server/auth-from-request', () => ({ getSessionClaimsFromRequest: mocks.claims }));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: mocks.upstream }));
vi.mock('@/lib/server/lesson-checkpoint', async (original) => ({
  ...(await original<typeof import('./lesson-checkpoint')>()), getVersionBoundQuizForAttempt: mocks.graph,
}));
import { POST } from '../../../app/api/lms/quizzes/[quizId]/attempt/route';
import { readCheckpointJsonBody } from './lesson-checkpoint';

const studentId = '10000000-0000-4000-8000-000000000001';
const lessonId = '10000000-0000-4000-8000-000000000002';
const quizId = '10000000-0000-4000-8000-000000000003';
const questionId = '10000000-0000-4000-8000-000000000004';
const version = 'a'.repeat(64);
const body = { lessonId, contentVersion: version, answers: { [questionId]: 1 } };
const quiz = { id: quizId, courseId: lessonId, passPercentage: 80, attemptsAllowed: 2,
  questions: [{ id: questionId, correctIndex: 1, points: 1, options: ['A', 'B'] }] };
const ctx = { params: Promise.resolve({ quizId }) };
function request(value: unknown, identity: string | null = studentId) {
  return new NextRequest('http://localhost/api/lms/quizzes/' + quizId + '/attempt', {
    method: 'POST', body: JSON.stringify(value), headers: identity === null ? {} : { 'x-carsi-learner-id': identity },
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/unused-no-connect');
  mocks.claims.mockResolvedValue({ sub: studentId }); mocks.upstream.mockReturnValue(null);
  mocks.graph.mockResolvedValue({ quiz, questions: quiz.questions, contentVersion: version });
  mocks.quiz.mockResolvedValue(quiz); mocks.enrollment.mockResolvedValue({ id: lessonId });
  mocks.count.mockResolvedValue(0); mocks.create.mockResolvedValue({ id: 'legacy-attempt' });
  mocks.raw.mockImplementation(async (sql: TemplateStringsArray) => sql.join('?').includes('COUNT(*)')
    ? [{ count: 0 }] : [{ id: 'bound-attempt' }]);
  mocks.transaction.mockImplementation(async (fn, options) => {
    expect(options.isolationLevel).toBe('Serializable');
    return fn({ $queryRaw: mocks.raw, lmsQuizAttempt: { count: mocks.count, create: mocks.create } });
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('version-bound quiz attempts', () => {
  it('grades and inserts the server-generated token inside the same transaction', async () => {
    const result = await POST(request(body), ctx);
    expect(result.status).toBe(200);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(await result.json()).toEqual({ attempt_id: 'bound-attempt', score_percent: 100, passed: true,
      pass_percentage: 80, correct_count: 1, question_count: 1, attempts_remaining: 1 });
    expect(mocks.graph).toHaveBeenCalledExactlyOnceWith(expect.anything(), studentId, lessonId, quizId, version);
    const insert = mocks.raw.mock.calls.find(([sql]) => sql.join('?').includes('INSERT INTO'))!;
    expect(insert[0].join('?')).toContain('content_version');
    expect(insert.slice(1)).toContain(version);
    expect(mocks.quiz).not.toHaveBeenCalled(); expect(mocks.enrollment).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each(['', 'foreign-student'])('rejects identity mismatch %s before reads or writes', async (identity) => {
    expect((await POST(request(body, identity), ctx)).status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled(); expect(mocks.quiz).not.toHaveBeenCalled();
  });
  it('requires a learner identity for bodies selecting binding without a header', async () => {
    expect((await POST(request(body, null), ctx)).status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled(); expect(mocks.quiz).not.toHaveBeenCalled();
  });
  it.each([null, [], { answers: {} }, { lessonId, answers: {} }, { contentVersion: version, answers: {} },
    { ...body, extra: true }, { ...body, lessonId: 'bad' }, { ...body, contentVersion: 'A'.repeat(64) },
    { ...body, answers: null }, { ...body, answers: [] }, { ...body, answers: { unknown: 0 } },
    { ...body, answers: { [questionId]: -1 } }, { ...body, answers: { [questionId]: 0.5 } },
    { ...body, answers: { [questionId]: Number.MAX_SAFE_INTEGER + 1 } },
  ])('rejects closed-schema malformed binding %# before grading reads', async (candidate) => {
    expect((await POST(request(candidate), ctx)).status).toBe(400);
    expect(mocks.graph).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it('bounds answer count at 200', async () => {
    const answers = Object.fromEntries(Array.from({ length: 201 }, (_, i) =>
      [`10000000-0000-4000-8000-${String(i).padStart(12, '0')}`, 0]));
    expect((await POST(request({ ...body, answers }), ctx)).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each([{ [lessonId]: 0 }, { [questionId]: 2 }])('rejects unknown or out-of-bounds native answer %# before count/insert', async (answers) => {
    expect((await POST(request({ ...body, answers }), ctx)).status).toBe(400);
    expect(mocks.raw).not.toHaveBeenCalled();
  });
  it('rejects mismatched content after locked graph validation', async () => {
    mocks.graph.mockRejectedValue(new CheckpointError(409));
    expect((await POST(request(body), ctx)).status).toBe(409);
    expect(mocks.raw).not.toHaveBeenCalled();
  });
  it('keeps entitlement denial before attempt writes', async () => {
    mocks.graph.mockRejectedValue(new CheckpointError(404));
    expect((await POST(request(body), ctx)).status).toBe(404);
    expect(mocks.raw).not.toHaveBeenCalled();
  });
  it('fails upstream bound submissions closed', async () => {
    mocks.upstream.mockReturnValue('https://synthetic.invalid');
    expect((await POST(request(body), ctx)).status).toBe(503);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it('rejects exhausted attempt limits before insert', async () => {
    mocks.raw.mockResolvedValue([{ count: 2 }]);
    expect((await POST(request(body), ctx)).status).toBe(409);
    expect(mocks.raw).toHaveBeenCalledTimes(1);
  });
  it('revalidates binding on bounded serialization retries', async () => {
    mocks.raw.mockRejectedValueOnce({ code: 'P2034' });
    const result = await POST(request(body), ctx);
    expect(result.status).toBe(200); expect(mocks.graph).toHaveBeenCalledTimes(2);
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
  it('does not reuse a pre-retry grading graph after a content edit', async () => {
    mocks.raw.mockRejectedValueOnce({ code: 'P2034' });
    mocks.graph.mockResolvedValueOnce({ quiz, questions: quiz.questions, contentVersion: version })
      .mockRejectedValueOnce(new CheckpointError(409));
    expect((await POST(request(body), ctx)).status).toBe(409);
    expect(mocks.transaction).toHaveBeenCalledTimes(2); expect(mocks.raw).toHaveBeenCalledTimes(1);
  });
  it('returns generic infrastructure failure without rewriting history', async () => {
    mocks.raw.mockRejectedValue(new Error('private connection credentials'));
    const result = await POST(request(body), ctx);
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain('credentials'); expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe('bounded request stream', () => {
  it('counts actual multibyte UTF-8 bytes rather than characters or Content-Length', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify('é'.repeat(33000)),
      headers: { 'content-length': '1' } });
    await expect(readCheckpointJsonBody(req)).rejects.toMatchObject({ status: 400 });
  });
  it('accepts exactly 64KiB and rejects one additional streamed byte', async () => {
    const exact = JSON.stringify('a'.repeat(65534));
    expect(new TextEncoder().encode(exact).length).toBe(65536);
    await expect(readCheckpointJsonBody(new Request('http://localhost', { method: 'POST', body: exact }))).resolves.toHaveLength(65534);
    const stream = new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode(exact)); controller.enqueue(new Uint8Array([32])); controller.close();
    } });
    const streamed = new Request('http://localhost', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
    await expect(readCheckpointJsonBody(streamed)).rejects.toMatchObject({ status: 400 });
  });
  it('rejects oversized attempts with dishonest Content-Length before transaction', async () => {
    const req = request({ ...body, padding: 'a'.repeat(65536) }); req.headers.set('content-length', '1');
    expect((await POST(req, ctx)).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe('headerless legacy attempt compatibility', () => {
  it('retains grading outputs and leaves content version unbound', async () => {
    const result = await POST(request({ answers: { [questionId]: 1 } }, null), ctx);
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ attempt_id: 'legacy-attempt', score_percent: 100, passed: true,
      pass_percentage: 80, correct_count: 1, question_count: 1, attempts_remaining: 1 });
    expect(mocks.create).toHaveBeenCalledWith({ data: { quizId, studentId, scorePercent: 100, passed: true,
      answers: { [questionId]: 1 } } });
    expect(mocks.graph).not.toHaveBeenCalled(); expect(mocks.raw).not.toHaveBeenCalled();
  });
  it('retains legacy entitlement rejection', async () => {
    mocks.enrollment.mockResolvedValue(null);
    expect((await POST(request({ answers: {} }, null), ctx)).status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it('retains legacy atomic attempt limit', async () => {
    mocks.count.mockResolvedValue(2);
    expect((await POST(request({ answers: {} }, null), ctx)).status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

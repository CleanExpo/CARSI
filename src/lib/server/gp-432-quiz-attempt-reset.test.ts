import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * GP-432 path 5: a learner who failed a quiz on every allowed attempt was stuck for good.
 * An admin can now give fresh attempts: POST /api/admin/enrollments/:id/quiz-attempts/reset
 * with a reason. Failed attempts are VOIDED (kept on record, voided_at set), never deleted;
 * passed attempts are never touched; one audit row names the admin, the reason and the
 * attempts voided. Every attempt counter ignores voided attempts, through one helper.
 */

const ADMIN_ID = '40000000-0000-4000-8000-000000000001';
const STUDENT_ID = '40000000-0000-4000-8000-000000000002';
const ENROLLMENT_ID = '40000000-0000-4000-8000-000000000003';
const COURSE_ID = '40000000-0000-4000-8000-000000000004';
const QUIZ_ID = '40000000-0000-4000-8000-000000000005';
const OTHER_QUIZ_ID = '40000000-0000-4000-8000-000000000006';

type Attempt = { id: string; quizId: string; studentId: string; passed: boolean; voidedAt: Date | null };

const state = vi.hoisted(() => ({
  enrollment: null as null | { id: string; studentId: string; courseId: string },
  quizzes: [] as Array<{ id: string }>,
  attempts: [] as Attempt[],
  audits: [] as Array<Record<string, unknown>>,
  adminSession: true,
}));

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: vi.fn(async () => (state.adminSession ? { email: 'admin@example.test' } : null)),
}));
vi.mock('@/lib/server/review-admin-session', () => ({
  readReviewAdminSession: vi.fn(async () => ({ via: 'lms_session', userId: ADMIN_ID, email: 'admin@example.test' })),
}));
vi.mock('@/lib/server/current-admin', async (original) => ({
  ...(await original<typeof import('@/lib/server/current-admin')>()),
  requireCurrentAdmin: vi.fn(async () => ({ kind: 'lms_admin', ref: ADMIN_ID, email: 'admin@example.test' })),
}));

function matches(a: Attempt, where: { id?: { in: string[] }; quizId?: { in: string[] }; studentId?: string; passed?: boolean; voidedAt?: null }) {
  return (!where.id || where.id.in.includes(a.id)) &&
    (!where.quizId || where.quizId.in.includes(a.quizId)) &&
    (where.studentId === undefined || a.studentId === where.studentId) &&
    (where.passed === undefined || a.passed === where.passed) &&
    (where.voidedAt === undefined || a.voidedAt === null);
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: { findUnique: vi.fn(async () => state.enrollment) },
    lmsQuiz: { findMany: vi.fn(async () => state.quizzes) },
    lmsQuizAttempt: {
      findMany: vi.fn(async (args: { where: Parameters<typeof matches>[1] }) =>
        state.attempts.filter((a) => matches(a, args.where)).map((a) => ({ id: a.id, quizId: a.quizId }))),
      updateMany: vi.fn(async (args: { where: Parameters<typeof matches>[1]; data: { voidedAt: Date } }) => {
        let count = 0;
        for (const a of state.attempts) {
          if (matches(a, args.where)) {
            a.voidedAt = args.data.voidedAt;
            count += 1;
          }
        }
        return { count };
      }),
    },
    lmsLearnerAdminAuditEvent: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.audits.push(args.data);
        return args.data;
      }),
    },
    async $transaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn(this);
    },
  },
}));

const route = await import('../../../app/api/admin/enrollments/[enrollmentId]/quiz-attempts/reset/route');
const { countCountedQuizAttempts } = await import('./quiz-attempt-count');

const ctx = { params: Promise.resolve({ enrollmentId: ENROLLMENT_ID }) };
function request(body: unknown) {
  return new NextRequest(`http://localhost/api/admin/enrollments/${ENROLLMENT_ID}/quiz-attempts/reset`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  state.enrollment = { id: ENROLLMENT_ID, studentId: STUDENT_ID, courseId: COURSE_ID };
  state.quizzes = [{ id: QUIZ_ID }, { id: OTHER_QUIZ_ID }];
  state.attempts = [
    { id: 'a1', quizId: QUIZ_ID, studentId: STUDENT_ID, passed: false, voidedAt: null },
    { id: 'a2', quizId: QUIZ_ID, studentId: STUDENT_ID, passed: false, voidedAt: null },
    { id: 'a3', quizId: QUIZ_ID, studentId: STUDENT_ID, passed: false, voidedAt: null },
    { id: 'a4', quizId: OTHER_QUIZ_ID, studentId: STUDENT_ID, passed: true, voidedAt: null },
  ];
  state.audits = [];
  state.adminSession = true;
});

describe('GP-432 path 5: admin quiz-attempt reset', () => {
  it('refuses a caller with no admin session', async () => {
    state.adminSession = false;
    const res = await route.POST(request({ reason: 'Learner asked for another go' }), ctx);
    expect(res.status).toBe(401);
    expect(state.attempts.every((a) => a.voidedAt === null)).toBe(true);
    expect(state.audits).toEqual([]);
  });

  it.each([undefined, '', '  '])('refuses without a reason (%j)', async (reason) => {
    const res = await route.POST(request({ reason }), ctx);
    expect(res.status).toBe(400);
    expect(state.attempts.every((a) => a.voidedAt === null)).toBe(true);
    expect(state.audits).toEqual([]);
  });

  it('refuses an admin the database no longer recognises, before any write', async () => {
    const { requireCurrentAdmin, NotCurrentAdminError } = await import('@/lib/server/current-admin');
    vi.mocked(requireCurrentAdmin).mockRejectedValueOnce(new NotCurrentAdminError());
    const res = await route.POST(request({ reason: 'Learner asked for another go' }), ctx);
    expect(res.status).toBe(403);
    expect(state.attempts.every((a) => a.voidedAt === null)).toBe(true);
    expect(state.audits).toEqual([]);
  });

  it('voids the failed attempts, keeps the passed one, and writes one audit row with the admin id and reason', async () => {
    const res = await route.POST(request({ reason: 'Three failed attempts; reviewed the material with the learner' }), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, voided: 3 });
    expect(state.attempts.filter((a) => a.voidedAt !== null).map((a) => a.id)).toEqual(['a1', 'a2', 'a3']);
    expect(state.attempts.find((a) => a.id === 'a4')?.voidedAt).toBeNull();
    expect(state.audits).toHaveLength(1);
    expect(state.audits[0]).toMatchObject({
      action: 'quiz_attempts_reset',
      reason: 'Three failed attempts; reviewed the material with the learner',
      actorKind: 'lms_admin',
      actorRef: ADMIN_ID,
      actorEmail: 'admin@example.test',
      studentRef: STUDENT_ID,
      enrollmentRef: ENROLLMENT_ID,
      courseRef: COURSE_ID,
      details: { quizIds: [QUIZ_ID, OTHER_QUIZ_ID], voidedAttemptIds: ['a1', 'a2', 'a3'] },
    });
  });

  it('a quizId outside the enrolment course is refused', async () => {
    const res = await route.POST(
      request({ reason: 'Learner asked', quizId: '40000000-0000-4000-8000-0000000000ff' }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(state.audits).toEqual([]);
  });

  it('an unknown enrolment is 404 and writes nothing', async () => {
    state.enrollment = null;
    const res = await route.POST(request({ reason: 'Learner asked' }), ctx);
    expect(res.status).toBe(404);
    expect(state.audits).toEqual([]);
  });
});

describe('GP-432 path 5: every attempt counter ignores voided attempts', () => {
  it('the one counting helper excludes voided attempts', async () => {
    const seen: string[] = [];
    const db = {
      $queryRaw: async (strings: TemplateStringsArray) => {
        seen.push(strings.join('?'));
        return [{ count: 0 }];
      },
    };
    await countCountedQuizAttempts(db, QUIZ_ID, STUDENT_ID);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatch(/FROM\s+lms_quiz_attempts/i);
    expect(seen[0]).toMatch(/voided_at\s+IS\s+NULL/i);
  });

  it('no attempt count is taken anywhere except that helper', () => {
    const root = join(__dirname, '..', '..', '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === 'generated' || name.startsWith('.')) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
        const rel = relative(root, path);
        if (rel === join('src', 'lib', 'server', 'quiz-attempt-count.ts')) continue;
        const text = readFileSync(path, 'utf8');
        if (/lmsQuizAttempt\.count\s*\(/.test(text) || /COUNT\([^)]*\)[^`]*FROM\s+lms_quiz_attempts/i.test(text)) {
          offenders.push(rel);
        }
      }
    };
    walk(join(root, 'app'));
    walk(join(root, 'src'));
    expect(offenders).toEqual([]);
  });
});

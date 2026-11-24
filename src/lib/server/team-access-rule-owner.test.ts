import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-787 behaviour: older "has access" checks follow the one access rule (`enrollment-access.ts`).
 * Queries run against a small in-memory table that evaluates the Prisma `where` the code really
 * sends. Items 1, 2 and 4 (the owner check and a failed seat preparation in
 * `addCourseTeamMemberByEmail`, and the older seat count that depends on that owner check) are
 * held back for the GP-759 branch, which changes that function.
 */

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  enrolments: [] as Array<Record<string, unknown>>,
}));

function cmp(v: unknown, cond: unknown): boolean {
  if (cond === null || typeof cond !== 'object') return (v ?? null) === cond;
  const c = cond as Record<string, unknown>;
  return Object.entries(c).every(([k, x]) => {
    switch (k) {
      case 'in': return (x as unknown[]).includes(v);
      case 'notIn': return !(x as unknown[]).includes(v);
      case 'not': return !cmp(v, x);
      case 'equals': return v === x;
      default: return false;
    }
  });
}
function match(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, cond]) => cmp(row[k], cond));
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: {
      findMany: async (a: { where?: Row }) => db.enrolments.filter((r) => match(r, a.where)).map((r) => ({ ...r })),
    },
    lmsLesson: { findMany: async () => [] },
    lmsLessonProgress: { findMany: async () => [] },
  },
}));

const { prismaLearningPathStore } = await import('./carsi-coaching-learning-path');

describe('GP-787 item 3: the coaching learning path follows the access rule', () => {
  beforeEach(() => {
    const at = new Date(Date.UTC(2026, 10, 1));
    db.enrolments = [
      { studentId: 'u1', courseId: 'c-done', status: 'completed', completedAt: at },
      { studentId: 'u1', courseId: 'c-revoked', status: 'revoked', completedAt: at },
      { studentId: 'u1', courseId: 'c-cancelled', status: 'cancelled', completedAt: at },
      { studentId: 'u1', courseId: 'c-refunded', status: 'refunded', completedAt: at },
    ];
  });

  it('counts a course as completed only while the enrolment grants access', async () => {
    const ids = await prismaLearningPathStore.completedCourseIds('u1');
    expect([...ids]).toEqual(['c-done']);
  });

  it('shows no enrolment or completion for an enrolment without access', async () => {
    const progress = await prismaLearningPathStore.courseProgress('u1', ['c-done', 'c-revoked', 'c-cancelled', 'c-refunded']);
    expect(progress.get('c-done')).toMatchObject({ enrolled: true, completed: true });
    for (const id of ['c-revoked', 'c-cancelled', 'c-refunded']) {
      expect(progress.get(id), id).toMatchObject({ enrolled: false, completed: false });
    }
  });
});

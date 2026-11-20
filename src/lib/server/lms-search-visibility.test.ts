import { describe, expect, it } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { lmsSearchVisibilityWhere } from '@/lib/server/lms-search-visibility';

const learner: SessionClaims = { sub: 'u-1', email: 'a@example.com', full_name: 'A', role: 'student' };

/** Minimal evaluator for the two filter shapes this module emits. */
function visible(
  where: ReturnType<typeof lmsSearchVisibilityWhere>,
  course: { status: string; enrolledStudentIds: string[] }
): boolean {
  const clauses = where.OR;
  if (!Array.isArray(clauses)) return true;
  return clauses.some((clause) => {
    if (clause.status) {
      const want = (clause.status as { equals: string }).equals;
      return course.status.toLowerCase() === want;
    }
    if (clause.enrollments) {
      const sid = (clause.enrollments as { some: { studentId: string } }).some.studentId;
      return course.enrolledStudentIds.includes(sid);
    }
    return false;
  });
}

describe('lmsSearchVisibilityWhere', () => {
  it('hides an unlisted or draft course from a learner who is not enrolled', () => {
    const where = lmsSearchVisibilityWhere(learner);
    expect(visible(where, { status: 'unlisted', enrolledStudentIds: [] })).toBe(false);
    expect(visible(where, { status: 'draft', enrolledStudentIds: ['someone-else'] })).toBe(false);
  });

  it('shows published courses and the learner own unlisted enrolment', () => {
    const where = lmsSearchVisibilityWhere(learner);
    expect(visible(where, { status: 'published', enrolledStudentIds: [] })).toBe(true);
    expect(visible(where, { status: 'unlisted', enrolledStudentIds: ['u-1'] })).toBe(true);
  });

  it('applies no filter for admins only (instructors are filtered like learners)', () => {
    expect(lmsSearchVisibilityWhere({ ...learner, role: 'admin' })).toEqual({});
    expect(lmsSearchVisibilityWhere({ ...learner, role: 'instructor' }).OR).toBeDefined();
  });
});

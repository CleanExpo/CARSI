import { describe, expect, it } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';
import { lmsSearchVisibilityWhere } from '@/lib/server/lms-search-visibility';

const learner: SessionClaims = { sub: 'u-1', email: 'a@example.com', full_name: 'A', role: 'student' };

type Enrolment = { studentId: string; status: string };
type Course = { status: string; enrollments: Enrolment[] };

type StatusFilter = { equals?: string; in?: readonly string[]; mode?: string };

function statusMatches(value: string, filter: StatusFilter | undefined): boolean {
  if (!filter) return true;
  const v = filter.mode === 'insensitive' ? value.toLowerCase() : value;
  if (filter.equals !== undefined && v !== filter.equals) return false;
  if (filter.in !== undefined && !filter.in.includes(v)) return false;
  return true;
}

/**
 * Evaluates the filter this module emits against an in-memory course: every key of a
 * clause must hold (course status and the enrolment relation, including the enrolment
 * status). An unknown key fails, so a new filter shape cannot pass silently.
 */
function clauseHolds(clause: Record<string, unknown>, course: Course): boolean {
  return Object.entries(clause).every(([key, value]) => {
    if (key === 'status') return statusMatches(course.status, value as StatusFilter);
    if (key === 'enrollments') {
      const some = (value as { some: { studentId: string; status?: StatusFilter } }).some;
      return course.enrollments.some(
        (e) => e.studentId === some.studentId && statusMatches(e.status, some.status)
      );
    }
    return false;
  });
}

function visible(where: ReturnType<typeof lmsSearchVisibilityWhere>, course: Course): boolean {
  const clauses = where.OR;
  if (!Array.isArray(clauses)) return true;
  return clauses.some((clause) => clauseHolds(clause as Record<string, unknown>, course));
}

const enrolled = (status: string): Enrolment[] => [{ studentId: 'u-1', status }];

describe('lmsSearchVisibilityWhere', () => {
  it('hides an unlisted or draft course from a learner who is not enrolled', () => {
    const where = lmsSearchVisibilityWhere(learner);
    expect(visible(where, { status: 'unlisted', enrollments: [] })).toBe(false);
    expect(
      visible(where, { status: 'draft', enrollments: [{ studentId: 'someone-else', status: 'active' }] })
    ).toBe(false);
  });

  it('shows published courses and the learner own active or completed unlisted enrolment', () => {
    const where = lmsSearchVisibilityWhere(learner);
    expect(visible(where, { status: 'published', enrollments: [] })).toBe(true);
    expect(visible(where, { status: 'unlisted', enrollments: enrolled('active') })).toBe(true);
    expect(visible(where, { status: 'unlisted', enrollments: enrolled('completed') })).toBe(true);
  });

  it.each(['revoked', 'refunded', 'cancelled', 'pending', 'disputed'])(
    'hides an unlisted course whose only enrolment for the learner is %s',
    (status) => {
      const where = lmsSearchVisibilityWhere(learner);
      expect(visible(where, { status: 'unlisted', enrollments: enrolled(status) })).toBe(false);
    }
  );

  it('hides a draft course even from a learner with an active enrolment', () => {
    const where = lmsSearchVisibilityWhere(learner);
    expect(visible(where, { status: 'draft', enrollments: enrolled('active') })).toBe(false);
  });

  it('applies no filter for admins only (instructors are filtered like learners)', () => {
    expect(lmsSearchVisibilityWhere({ ...learner, role: 'admin' })).toEqual({});
    expect(lmsSearchVisibilityWhere({ ...learner, role: 'instructor' }).OR).toBeDefined();
  });
});

import { describe, expect, it } from 'vitest';

import type { AdminDashboardUserEntry } from '@/lib/admin/admin-dashboard-data';

import { matchesAdminUserSegment, parseAdminUserSegment } from './admin-user-segments';

function user(partial: Partial<AdminDashboardUserEntry>): AdminDashboardUserEntry {
  return {
    userId: 'u1',
    email: 'a@example.com',
    fullName: 'Ada',
    role: 'student',
    isActive: true,
    isVerified: true,
    iicrcMemberNumber: null,
    iicrcExpiryDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastActiveAt: '2026-09-01T00:00:00.000Z',
    overallCompletionPct: 100,
    enrollmentCount: 1,
    completedCourseCount: 1,
    activeCourseCount: 0,
    neverStartedCount: 0,
    boughtNotStartedCount: 0,
    paidEnrollmentCount: 1,
    certificatesCount: 1,
    spentAud: 49,
    ...partial,
  };
}

const now = new Date('2026-09-17T00:00:00.000Z');

describe('matchesAdminUserSegment', () => {
  it('Active and In progress are 1–99% overall, not 0 or 100', () => {
    const mid = user({ overallCompletionPct: 40, enrollmentCount: 1, completedCourseCount: 0 });
    const zero = user({ overallCompletionPct: 0, enrollmentCount: 1, completedCourseCount: 0 });
    const done = user({ overallCompletionPct: 100, enrollmentCount: 1, completedCourseCount: 1 });
    expect(matchesAdminUserSegment(mid, 'active', now)).toBe(true);
    expect(matchesAdminUserSegment(mid, 'in_progress', now)).toBe(true);
    expect(matchesAdminUserSegment(zero, 'active', now)).toBe(false);
    expect(matchesAdminUserSegment(done, 'active', now)).toBe(false);
    expect(matchesAdminUserSegment(done, 'in_progress', now)).toBe(false);
  });

  it('Bought, not started is enrolled at 0%', () => {
    const unopened = user({
      overallCompletionPct: 0,
      enrollmentCount: 1,
      completedCourseCount: 0,
    });
    const empty = user({ overallCompletionPct: 0, enrollmentCount: 0 });
    const mid = user({ overallCompletionPct: 20, enrollmentCount: 1 });
    expect(matchesAdminUserSegment(unopened, 'never_started', now)).toBe(true);
    expect(matchesAdminUserSegment(empty, 'never_started', now)).toBe(false);
    expect(matchesAdminUserSegment(mid, 'never_started', now)).toBe(false);
  });

  it('Completed a course is 100% overall', () => {
    const done = user({ overallCompletionPct: 100, enrollmentCount: 2, completedCourseCount: 2 });
    const mixed = user({ overallCompletionPct: 50, enrollmentCount: 2, completedCourseCount: 1 });
    expect(matchesAdminUserSegment(done, 'completed', now)).toBe(true);
    expect(matchesAdminUserSegment(mixed, 'completed', now)).toBe(false);
  });

  it('Incomplete is 0–99% with at least one enrolment', () => {
    const zero = user({ overallCompletionPct: 0, enrollmentCount: 1 });
    const mid = user({ overallCompletionPct: 50, enrollmentCount: 2, completedCourseCount: 1 });
    const done = user({ overallCompletionPct: 100, enrollmentCount: 1 });
    const empty = user({ overallCompletionPct: 0, enrollmentCount: 0 });
    expect(matchesAdminUserSegment(zero, 'incomplete', now)).toBe(true);
    expect(matchesAdminUserSegment(mid, 'incomplete', now)).toBe(true);
    expect(matchesAdminUserSegment(done, 'incomplete', now)).toBe(false);
    expect(matchesAdminUserSegment(empty, 'incomplete', now)).toBe(false);
  });

  it('Account off is the LMS flag', () => {
    expect(matchesAdminUserSegment(user({ isActive: false }), 'inactive', now)).toBe(true);
    expect(matchesAdminUserSegment(user({ isActive: true }), 'inactive', now)).toBe(false);
  });

  it('New this month uses createdAt', () => {
    expect(
      matchesAdminUserSegment(user({ createdAt: '2026-09-02T00:00:00.000Z' }), 'new', now)
    ).toBe(true);
    expect(
      matchesAdminUserSegment(user({ createdAt: '2026-08-20T00:00:00.000Z' }), 'new', now)
    ).toBe(false);
  });
});

describe('parseAdminUserSegment', () => {
  it('falls back to all on junk', () => {
    expect(parseAdminUserSegment('nope')).toBe('all');
    expect(parseAdminUserSegment('active')).toBe('active');
  });
});

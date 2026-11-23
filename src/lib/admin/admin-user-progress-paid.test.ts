import { describe, expect, it, vi } from 'vitest';

// The mapper is pure; the module also imports the database client, which this test never uses.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { mapUserToAdminProgress } from './admin-user-progress';

// GP-763: the users list and user detail read "paid" and "spent" from mapUserToAdminProgress.
// After the July price import a course that was free now has a price, so a learner's past
// free, admin or team enrolment must not show as paid or be valued at today's $49.

const user = {
  id: 'u1',
  email: 'learner@example.com',
  fullName: 'Learner',
  role: 'student',
  isActive: true,
  isVerified: true,
  iicrcMemberNumber: null,
  iicrcExpiryDate: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function enrolment(id: string, paymentReference: string | null, status = 'active') {
  return {
    id,
    studentId: 'u1',
    courseId: `c-${id}`,
    status,
    paymentReference,
    enrolledAt: new Date('2026-11-05T00:00:00.000Z'),
    completedAt: null,
    certificateIssuedAt: null,
    // The course as it reads AFTER the import: no longer free, priced at $49.
    course: {
      id: `c-${id}`,
      slug: `course-${id}`,
      title: `Course ${id}`,
      iicrcDiscipline: null,
      isFree: false,
      priceAud: 49,
      modules: [{ lessons: [{ id: `l-${id}` }] }],
    },
  };
}

function map(rows: ReturnType<typeof enrolment>[]) {
  return mapUserToAdminProgress(user, rows, new Map(), new Map(), null);
}

describe('mapUserToAdminProgress paid status (GP-763)', () => {
  it('a learner with only free, admin and team enrolments has not paid and spent $0', () => {
    const p = map([
      enrolment('a', 'free'),
      enrolment('b', 'admin:full-access'),
      enrolment('c', 'team:t1'),
      enrolment('d', 'membership:u1'),
    ]);
    expect(p.paidEnrollmentCount).toBe(0);
    expect(p.boughtNotStartedCount).toBe(0);
    expect(p.spentAud).toBe(0);
    expect(p.enrollments.map((e) => e.paidViaStripe)).toEqual([false, false, false, false]);
  });

  it('a Stripe purchase is paid but never valued at the current list price', () => {
    const p = map([
      enrolment('a', 'cs_live_1'),
      enrolment('b', 'free'),
      enrolment('c', 'cs_live_2', 'refunded'),
    ]);
    expect(p.paidEnrollmentCount).toBe(1);
    expect(p.boughtNotStartedCount).toBe(1);
    expect(p.spentAud).toBeNull();
    expect(p.enrollments.map((e) => e.paidViaStripe)).toEqual([true, false, false]);
  });
});

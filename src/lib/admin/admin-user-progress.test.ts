import { describe, expect, it, vi } from 'vitest';

// mapUserToAdminProgress is pure; stub the server-only imports of the module.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/admin/admin-catalog-source', () => ({ loadAdminCatalogSource: vi.fn() }));
vi.mock('@/lib/server/iicrc-renewal-communication', () => ({
  getRenewalSummaryByEnrollmentIds: vi.fn(),
}));
vi.mock('@/lib/server/course-cec-hours', () => ({ resolveLmsCourseCecHours: () => null }));

import { mapUserToAdminProgress } from './admin-user-progress';

const learner = {
  id: 'u1',
  email: 'a@example.com',
  fullName: 'Ada',
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
    enrolledAt: new Date('2026-09-01T00:00:00.000Z'),
    completedAt: null,
    certificateIssuedAt: null,
    course: {
      id: `c-${id}`,
      slug: `course-${id}`,
      title: `Course ${id}`,
      iicrcDiscipline: null,
      isFree: false,
      priceAud: 49,
      modules: [{ lessons: [{ id: 'l1' }, { id: 'l2' }] }],
    },
  };
}

function boughtNotStarted(rows: ReturnType<typeof enrolment>[]): number {
  return mapUserToAdminProgress(learner, rows, new Map(), new Map(), null).boughtNotStartedCount;
}

describe('boughtNotStartedCount (GP-766)', () => {
  it('counts an unopened seat paid through Stripe Checkout', () => {
    expect(boughtNotStarted([enrolment('a', 'cs_live_abc123')])).toBe(1);
  });

  it('ignores unopened free, discount, admin, team, membership and CCW enrolments', () => {
    const refs = [
      'free',
      'discount:d1',
      'admin:full-access',
      'team:t1',
      'team-seat:t1',
      'org:t1',
      'membership:u1',
      'ccw:attendance',
      null,
    ];
    expect(boughtNotStarted(refs.map((ref, i) => enrolment(String(i), ref)))).toBe(0);
  });

  it('ignores a refunded or revoked Stripe seat', () => {
    expect(
      boughtNotStarted([
        enrolment('r', 'cs_live_refunded', 'refunded'),
        enrolment('v', 'cs_live_revoked', 'revoked'),
      ])
    ).toBe(0);
  });
});

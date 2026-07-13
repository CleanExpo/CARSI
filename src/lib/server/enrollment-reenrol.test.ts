import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';

/**
 * WS3 (P0-C) review fix — re-purchase after a refund must REACTIVATE the revoked
 * enrolment, not lock the paying customer out. enrollStudentInCourse runs only
 * after a verified payment (or a free-course enrol), so a revoked row it finds is
 * safe to reactivate; an active/completed row is a genuine duplicate.
 */
const state = vi.hoisted(() => ({
  enrollment: null as { id: string; status: string; paymentReference?: string; completedAt: Date | null; certificateIssuedAt: Date | null } | null,
  created: null as Record<string, unknown> | null,
}));

vi.mock('@/lib/server/lms-user-sync', () => ({ ensureLmsUserFromClaims: vi.fn(async () => {}) }));
vi.mock('@/lib/server/course-catalog-sync', () => ({
  getOrCreateCourseBySlug: vi.fn(async () => ({ id: 'crs', slug: 's', isFree: false, priceAud: 100 })),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: {
      findUnique: vi.fn(async () => state.enrollment),
      update: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.enrollment = { ...(state.enrollment as NonNullable<typeof state.enrollment>), ...args.data };
        return state.enrollment;
      }),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        state.created = args.data;
        return { id: args.data.id };
      }),
    },
  },
}));

const { enrollStudentInCourse } = await import('./enrollment-service');

const claims: SessionClaims = { sub: 'stu', email: 'a@b.c', full_name: 'A', role: 'student' };

beforeEach(() => {
  vi.clearAllMocks();
  state.enrollment = null;
  state.created = null;
});

describe('enrollStudentInCourse — re-purchase after refund', () => {
  it('reactivates a revoked enrolment on a fresh fulfilment (customer not locked out)', async () => {
    state.enrollment = {
      id: 'enr-1',
      status: 'revoked',
      completedAt: new Date('2026-01-01T00:00:00.000Z'),
      certificateIssuedAt: null,
    };
    const res = await enrollStudentInCourse(claims, 's', 'cs_new_payment');
    expect(res).toEqual({ enrollmentId: 'enr-1', courseId: 'crs' });
    expect(state.enrollment?.status).toBe('active');
    expect(state.enrollment?.paymentReference).toBe('cs_new_payment');
    expect(state.enrollment?.completedAt).toBeNull();
  });

  it('leaves an active enrolment as already_enrolled (genuine duplicate)', async () => {
    state.enrollment = { id: 'enr-2', status: 'active', completedAt: null, certificateIssuedAt: null };
    expect(await enrollStudentInCourse(claims, 's', 'cs_dup')).toBe('already_enrolled');
    expect(state.enrollment?.status).toBe('active');
  });

  it('leaves a completed enrolment as already_enrolled (keeps its certificate)', async () => {
    state.enrollment = {
      id: 'enr-3',
      status: 'completed',
      completedAt: new Date('2026-01-01T00:00:00.000Z'),
      certificateIssuedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    expect(await enrollStudentInCourse(claims, 's', 'cs_dup2')).toBe('already_enrolled');
    expect(state.enrollment?.certificateIssuedAt).not.toBeNull();
  });

  it('creates a fresh active enrolment when none exists', async () => {
    const res = await enrollStudentInCourse(claims, 's', 'cs_first');
    expect(res).toMatchObject({ courseId: 'crs' });
    expect(state.created).toMatchObject({
      status: 'active',
      paymentReference: 'cs_first',
      studentId: 'stu',
      courseId: 'crs',
    });
  });
});

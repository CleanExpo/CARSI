import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';

/**
 * DECISIONS #41 — `enrollStudentInCourse` refuses to ISSUE an enrolment that skips a
 * prerequisite, but never refuses a Stripe-paid fulfilment (checkout is the paid gate),
 * never re-checks an existing live enrolment, and lets admins through.
 */
const L2 = 'level-2-mould-remediation-30ee3492';

const state = vi.hoisted(() => ({
  existing: null as { id: string; status: string } | null,
  completedPrereq: false,
  created: 0,
  lastGated: undefined as boolean | undefined,
}));

vi.mock('@/lib/server/lms-user-sync', () => ({ ensureLmsUserFromClaims: vi.fn(async () => {}) }));
vi.mock('@/lib/server/course-catalog-sync', () => ({
  getOrCreateCourseBySlug: vi.fn(async () => ({
    id: 'crs-mould',
    slug: 'mould-remediation-fundamentals',
    isFree: false,
    priceAud: 99,
    meta: { prerequisites: [{ courseSlug: 'level-2-mould-remediation-30ee3492' }] },
  })),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: {
      findMany: vi.fn(async () => [{ id: 'crs-l2', slug: L2, title: 'Level 2 — Mould Remediation' }]),
    },
    lmsEnrollment: {
      findUnique: vi.fn(async () => state.existing),
      findMany: vi.fn(async () => (state.completedPrereq ? [{ courseId: 'crs-l2' }] : [])),
      update: vi.fn(async () => ({})),
      create: vi.fn(async (args: { data: { id: string; prerequisiteGated?: boolean } }) => {
        state.created += 1;
        state.lastGated = args.data.prerequisiteGated;
        return { id: args.data.id };
      }),
    },
  },
}));

const { enrollStudentInCourse } = await import('./enrollment-service');
const { PrerequisiteNotMetError } = await import('./course-prerequisites');

const student: SessionClaims = { sub: 'stu', email: 'a@b.c', full_name: 'A', role: 'student' };
const admin: SessionClaims = { ...student, role: 'admin' };

beforeEach(() => {
  state.existing = null;
  state.completedPrereq = false;
  state.created = 0;
  state.lastGated = undefined;
});

describe('enrollStudentInCourse — prerequisite gate', () => {
  it('blocks a free/membership enrolment when the prerequisite is not completed', async () => {
    await expect(enrollStudentInCourse(student, 'mould-remediation-fundamentals', 'membership:stu'))
      .rejects.toBeInstanceOf(PrerequisiteNotMetError);
    expect(state.created).toBe(0);
  });

  it('the refusal carries the "Complete … first" message and link', async () => {
    const err = await enrollStudentInCourse(student, 'mould-remediation-fundamentals', 'free').catch((e) => e);
    expect(err).toBeInstanceOf(PrerequisiteNotMetError);
    expect(err.block.detail).toMatch(/^Complete Level 2 — Mould Remediation first\./);
    expect(err.block.prerequisites[0].href).toBe(`/courses/${L2}`);
  });

  it('allows the enrolment once the prerequisite is completed', async () => {
    state.completedPrereq = true;
    const res = await enrollStudentInCourse(student, 'mould-remediation-fundamentals', 'free');
    expect(res).toMatchObject({ courseId: 'crs-mould' });
    expect(state.created).toBe(1);
  });

  it('admin bypasses', async () => {
    const res = await enrollStudentInCourse(admin, 'mould-remediation-fundamentals', 'free');
    expect(res).toMatchObject({ courseId: 'crs-mould' });
  });

  it('an admin-created enrolment reference bypasses (per-learner override)', async () => {
    const res = await enrollStudentInCourse(student, 'mould-remediation-fundamentals', 'admin:override');
    expect(res).toMatchObject({ courseId: 'crs-mould' });
  });

  it('never refuses a Stripe-paid fulfilment, but issues it locked (logs too)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await enrollStudentInCourse(student, 'mould-remediation-fundamentals', 'cs_paid_123');
    expect(res).toMatchObject({ courseId: 'crs-mould' });
    expect(state.lastGated).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('a team seat without the prerequisite is issued LOCKED, not skipped', async () => {
    const res = await enrollStudentInCourse(student, 'mould-remediation-fundamentals', 'team:t1', {
      onPrerequisiteNotMet: 'lock',
    });
    expect(res).toMatchObject({ courseId: 'crs-mould' });
    expect(state.created).toBe(1);
    expect(state.lastGated).toBe(true);
  });

  it('a team seat for a member who has the prerequisite is issued unlocked', async () => {
    state.completedPrereq = true;
    await enrollStudentInCourse(student, 'mould-remediation-fundamentals', 'team:t1', {
      onPrerequisiteNotMet: 'lock',
    });
    expect(state.lastGated).toBe(false);
  });

  it('an admin team seat is issued unlocked', async () => {
    await enrollStudentInCourse(admin, 'mould-remediation-fundamentals', 'team:t1', {
      onPrerequisiteNotMet: 'lock',
    });
    expect(state.lastGated).toBe(false);
  });

  it('without the lock option a team reference is still refused (no silent widening)', async () => {
    await expect(enrollStudentInCourse(student, 'mould-remediation-fundamentals', 'team-seat:t1'))
      .rejects.toBeInstanceOf(PrerequisiteNotMetError);
  });

  it('an existing active enrolment is grandfathered (already_enrolled, no re-check)', async () => {
    state.existing = { id: 'enr-1', status: 'active' };
    expect(await enrollStudentInCourse(student, 'mould-remediation-fundamentals', 'free')).toBe(
      'already_enrolled',
    );
  });

  it('reactivating a revoked enrolment is re-checked', async () => {
    state.existing = { id: 'enr-1', status: 'revoked' };
    await expect(enrollStudentInCourse(student, 'mould-remediation-fundamentals', 'free'))
      .rejects.toBeInstanceOf(PrerequisiteNotMetError);
  });
});

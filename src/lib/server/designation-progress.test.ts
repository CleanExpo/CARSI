import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DesignationDefinition } from '@/lib/designations/registry';

/**
 * Rollup rule (CARSI designations): a designation is EARNED only when every
 * REQUIRED step's course is completed; foundation (recommended) steps show on
 * the pathway but never gate earning. `percentComplete` is over required steps.
 */

const state = vi.hoisted(() => ({
  courses: [] as { id: string; slug: string }[],
  enrollments: [] as { courseId: string; status: string }[],
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: { findMany: vi.fn(async () => state.courses) },
    lmsEnrollment: { findMany: vi.fn(async () => state.enrollments) },
  },
}));

const DESIGNATION: DesignationDefinition = {
  slug: 'carsi-water-restoration-practitioner',
  name: 'CARSI Water Restoration Practitioner',
  disciplineTopic: 'water restoration',
  summary: 'A designation summary long enough to be valid.',
  pathwaySteps: [
    { courseSlug: 'asbestos', order: 1, required: false, role: 'foundation' },
    { courseSlug: 'psychro', order: 2, required: false, role: 'foundation' },
    { courseSlug: 'water', order: 3, required: true, role: 'credential' },
  ],
  completionRule: 'all-required',
  alsoEarnsCec: true,
};

const { computeDesignationProgress } = await import('./designation-progress');

beforeEach(() => {
  state.courses = [
    { id: 'id-asbestos', slug: 'asbestos' },
    { id: 'id-psychro', slug: 'psychro' },
    { id: 'id-water', slug: 'water' },
  ];
  state.enrollments = [];
});

describe('computeDesignationProgress', () => {
  it('no user → 0%, not earned, next step is the first pathway step', async () => {
    const p = await computeDesignationProgress(null, DESIGNATION);
    expect(p.percentComplete).toBe(0);
    expect(p.earned).toBe(false);
    expect(p.requiredTotal).toBe(1);
    expect(p.nextStepSlug).toBe('asbestos');
    expect(p.steps.every((s) => s.status === 'available')).toBe(true);
  });

  it('foundation complete but required not → not earned (foundations do not gate)', async () => {
    state.enrollments = [{ courseId: 'id-asbestos', status: 'completed' }];
    const p = await computeDesignationProgress('u1', DESIGNATION);
    expect(p.earned).toBe(false);
    expect(p.percentComplete).toBe(0);
    expect(p.nextStepSlug).toBe('psychro');
    expect(p.steps.find((s) => s.courseSlug === 'asbestos')?.status).toBe('complete');
  });

  it('required credential complete → earned, 100%, no next step', async () => {
    state.enrollments = [{ courseId: 'id-water', status: 'completed' }];
    const p = await computeDesignationProgress('u1', DESIGNATION);
    expect(p.earned).toBe(true);
    expect(p.percentComplete).toBe(100);
    expect(p.requiredComplete).toBe(1);
    expect(p.nextStepSlug).toBeNull();
  });

  it('enrolled but not completed → in-progress status, still not earned', async () => {
    state.enrollments = [{ courseId: 'id-water', status: 'active' }];
    const p = await computeDesignationProgress('u1', DESIGNATION);
    expect(p.steps.find((s) => s.courseSlug === 'water')?.status).toBe('in-progress');
    expect(p.earned).toBe(false);
  });
});

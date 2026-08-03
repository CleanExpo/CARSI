import { describe, it, expect, vi } from 'vitest';

/**
 * GP-498 positive control through the ACTUAL production resolvers.
 *
 * The empty-registry assertions in cec-licence-gate.test.ts would pass vacuously if the
 * production resolvers were hard-broken to always return null. This file mocks the approvals
 * registry so getApprovedCecHours reports an approval for one slug, then proves every production
 * resolver SURFACES that approved value (and still fails closed for an unapproved slug carrying a
 * stored positive). If a regression made the resolvers always-null, these assertions go red.
 */
vi.mock('@/lib/seed/cec-approvals', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/seed/cec-approvals')>();
  return {
    ...actual,
    getApprovedCecHours: (slug?: string | null) =>
      slug === 'gp498-positive-control' ? 2 : null,
  };
});

import { resolveLmsCourseCecHours } from './course-cec-hours';
import { resolveEffectiveCecHours, courseEligibleForIicrcCecSubmission } from './iicrc-cec-config';
import { resolveCecHoursFromCourse } from './renewal-summary';
import { resolveCecHours } from '@/lib/seed/cec-hours';

const APPROVED = 'gp498-positive-control';

describe('GP-498 positive control — production resolvers surface a registry approval', () => {
  it('resolveLmsCourseCecHours returns the approved hours, ignoring the stored column', () => {
    expect(resolveLmsCourseCecHours({ slug: APPROVED, cecHours: null })).toBe(2);
    expect(resolveLmsCourseCecHours({ slug: 'fundamental-business-framework', cecHours: 4 })).toBeNull();
  });

  it('resolveEffectiveCecHours and resolveCecHours surface the approval', () => {
    expect(resolveEffectiveCecHours({ slug: APPROVED, cecHours: null })).toBe(2);
    expect(resolveCecHours({ slug: APPROVED })).toBe(2);
  });

  it('renewal resolver credits the approved hours', () => {
    expect(resolveCecHoursFromCourse({ slug: APPROVED })).toEqual({ hours: 2, estimated: false });
  });

  it('submission eligibility passes for the approved slug only', () => {
    expect(
      courseEligibleForIicrcCecSubmission({ slug: APPROVED, cecHours: null, iicrcDiscipline: null })
    ).toBe(true);
    expect(
      courseEligibleForIicrcCecSubmission({
        slug: 'fundamental-business-framework',
        cecHours: 4,
        iicrcDiscipline: 'WRT',
      })
    ).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { planCecRemediation, resolveApprovedCecTarget } from './cec-remediation';

describe('resolveApprovedCecTarget (GP-498)', () => {
  it('returns 0 for a course with no registry approval (registry ships empty)', () => {
    expect(resolveApprovedCecTarget('glass-cleaning-course')).toBe(0);
    expect(resolveApprovedCecTarget('fundamental-business-framework')).toBe(0);
    expect(resolveApprovedCecTarget(null)).toBe(0);
  });
});

describe('planCecRemediation (GP-498)', () => {
  it('clears a stale positive claim to 0', () => {
    const plan = planCecRemediation([{ slug: 'glass-cleaning-course', current: 1 }]);
    expect(plan).toEqual([{ slug: 'glass-cleaning-course', current: 1, target: 0 }]);
  });

  it('leaves an already-zeroed course untouched', () => {
    expect(planCecRemediation([{ slug: 'glass-cleaning-course', current: 0 }])).toHaveLength(0);
  });

  it('treats stored NULL as equivalent to 0 (no needless rewrite)', () => {
    expect(planCecRemediation([{ slug: 'glass-cleaning-course', current: null }])).toHaveLength(0);
  });

  it('plans every stale positive across a mixed set', () => {
    const plan = planCecRemediation([
      { slug: 'glass-cleaning-course', current: 1 },
      { slug: 'fundamental-business-framework', current: 4 },
      { slug: 'already-clean', current: 0 },
      { slug: 'never-set', current: null },
    ]);
    expect(plan.map((p) => p.slug).sort()).toEqual([
      'fundamental-business-framework',
      'glass-cleaning-course',
    ]);
    expect(plan.every((p) => p.target === 0)).toBe(true);
  });
});

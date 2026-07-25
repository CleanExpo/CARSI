import { describe, it, expect } from 'vitest';
import { resolveLmsCourseCecHours, formatLmsCourseCecHoursLabel } from './course-cec-hours';
import { resolveEffectiveCecHours, courseEligibleForIicrcCecSubmission } from './iicrc-cec-config';

/**
 * GP-498 licence-critical gate — the ACTUAL production display + submission paths.
 *
 * Regression for the prod leak where carsi.com.au rendered "N IICRC CECs, exportable for
 * IICRC submission" on unapproved courses because the DB `cecHours` column (stale WordPress
 * import) was trusted. The approvals registry is the ONLY source; with it empty, every course
 * must show ZERO CEC and be ineligible for submission, regardless of the stored value or a
 * bare iicrcDiscipline string.
 */
const NAMED_LEAKS = [
  { slug: 'fundamental-business-framework', cecHours: 4 },
  { slug: 'glass-cleaning-course', cecHours: 1 },
  { slug: 'donning-and-doffing-ppe', cecHours: 1 },
];

describe('GP-498 CEC licence gate — production display path (registry-only)', () => {
  it('the three named prod courses render ZERO CEC despite a stored positive cecHours', () => {
    for (const c of NAMED_LEAKS) {
      expect(resolveLmsCourseCecHours(c)).toBeNull();
      expect(formatLmsCourseCecHoursLabel(c)).toBeNull();
    }
  });

  it('a stored positive cecHours on an unapproved slug is ignored (WP-import pollution)', () => {
    expect(resolveLmsCourseCecHours({ slug: 'any-unapproved-course', cecHours: 6 })).toBeNull();
    expect(resolveEffectiveCecHours({ slug: 'any-unapproved-course', cecHours: 6 })).toBeNull();
  });

  it('no slug means no registry lookup means no CEC (fail-closed)', () => {
    expect(resolveEffectiveCecHours({ slug: null, cecHours: 5 })).toBeNull();
  });
});

describe('GP-498 CEC licence gate — IICRC submission eligibility (registry-approved only)', () => {
  it('a bare iicrcDiscipline never makes an unapproved course submission-eligible', () => {
    expect(
      courseEligibleForIicrcCecSubmission({
        slug: 'donning-and-doffing-ppe',
        cecHours: 1,
        iicrcDiscipline: 'WRT',
      })
    ).toBe(false);
  });

  it('a stored positive cecHours never makes an unapproved course submission-eligible', () => {
    expect(
      courseEligibleForIicrcCecSubmission({
        slug: 'fundamental-business-framework',
        cecHours: 4,
        iicrcDiscipline: null,
      })
    ).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { resolveLmsCourseCecHours, formatLmsCourseCecHoursLabel } from './course-cec-hours';
import { resolveEffectiveCecHours, courseEligibleForIicrcCecSubmission } from './iicrc-cec-config';
import { resolveCecHoursFromCourse } from './renewal-summary';
import { resolveCecHours } from '@/lib/seed/cec-hours';
import {
  getApprovedCecHours,
  approvedCecHoursFromRegistry,
} from '@/lib/seed/cec-approvals';

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

/**
 * Mutation / positive control (per proof-discipline: a null result is only evidence once the
 * check can return non-null). Proves the gate DOES surface CEC hours when — and only when — the
 * registry records an approval, so the ZERO results above are meaningful, not a broken lookup.
 */
describe('GP-498 CEC licence gate — positive control (mutation proof)', () => {
  it('the pure registry lookup returns the approved hours for an APPROVED slug', () => {
    const approvedRegistry = [
      { slug: 'glass-cleaning-course', status: 'approved' as const, approvedHours: 2 },
    ];
    expect(approvedCecHoursFromRegistry(approvedRegistry, 'glass-cleaning-course')).toBe(2);
    // ...and still fails closed for a slug NOT in that registry, and for a non-'approved' status.
    expect(approvedCecHoursFromRegistry(approvedRegistry, 'fundamental-business-framework')).toBeNull();
    expect(
      approvedCecHoursFromRegistry(
        [{ slug: 'glass-cleaning-course', status: 'submitted' as const, approvedHours: 2 }],
        'glass-cleaning-course'
      )
    ).toBeNull();
  });

  it('the LIVE registry (currently empty) returns null for the three named prod leaks', () => {
    for (const c of NAMED_LEAKS) {
      expect(getApprovedCecHours(c.slug)).toBeNull();
    }
  });
});

/**
 * Per-surface proof. Every remaining prod surface that displays, sums, exports or gates a CEC
 * value now derives it through one of the registry-only resolvers below. With the registry empty
 * each returns ZERO/null for the three named unapproved courses that carry a stored positive —
 * regardless of stored cecHours, meta CEC keys, a bare iicrcDiscipline, or a duration.
 */
describe('GP-498 CEC licence gate — per-surface resolvers fail closed', () => {
  // Surfaces: app/api/lms/search, proof-pack export, learner-dashboard sum, Margot context,
  // admin-user-progress eligibility, learner-xp lifetime total, certificate PDF, credentials —
  // all call resolveLmsCourseCecHours (slug-only registry lookup).
  it('resolveLmsCourseCecHours ignores stored cecHours, meta CEC, bare discipline and duration', () => {
    for (const c of NAMED_LEAKS) {
      expect(
        resolveLmsCourseCecHours({
          slug: c.slug,
          cecHours: c.cecHours,
          meta: { cec_hours: 9, cec: 9 },
          iicrcDiscipline: 'WRT',
          durationHours: 8,
          shortDescription: 'Approx 4 Hours',
        })
      ).toBeNull();
    }
  });

  // Surface: WordPress-export / LmsCourse row mapping (mapWpExportToCourseListItem).
  it('resolveCecHours (WP/DB row path) ignores a stored positive cec_hours', () => {
    for (const c of NAMED_LEAKS) {
      expect(resolveCecHours({ slug: c.slug, cec_hours: c.cecHours })).toBeNull();
    }
  });

  // Surface: renewal cockpit / renewal-summary — previously credited stored hours, meta CEC keys
  // AND a bare iicrcDiscipline (default 1 estimated hour) toward a learner's IICRC renewal.
  it('renewal-summary resolveCecHoursFromCourse credits ZERO, never estimated', () => {
    for (const c of NAMED_LEAKS) {
      expect(
        resolveCecHoursFromCourse({
          slug: c.slug,
          cecHours: c.cecHours,
          meta: { cec_hours: 9 },
          iicrcDiscipline: 'WRT',
        })
      ).toEqual({ hours: 0, estimated: false });
    }
    // A bare discipline with no stored hours (the old fail-open default of 1) is also ZERO now.
    expect(
      resolveCecHoursFromCourse({ slug: 'some-unapproved', iicrcDiscipline: 'AMRT' })
    ).toEqual({ hours: 0, estimated: false });
  });
});

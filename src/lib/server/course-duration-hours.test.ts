import { beforeEach, describe, expect, it } from 'vitest';

import { resetCecProfessionalAssignmentsCache } from '@/lib/seed/cec-professional-assignments';
import {
  formatLmsCourseDurationHoursLabel,
  resolveLmsCourseDurationHours,
} from '@/lib/server/course-duration-hours';

describe('resolveLmsCourseDurationHours', () => {
  beforeEach(() => {
    resetCecProfessionalAssignmentsCache();
  });

  it('prefers the explicit DB durationHours column', () => {
    expect(
      resolveLmsCourseDurationHours({ slug: 'floor-care-onboarding-operational-readiness', durationHours: 8 })
    ).toBe(8);
  });

  it('parses duration prose from the course description', () => {
    expect(
      resolveLmsCourseDurationHours({
        slug: 'unknown-course',
        durationHours: null,
        description: 'Course Duration:\nApprox 2 Hours',
      })
    ).toBe(2);
  });

  it('falls back to the WordPress export catalogue via slug', () => {
    // data/wordpress-export/courses.json: "Course Duration: Approx 2 Hours"
    expect(
      resolveLmsCourseDurationHours({ slug: 'hvac-systems-and-indoor-air-quality-what-every-technician-should-know', durationHours: null })
    ).toBe(2);
  });

  it('resolves suffixed LMS slugs through slugAliases', () => {
    // level-1-mould-remediation-2cc96b85 → level-1-mould-remediation (Approximately 1.5 Hours)
    expect(
      resolveLmsCourseDurationHours({ slug: 'level-1-mould-remediation-2cc96b85', durationHours: null })
    ).toBe(1.5);
  });

  it('resolves the repaired structural-drying alias to its WP duration prose', () => {
    // slugAliases: introduction-to-applied-structural-drying → structural-drying-2
    // ("Approximately 30 minutes" in the WP export)
    expect(
      resolveLmsCourseDurationHours({ slug: 'introduction-to-applied-structural-drying', durationHours: null })
    ).toBe(0.5);
  });

  it('falls back to reviewer durationAssignments for DB-only courses', () => {
    expect(
      resolveLmsCourseDurationHours({ slug: 'large-loss-mastery-course', durationHours: null })
    ).toBe(8);
  });

  it('returns null when no duration source exists', () => {
    expect(
      resolveLmsCourseDurationHours({ slug: 'tile-cleaning-for-carpet-cleaners', durationHours: null })
    ).toBeNull();
  });
});

describe('formatLmsCourseDurationHoursLabel', () => {
  beforeEach(() => {
    resetCecProfessionalAssignmentsCache();
  });

  it('formats whole hours without decimals', () => {
    expect(formatLmsCourseDurationHoursLabel({ slug: 'x', durationHours: 8 })).toBe('8');
  });

  it('rounds minute-based durations to the nearest half hour, minimum 0.5', () => {
    // carpet-cleaning ("Approximately 25 minutes") via alias
    expect(
      formatLmsCourseDurationHoursLabel({
        slug: 'introduction-to-basic-carpet-cleaning-and-drying',
        durationHours: null,
      })
    ).toBe('0.5');
  });

  it('keeps half-hour precision', () => {
    expect(formatLmsCourseDurationHoursLabel({ slug: 'x', durationHours: 2.5 })).toBe('2.5');
  });

  it('returns null when unresolvable', () => {
    expect(formatLmsCourseDurationHoursLabel({ slug: 'no-such-course', durationHours: null })).toBeNull();
  });
});

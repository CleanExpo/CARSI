import { describe, expect, it } from 'vitest';

import {
  catalogueCourseCta,
  courseDetailPrimaryAction,
  formatLearnerActivity,
} from './learner-course-cta';

describe('courseDetailPrimaryAction', () => {
  it('asks unenrolled learners to enrol', () => {
    expect(courseDetailPrimaryAction({ enrolled: false, percent: 0, completed: false })).toBe(
      'enrol'
    );
  });

  it('starts an unopened enrolment', () => {
    expect(courseDetailPrimaryAction({ enrolled: true, percent: 0, completed: false })).toBe(
      'start'
    );
  });

  it('continues an in-progress course', () => {
    expect(courseDetailPrimaryAction({ enrolled: true, percent: 42, completed: false })).toBe(
      'continue'
    );
  });

  it('views a completed course', () => {
    expect(courseDetailPrimaryAction({ enrolled: true, percent: 100, completed: true })).toBe(
      'view'
    );
  });
});

describe('catalogueCourseCta', () => {
  it('uses Continue for enrolled courses', () => {
    expect(catalogueCourseCta(true)).toBe('Continue');
  });

  it('uses View course when not enrolled', () => {
    expect(catalogueCourseCta(false)).toBe('View course');
  });
});

describe('formatLearnerActivity', () => {
  const noon = Date.parse('2026-09-21T12:00:00.000Z');

  it('returns Today for activity on the same calendar window', () => {
    expect(formatLearnerActivity('2026-09-21T08:00:00.000Z', noon)).toBe('Today');
  });

  it('returns Yesterday for a one-day gap', () => {
    expect(formatLearnerActivity('2026-09-20T12:00:00.000Z', noon)).toBe('Yesterday');
  });

  it('returns null for missing dates', () => {
    expect(formatLearnerActivity(null)).toBeNull();
  });
});

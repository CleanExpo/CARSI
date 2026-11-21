import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { courseDurationLabel } from './course-duration-label';

describe('courseDurationLabel', () => {
  it('puts the hours unit on a number or a numeric string', () => {
    expect(courseDurationLabel(5)).toBe('5h');
    expect(courseDurationLabel('5')).toBe('5h');
    expect(courseDurationLabel('2.5')).toBe('2.5h');
  });

  it('returns null when there is no duration, so the page can omit it', () => {
    expect(courseDurationLabel(0)).toBeNull();
    expect(courseDurationLabel(null)).toBeNull();
    expect(courseDurationLabel(undefined)).toBeNull();
    expect(courseDurationLabel('')).toBeNull();
  });
});

describe('CoursePublicDetail duration rendering', () => {
  // The syllabus line printed "6 modules · 38 lessons · 5" because it interpolated the raw
  // value while the stat tile added the unit itself. One formatter owns the unit now.
  const source = readFileSync(
    join(process.cwd(), 'src/components/lms/CoursePublicDetail.tsx'),
    'utf8'
  );

  it('never interpolates the raw duration_hours value', () => {
    expect(source).not.toMatch(/\$\{course\.duration_hours\}/);
  });

  it('formats the duration through courseDurationLabel', () => {
    expect(source).toMatch(/courseDurationLabel\(course\.duration_hours\)/);
  });
});

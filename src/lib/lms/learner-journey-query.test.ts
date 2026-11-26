import { describe, expect, it } from 'vitest';

import { parseFocusCourseSlug, resolveFocusCourseSlug } from './learner-journey-query';

describe('learner-journey-query', () => {
  it('accepts catalogue slugs', () => {
    expect(parseFocusCourseSlug('water-damage-restoration-fundamentals')).toBe(
      'water-damage-restoration-fundamentals'
    );
  });

  it('rejects traversal and oversize slugs', () => {
    expect(parseFocusCourseSlug('../admin')).toBeUndefined();
    expect(parseFocusCourseSlug('a'.repeat(130))).toBeUndefined();
    expect(parseFocusCourseSlug('')).toBeUndefined();
  });

  it('drops focus when not enrolled', () => {
    const enrolled = new Set(['course-a']);
    expect(resolveFocusCourseSlug('course-b', enrolled)).toBeUndefined();
    expect(resolveFocusCourseSlug('course-a', enrolled)).toBe('course-a');
  });
});
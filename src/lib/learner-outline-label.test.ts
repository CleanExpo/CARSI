import { describe, expect, it } from 'vitest';

import { outlineLessonLabel } from './learner-outline-label';

describe('outlineLessonLabel', () => {
  it('shortens a reading lesson that repeats the module title', () => {
    expect(
      outlineLessonLabel('Material Integrity Risks — Reading', 'Material Integrity Risks')
    ).toBe('Reading');
    expect(
      outlineLessonLabel(
        'Authentication and Appraisals — Re-reading',
        'Authentication and Appraisals'
      )
    ).toBe('Re-reading');
  });

  it('keeps a lesson title that is not just the module plus Reading', () => {
    expect(outlineLessonLabel('Bonding damage walkthrough', 'Material Integrity Risks')).toBe(
      'Bonding damage walkthrough'
    );
  });
});

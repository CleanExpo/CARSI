import { describe, expect, it } from 'vitest';

import {
  FIRE_SMOKE_ASBESTOS_LESSON_ID,
  WATER_DAMAGE_HAZARD_LESSON_ID,
} from '@/lib/lms/append-interactive-pilot';

import {
  interactiveExperienceIdsForLesson,
  lessonAllowsInteractiveExperience,
} from './lesson-interactive-resources';

describe('lesson-interactive-resources', () => {
  it('lists merged pilot experiences for water hazard lesson', () => {
    const ids = interactiveExperienceIdsForLesson(
      'water-damage-restoration-fundamentals',
      WATER_DAMAGE_HAZARD_LESSON_ID,
      []
    );
    expect(ids).toEqual(['water-damage-module-3-pilot']);
  });

  it('lists fire smoke pilot on asbestos lesson', () => {
    const ids = interactiveExperienceIdsForLesson(
      'fire-smoke-damage-restoration-fundamentals',
      FIRE_SMOKE_ASBESTOS_LESSON_ID,
      []
    );
    expect(ids).toEqual(['fire-smoke-module-3-pilot']);
  });

  it('rejects unknown experience ids', () => {
    expect(
      lessonAllowsInteractiveExperience(
        'water-damage-restoration-fundamentals',
        WATER_DAMAGE_HAZARD_LESSON_ID,
        [],
        'moisture-instruments-pilot'
      )
    ).toBe(false);
  });
});

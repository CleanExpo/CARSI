import { describe, expect, it } from 'vitest';

import {
  FIRE_SMOKE_ASBESTOS_LESSON_ID,
  WATER_DAMAGE_HAZARD_LESSON_ID,
  appendFireSmokeInteractivePilot,
  appendWaterDamageInteractivePilot,
  mergeLessonInteractivePilots,
} from '@/lib/lms/append-interactive-pilot';
import { isInteractiveLessonResource, parseLessonResources } from '@/lib/lms/lesson-resources';

describe('appendWaterDamageInteractivePilot', () => {
  it('appends the pilot resource on the hazard lesson', () => {
    const base = parseLessonResources([{ label: 'Card', url: '/x.md' }]);
    const out = appendWaterDamageInteractivePilot(
      'water-damage-restoration-fundamentals',
      WATER_DAMAGE_HAZARD_LESSON_ID,
      base
    );
    expect(out).toHaveLength(2);
    const interactive = out.find(isInteractiveLessonResource);
    expect(interactive?.experience.id).toBe('water-damage-module-3-pilot');
    expect(interactive?.experience.activities).toHaveLength(6);
  });

  it('does not duplicate when interactive already present', () => {
    const withPilot = appendWaterDamageInteractivePilot(
      'water-damage-restoration-fundamentals',
      WATER_DAMAGE_HAZARD_LESSON_ID,
      []
    );
    const again = appendWaterDamageInteractivePilot(
      'water-damage-restoration-fundamentals',
      WATER_DAMAGE_HAZARD_LESSON_ID,
      withPilot
    );
    expect(again.filter(isInteractiveLessonResource)).toHaveLength(1);
  });

  it('appends the fire smoke pilot on the asbestos lesson', () => {
    const out = appendFireSmokeInteractivePilot(
      'fire-smoke-damage-restoration-fundamentals',
      FIRE_SMOKE_ASBESTOS_LESSON_ID,
      []
    );
    const interactive = out.find(isInteractiveLessonResource);
    expect(interactive?.experience.id).toBe('fire-smoke-module-3-pilot');
  });

  it('mergeLessonInteractivePilots chains course-specific pilots', () => {
    const water = mergeLessonInteractivePilots(
      'water-damage-restoration-fundamentals',
      WATER_DAMAGE_HAZARD_LESSON_ID,
      []
    );
    expect(water.find(isInteractiveLessonResource)?.experience.id).toBe('water-damage-module-3-pilot');
    expect(
      mergeLessonInteractivePilots('fire-smoke-damage-restoration-fundamentals', WATER_DAMAGE_HAZARD_LESSON_ID, [])
        .length
    ).toBe(0);
  });

  it('ignores other courses and lessons', () => {
    expect(
      appendWaterDamageInteractivePilot('other-course', WATER_DAMAGE_HAZARD_LESSON_ID, []).length
    ).toBe(0);
    expect(
      appendWaterDamageInteractivePilot('water-damage-restoration-fundamentals', 'other-lesson', []).length
    ).toBe(0);
  });
});
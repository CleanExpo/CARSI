import { describe, expect, it } from 'vitest';

import { WATER_DAMAGE_INTERACTIVE_PILOT } from '@/lib/lms/interactive-experience-data';
import {
  canOpenActivityIndex,
  nextActivityIndex,
  normalizeInteractiveProgress,
} from '@/lib/lms/interactive-progress';

const experience = WATER_DAMAGE_INTERACTIVE_PILOT;

describe('normalizeInteractiveProgress', () => {
  it('recomputes XP only from valid completed activity ids', () => {
    const normalized = normalizeInteractiveProgress(experience, {
      activityIndex: 99,
      completedActivityIds: ['arrival-scenario', 'bogus', 'hazard-diagram'],
      earnedXp: 999,
    });
    expect(normalized.earnedXp).toBe(40);
    expect(normalized.completedActivityIds).toEqual(['arrival-scenario', 'hazard-diagram']);
  });

  it('clamps activity index to first incomplete when jumping ahead', () => {
    const normalized = normalizeInteractiveProgress(experience, {
      activityIndex: 5,
      completedActivityIds: [],
      earnedXp: 0,
    });
    expect(normalized.activityIndex).toBe(0);
  });
});

describe('canOpenActivityIndex', () => {
  it('blocks skipping ahead', () => {
    expect(canOpenActivityIndex(2, [], experience)).toBe(false);
    expect(canOpenActivityIndex(1, ['arrival-scenario'], experience)).toBe(true);
  });
});

describe('nextActivityIndex', () => {
  it('returns the next unfinished activity', () => {
    expect(nextActivityIndex(experience, ['arrival-scenario'])).toBe(1);
    expect(
      nextActivityIndex(
        experience,
        experience.activities.map((a) => a.id)
      )
    ).toBeNull();
  });
});

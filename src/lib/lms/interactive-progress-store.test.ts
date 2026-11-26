import { describe, expect, it } from 'vitest';

import { WATER_DAMAGE_INTERACTIVE_PILOT } from '@/lib/lms/interactive-experience-data';

import {
  isInteractiveExperienceComplete,
  mergeInteractiveSnapshots,
  parseInteractiveProgressDocument,
  upsertExperienceSnapshot,
} from './interactive-progress-store';

describe('interactive-progress-store', () => {
  it('parses stored JSON and detects completion', () => {
    const allIds = WATER_DAMAGE_INTERACTIVE_PILOT.activities.map((a) => a.id);
    const doc = parseInteractiveProgressDocument({
      [WATER_DAMAGE_INTERACTIVE_PILOT.id]: {
        activityIndex: allIds.length - 1,
        completedActivityIds: allIds,
        earnedXp: 100,
      },
    });
    expect(isInteractiveExperienceComplete(WATER_DAMAGE_INTERACTIVE_PILOT, doc[WATER_DAMAGE_INTERACTIVE_PILOT.id])).toBe(
      true
    );
  });

  it('merges local and server completed ids', () => {
    const experience = WATER_DAMAGE_INTERACTIVE_PILOT;
    const first = experience.activities[0]!.id;
    const merged = mergeInteractiveSnapshots(
      experience,
      { activityIndex: 0, completedActivityIds: [first], earnedXp: 20 },
      { activityIndex: 1, completedActivityIds: [], earnedXp: 0 }
    );
    expect(merged.completedActivityIds).toContain(first);
  });

  it('upserts normalised snapshot into document', () => {
    const doc = upsertExperienceSnapshot(
      {},
      WATER_DAMAGE_INTERACTIVE_PILOT,
      WATER_DAMAGE_INTERACTIVE_PILOT.id,
      { activityIndex: 0, completedActivityIds: [], earnedXp: 0 }
    );
    expect(doc[WATER_DAMAGE_INTERACTIVE_PILOT.id]?.activityIndex).toBe(0);
  });
});
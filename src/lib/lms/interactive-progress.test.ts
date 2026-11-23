import { afterEach, describe, expect, it, vi } from 'vitest';

import { WATER_DAMAGE_INTERACTIVE_PILOT } from '@/lib/lms/interactive-experience-data';
import {
  canOpenActivityIndex,
  nextActivityIndex,
  normalizeInteractiveProgress,
  readInteractiveProgress,
  storageKey,
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

// Force-push review P2: blocked browser storage crashed the interactive player. In a browser
// that blocks site data, reading `window.localStorage` itself throws a SecurityError.
describe('readInteractiveProgress when browser storage is blocked', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null instead of throwing when localStorage itself cannot be read', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
    expect(readInteractiveProgress(experience.id, 'lesson-1', experience)).toBeNull();
  });

  it('returns null instead of throwing when getItem throws', () => {
    const denied = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    vi.stubGlobal('window', { localStorage: { getItem: denied, setItem: denied } });
    expect(readInteractiveProgress(experience.id, 'lesson-1', experience)).toBeNull();
  });

  it('positive control: readable storage still returns the saved progress', () => {
    const store = new Map<string, string>([
      [
        storageKey(experience.id, 'lesson-1'),
        JSON.stringify({ activityIndex: 1, completedActivityIds: ['arrival-scenario'], earnedXp: 0 }),
      ],
    ]);
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
      },
    });
    expect(readInteractiveProgress(experience.id, 'lesson-1', experience)?.completedActivityIds).toEqual([
      'arrival-scenario',
    ]);
  });
});

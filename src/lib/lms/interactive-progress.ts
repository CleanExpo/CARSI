import type { InteractiveExperience } from '@/lib/lms/interactive-experience-types';

const STORAGE_PREFIX = 'carsi-interactive:v2:';
const LEGACY_PREFIX = 'carsi-interactive:v1:';

export interface InteractiveProgressSnapshot {
  activityIndex: number;
  completedActivityIds: string[];
  earnedXp: number;
}

export function storageKey(experienceId: string, lessonKey: string): string {
  return `${STORAGE_PREFIX}${experienceId}:${lessonKey}`;
}

function legacyStorageKey(experienceId: string, lessonKey: string): string {
  return `${LEGACY_PREFIX}${experienceId}:${lessonKey}`;
}

function tryParseSnapshot(raw: string | null): InteractiveProgressSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InteractiveProgressSnapshot;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.completedActivityIds) ||
      typeof parsed.activityIndex !== 'number' ||
      typeof parsed.earnedXp !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Recompute XP from completed activities only and clamp navigation to the learning path.
 */
export function normalizeInteractiveProgress(
  experience: InteractiveExperience,
  raw: InteractiveProgressSnapshot | null
): InteractiveProgressSnapshot {
  const validIds = new Set(experience.activities.map((a) => a.id));
  const completedActivityIds = [...new Set(raw?.completedActivityIds.filter((id) => validIds.has(id)) ?? [])];
  const earnedXp = experience.activities
    .filter((a) => completedActivityIds.includes(a.id))
    .reduce((sum, a) => sum + a.xp, 0);

  const firstIncomplete = experience.activities.findIndex((a) => !completedActivityIds.includes(a.id));
  const allDone = firstIncomplete === -1;

  let activityIndex = raw?.activityIndex ?? 0;
  if (!Number.isFinite(activityIndex) || activityIndex < 0) activityIndex = 0;
  if (activityIndex >= experience.activities.length) activityIndex = experience.activities.length - 1;

  if (allDone) {
    activityIndex = experience.activities.length - 1;
  } else if (!canOpenActivityIndex(activityIndex, completedActivityIds, experience)) {
    activityIndex = firstIncomplete;
  }

  return { activityIndex, completedActivityIds, earnedXp };
}

export function canOpenActivityIndex(
  index: number,
  completedActivityIds: string[],
  experience: InteractiveExperience
): boolean {
  if (index < 0 || index >= experience.activities.length) return false;
  for (let i = 0; i < index; i++) {
    if (!completedActivityIds.includes(experience.activities[i]!.id)) return false;
  }
  return true;
}

export function readInteractiveProgress(
  experienceId: string,
  lessonKey: string,
  experience: InteractiveExperience
): InteractiveProgressSnapshot | null {
  if (typeof window === 'undefined') return null;
  const key = storageKey(experienceId, lessonKey);
  const legacy = legacyStorageKey(experienceId, lessonKey);
  const raw = tryParseSnapshot(window.localStorage.getItem(key));
  const migrated = raw ?? tryParseSnapshot(window.localStorage.getItem(legacy));
  if (!migrated) return null;
  const normalized = normalizeInteractiveProgress(experience, migrated);
  try {
    window.localStorage.setItem(key, JSON.stringify(normalized));
  } catch {
    /* ignore */
  }
  return normalized;
}

export function writeInteractiveProgress(key: string, snapshot: InteractiveProgressSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    /* quota or private mode */
  }
}

export function maxXpForExperience(experience: InteractiveExperience): number {
  return experience.activities.reduce((sum, a) => sum + a.xp, 0);
}

export function nextActivityIndex(
  experience: InteractiveExperience,
  completedActivityIds: string[]
): number | null {
  const idx = experience.activities.findIndex((a) => !completedActivityIds.includes(a.id));
  return idx === -1 ? null : idx;
}
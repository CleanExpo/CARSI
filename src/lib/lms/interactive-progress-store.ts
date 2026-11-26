import type { InteractiveExperience } from '@/lib/lms/interactive-experience-types';

import {
  normalizeInteractiveProgress,
  type InteractiveProgressSnapshot,
} from '@/lib/lms/interactive-progress';

export type InteractiveProgressDocument = Record<string, InteractiveProgressSnapshot>;

export function parseInteractiveProgressDocument(raw: unknown): InteractiveProgressDocument {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: InteractiveProgressDocument = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.trim() || !value || typeof value !== 'object' || Array.isArray(value)) continue;
    const snap = value as InteractiveProgressSnapshot;
    if (
      !Array.isArray(snap.completedActivityIds) ||
      typeof snap.activityIndex !== 'number' ||
      typeof snap.earnedXp !== 'number'
    ) {
      continue;
    }
    out[key] = {
      activityIndex: snap.activityIndex,
      completedActivityIds: snap.completedActivityIds.filter((id) => typeof id === 'string'),
      earnedXp: snap.earnedXp,
    };
  }
  return out;
}

export function mergeInteractiveSnapshots(
  experience: InteractiveExperience,
  local: InteractiveProgressSnapshot | null,
  server: InteractiveProgressSnapshot | null
): InteractiveProgressSnapshot {
  const completedActivityIds = [
    ...new Set([
      ...(local?.completedActivityIds ?? []),
      ...(server?.completedActivityIds ?? []),
    ]),
  ];
  const activityIndex = Math.max(local?.activityIndex ?? 0, server?.activityIndex ?? 0);
  const earnedXp = Math.max(local?.earnedXp ?? 0, server?.earnedXp ?? 0);
  return normalizeInteractiveProgress(experience, {
    activityIndex,
    completedActivityIds,
    earnedXp,
  });
}

export function isInteractiveExperienceComplete(
  experience: InteractiveExperience,
  snapshot: InteractiveProgressSnapshot | null | undefined
): boolean {
  if (!snapshot) return false;
  const normalized = normalizeInteractiveProgress(experience, snapshot);
  return normalized.completedActivityIds.length >= experience.activities.length;
}

export function upsertExperienceSnapshot(
  doc: InteractiveProgressDocument,
  experience: InteractiveExperience,
  experienceId: string,
  snapshot: InteractiveProgressSnapshot
): InteractiveProgressDocument {
  const normalized = normalizeInteractiveProgress(experience, snapshot);
  return { ...doc, [experienceId]: normalized };
}
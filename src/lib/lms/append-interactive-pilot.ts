import type { LessonResource } from '@/lib/lms/lesson-resources';
import { parseInteractiveLessonResource } from '@/lib/lms/interactive-experience-parse';

/** Catalog lesson id for “Identify the hazards first” (Module 3). */
export const WATER_DAMAGE_HAZARD_LESSON_ID = '51c6821e-1153-4319-a977-a18768e45ac7';

const PILOT_ATTACH = {
  kind: 'interactive',
  label: 'Interactive job-site experience',
  experienceId: 'water-damage-module-3-pilot',
} as const;

function hasInteractivePilot(resources: LessonResource[]): boolean {
  return resources.some((r) => r.kind === 'interactive');
}

/**
 * Ensures the water-damage pilot is present on the hazard lesson even before
 * catalog re-import updates stored JSON.
 */
export function appendWaterDamageInteractivePilot(
  courseSlug: string,
  lessonId: string,
  resources: LessonResource[]
): LessonResource[] {
  if (courseSlug !== 'water-damage-restoration-fundamentals') return resources;
  if (lessonId !== WATER_DAMAGE_HAZARD_LESSON_ID) return resources;
  if (hasInteractivePilot(resources)) return resources;
  const parsed = parseInteractiveLessonResource(PILOT_ATTACH);
  if (!parsed) return resources;
  return [...resources, parsed];
}
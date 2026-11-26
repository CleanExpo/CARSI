import type { LessonResource } from '@/lib/lms/lesson-resources';
import { parseInteractiveLessonResource } from '@/lib/lms/interactive-experience-parse';

/** Catalog lesson id for “Identify the hazards first” (Module 3). */
export const WATER_DAMAGE_HAZARD_LESSON_ID = '51c6821e-1153-4319-a977-a18768e45ac7';

/** Module 3 asbestos lesson — hazard-led practice anchor for fire & smoke fundamentals. */
export const FIRE_SMOKE_ASBESTOS_LESSON_ID = '913c19c7-317d-4888-8228-bc3bacc0eefc';

export const INTERACTIVE_PILOT_LESSON_IDS = new Set([
  WATER_DAMAGE_HAZARD_LESSON_ID,
  FIRE_SMOKE_ASBESTOS_LESSON_ID,
]);

const WATER_PILOT_ATTACH = {
  kind: 'interactive',
  label: 'Interactive job-site experience',
  experienceId: 'water-damage-module-3-pilot',
} as const;

const FIRE_PILOT_ATTACH = {
  kind: 'interactive',
  label: 'Interactive hazard assessment',
  experienceId: 'fire-smoke-module-3-pilot',
} as const;

function hasInteractivePilot(resources: LessonResource[]): boolean {
  return resources.some((r) => r.kind === 'interactive');
}

function appendPilotIfNeeded(
  courseSlug: string,
  lessonId: string,
  expectedCourseSlug: string,
  expectedLessonId: string,
  attach: typeof WATER_PILOT_ATTACH,
  resources: LessonResource[]
): LessonResource[] {
  if (courseSlug !== expectedCourseSlug) return resources;
  if (lessonId !== expectedLessonId) return resources;
  if (hasInteractivePilot(resources)) return resources;
  const parsed = parseInteractiveLessonResource(attach);
  if (!parsed) return resources;
  return [...resources, parsed];
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
  return appendPilotIfNeeded(
    courseSlug,
    lessonId,
    'water-damage-restoration-fundamentals',
    WATER_DAMAGE_HAZARD_LESSON_ID,
    WATER_PILOT_ATTACH,
    resources
  );
}

export function appendFireSmokeInteractivePilot(
  courseSlug: string,
  lessonId: string,
  resources: LessonResource[]
): LessonResource[] {
  return appendPilotIfNeeded(
    courseSlug,
    lessonId,
    'fire-smoke-damage-restoration-fundamentals',
    FIRE_SMOKE_ASBESTOS_LESSON_ID,
    FIRE_PILOT_ATTACH,
    resources
  );
}

/** API + completion gate merge — water pilot, then fire/smoke pilot. */
export function mergeLessonInteractivePilots(
  courseSlug: string,
  lessonId: string,
  resources: LessonResource[]
): LessonResource[] {
  return appendFireSmokeInteractivePilot(
    courseSlug,
    lessonId,
    appendWaterDamageInteractivePilot(courseSlug, lessonId, resources)
  );
}

export function getPilotLessonIdForCourse(courseSlug: string): string | null {
  if (courseSlug === 'water-damage-restoration-fundamentals') return WATER_DAMAGE_HAZARD_LESSON_ID;
  if (courseSlug === 'fire-smoke-damage-restoration-fundamentals') return FIRE_SMOKE_ASBESTOS_LESSON_ID;
  return null;
}
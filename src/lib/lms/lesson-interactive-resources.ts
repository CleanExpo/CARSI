import { mergeLessonInteractivePilots } from '@/lib/lms/append-interactive-pilot';
import { isInteractiveLessonResource, parseLessonResources } from '@/lib/lms/lesson-resources';

/** Experience ids the learner may sync for this lesson (DB + merged pilots). */
export function interactiveExperienceIdsForLesson(
  courseSlug: string,
  lessonId: string,
  rawResources: unknown
): string[] {
  const resources = mergeLessonInteractivePilots(
    courseSlug,
    lessonId,
    parseLessonResources(rawResources)
  );
  return resources.filter(isInteractiveLessonResource).map((r) => r.experience.id);
}

export function lessonAllowsInteractiveExperience(
  courseSlug: string,
  lessonId: string,
  rawResources: unknown,
  experienceId: string
): boolean {
  const allowed = interactiveExperienceIdsForLesson(courseSlug, lessonId, rawResources);
  return allowed.includes(experienceId.trim());
}

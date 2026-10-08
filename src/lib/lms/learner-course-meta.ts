/** Private delivery review evidence must never pass through learner metadata. */
export function projectLearnerCourseMeta(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return Object.fromEntries(Object.entries(raw).filter(([key]) => key !== 'shortCourseDelivery'));
}

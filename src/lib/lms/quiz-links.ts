/**
 * Where a lesson's "Take Quiz" button goes: the course player at that lesson, which renders the
 * lesson's quiz checkpoint. The old target `/courses/<slug>/quiz/<id>` has no page and returned
 * 404 in production (verified 18/10/2026).
 */
export function lessonQuizHref(slug: string, lessonId: string): string {
  return `/dashboard/learn/${encodeURIComponent(slug)}?lesson=${encodeURIComponent(lessonId)}`;
}

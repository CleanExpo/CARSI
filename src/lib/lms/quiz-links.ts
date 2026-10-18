/**
 * Where a lesson opens: the course player at that lesson, which renders the lesson, its
 * resources and its quiz checkpoint. The legacy lesson page redirects here; its old "Take
 * Quiz" target, /courses/<slug>/quiz/<id>, has no page and returned 404 (verified 18/10/2026).
 */
export function lessonPlayerHref(slug: string, lessonId: string): string {
  return `/dashboard/learn/${encodeURIComponent(slug)}?lesson=${encodeURIComponent(lessonId)}`;
}

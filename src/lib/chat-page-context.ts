/**
 * Client-safe helpers: derive Claire chat "page focus" from the current URL.
 * Server validates slugs/IDs against the database — never trust these for authorization.
 */

export type ChatPageContextPayload = {
  course_slug?: string;
  lesson_id?: string;
};

const SLUG_SEGMENT = '([^/]+)';

/** Match pathname + optional ?lesson= for /dashboard/learn/[slug]. */
export function deriveChatPageContext(
  pathname: string,
  searchParams: URLSearchParams
): ChatPageContextPayload | undefined {
  const path = pathname.replace(/\/$/, '') || '/';
  const lessonFromQuery = searchParams.get('lesson')?.trim() || undefined;

  const learn = new RegExp(`^/dashboard/learn/${SLUG_SEGMENT}$`).exec(path);
  if (learn?.[1]) {
    return { course_slug: learn[1], lesson_id: lessonFromQuery };
  }

  const pub = new RegExp(`^/courses/${SLUG_SEGMENT}$`).exec(path);
  if (pub?.[1] && pub[1] !== 'payment-success') {
    return { course_slug: pub[1] };
  }

  const dashLesson = new RegExp(
    `^/dashboard/courses/${SLUG_SEGMENT}/lessons/${SLUG_SEGMENT}$`
  ).exec(path);
  if (dashLesson?.[1] && dashLesson[2]) {
    return { course_slug: dashLesson[1], lesson_id: dashLesson[2] };
  }

  const dashCourse = new RegExp(`^/dashboard/courses/${SLUG_SEGMENT}$`).exec(path);
  if (dashCourse?.[1] && !path.includes('/quiz/')) {
    return { course_slug: dashCourse[1] };
  }

  return undefined;
}

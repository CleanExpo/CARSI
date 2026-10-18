import { redirect } from 'next/navigation';

import { lessonPlayerHref } from '@/lib/lms/quiz-links';

/**
 * Legacy lesson URL. This page read the lesson API as a flat lesson although the API returns
 * { lesson, resources, enrollment_id, course }, so it rendered no title, no content and an
 * unreachable "Take Quiz" button whose target returned 404. The course player renders the
 * lesson, its resources and its quiz checkpoint, so old links and bookmarks land there.
 */
export default async function LegacyLessonRedirectPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  redirect(lessonPlayerHref(decodeURIComponent(slug), decodeURIComponent(lessonId)));
}

import { isOnboardingCourse } from '@/lib/onboarding/enterprise';

/**
 * True when /courses/<slug> renders the public course page. False means the page redirects
 * (organisation onboarding courses go to the dashboard), so the URL must not appear in the
 * sitemap, the /courses ItemList or /llms.txt. The course page itself redirects on this exact
 * predicate (sitemap-real-pages.test.ts), so the two cannot drift apart.
 */
export function hasPublicCoursePage(course: { slug: string; category?: string | null }): boolean {
  return !isOnboardingCourse({ slug: course.slug, category: course.category });
}

import { isOnboardingCourse } from '@/lib/onboarding/enterprise';

export function getOnboardingProgramPath(slug: string): string {
  return `/dashboard/onboarding/${encodeURIComponent(slug)}`;
}

export function getOnboardingLearnPath(slug: string, lessonId?: string | null): string {
  const base = `/dashboard/learn/${encodeURIComponent(slug)}`;
  if (lessonId) return `${base}?lesson=${encodeURIComponent(lessonId)}`;
  return base;
}

export function getOnboardingSupervisorPath(slug: string): string {
  return `/dashboard/onboarding/${encodeURIComponent(slug)}/supervisor`;
}

/** Resolve the best dashboard destination for a catalogue or search result. */
export function resolveDashboardCourseHref(input: {
  slug: string;
  category?: string | null;
  meta?: unknown;
  courseLinkBase?: string;
}): string {
  if (isOnboardingCourse(input)) {
    return getOnboardingProgramPath(input.slug);
  }
  const base = (input.courseLinkBase ?? '/dashboard/courses').replace(/\/$/, '');
  return `${base}/${encodeURIComponent(input.slug)}`;
}

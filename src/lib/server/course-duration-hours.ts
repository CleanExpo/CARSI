import { resolveDurationHours } from '@/lib/seed/cec-hours';
import { getWpCatalogDurationHours } from '@/lib/seed/cec-professional-assignments';

/** Course fields used to resolve the displayed course duration. */
export type LmsCourseDurationSource = {
  slug: string;
  durationHours?: number | null;
  shortDescription?: string | null;
  description?: string | null;
};

/**
 * Best available duration hours for a course, mirroring the CEC resolution chain:
 * explicit `duration_hours` column → duration prose in the course's own copy →
 * WordPress export catalogue prose (via slug / slugAliases).
 */
export function resolveLmsCourseDurationHours(course: LmsCourseDurationSource): number | null {
  const own = resolveDurationHours({
    durationHours: course.durationHours,
    shortDescription: course.shortDescription,
    description: course.description,
  });
  if (own != null && own > 0) return own;

  return getWpCatalogDurationHours(course.slug);
}

/**
 * Formatted duration label for listings and course pages (`"8"`, `"2.5"`, or null).
 * Minute-based durations round to the nearest half hour with a 0.5 floor, since the
 * UI renders the label as `{value}h` / `{value} hours`.
 */
export function formatLmsCourseDurationHoursLabel(
  course: LmsCourseDurationSource
): string | null {
  const hours = resolveLmsCourseDurationHours(course);
  if (hours == null || hours <= 0) return null;
  const rounded = Math.max(0.5, Math.round(hours * 2) / 2);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

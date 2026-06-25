import { formatCecHoursForDisplay } from '@/lib/cec-display';
import {
  inferCecHoursFromDuration,
  resolveCatalogCecHours,
  resolveDurationHours,
} from '@/lib/seed/cec-hours';

/** Course fields used to resolve IICRC CEC hours for certificates and credentials. */
export type LmsCourseCecSource = {
  slug: string;
  cecHours?: number | null;
  shortDescription?: string | null;
  description?: string | null;
  meta?: unknown;
  durationHours?: number | null;
  iicrcDiscipline?: string | null;
};

function hasIicrcDiscipline(discipline: string | null | undefined): boolean {
  const value = discipline?.trim();
  return Boolean(value && value !== '—' && value !== '-');
}

/**
 * Best available CEC hours for a completed course from LMS database fields:
 * `cec_hours` column, course meta / description text, then duration-based inference
 * for IICRC-discipline courses.
 */
export function resolveLmsCourseCecHours(course: LmsCourseCecSource): number | null {
  const fromCatalog = resolveCatalogCecHours({
    cecHours: course.cecHours,
    shortDescription: course.shortDescription,
    description: course.description,
    meta: course.meta,
    durationHours: course.durationHours,
    iicrcDiscipline: course.iicrcDiscipline,
  });
  if (fromCatalog != null && fromCatalog > 0) return fromCatalog;

  if (!hasIicrcDiscipline(course.iicrcDiscipline)) return null;

  const duration = resolveDurationHours({
    durationHours: course.durationHours,
    shortDescription: course.shortDescription,
    description: course.description,
  });
  return duration != null ? inferCecHoursFromDuration(duration) : null;
}

/** Formatted CEC label for listings and certificates (`"4"`, `"2.5"`, or null). */
export function formatLmsCourseCecHoursLabel(course: LmsCourseCecSource): string | null {
  return formatCecHoursForDisplay(resolveLmsCourseCecHours(course));
}

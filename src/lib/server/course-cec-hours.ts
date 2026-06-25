import { formatCecHoursForDisplay } from '@/lib/cec-display';
import {
  getProfessionalCecAssignment,
  isCecExcludedSlug,
} from '@/lib/seed/cec-professional-assignments';
import { resolveCatalogCecHours } from '@/lib/seed/cec-hours';

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

/**
 * Best available CEC hours for a completed course from LMS database fields:
 * `cec_hours` column, course meta / description text, duration-based inference,
 * then reviewer-assigned professional values for gaps (never overrides stored CEC).
 */
export function resolveLmsCourseCecHours(course: LmsCourseCecSource): number | null {
  if (isCecExcludedSlug(course.slug)) return null;

  const fromCatalog = resolveCatalogCecHours({
    cecHours: course.cecHours,
    shortDescription: course.shortDescription,
    description: course.description,
    meta: course.meta,
    durationHours: course.durationHours,
    iicrcDiscipline: course.iicrcDiscipline,
  });
  if (fromCatalog != null && fromCatalog > 0) return fromCatalog;

  return getProfessionalCecAssignment(course.slug);
}

/** Formatted CEC label for listings and certificates (`"4"`, `"2.5"`, or null). */
export function formatLmsCourseCecHoursLabel(course: LmsCourseCecSource): string | null {
  return formatCecHoursForDisplay(resolveLmsCourseCecHours(course));
}

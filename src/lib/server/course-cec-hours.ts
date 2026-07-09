import { formatCecHoursForDisplay } from '@/lib/cec-display';
import { isCecExcludedSlug } from '@/lib/seed/cec-professional-assignments';
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
 * CEC hours for a course on public listings, certificates and credentials.
 *
 * FAIL-CLOSED (licence-critical): CEC hours are shown ONLY when the founder has set an
 * explicit, founder-approved positive `cecHours` on the course. There is deliberately no
 * fallback to duration, description/meta prose, or reviewer/professional assignment — none
 * of those is IICRC approval, and deriving a CEC claim from them is a licence-critical false
 * claim (founder directive 2026-07-09). An unapproved course shows no CEC, never a fabricated one.
 */
export function resolveLmsCourseCecHours(course: LmsCourseCecSource): number | null {
  if (isCecExcludedSlug(course.slug)) return null;

  const approved = resolveCatalogCecHours({ cecHours: course.cecHours });
  return approved != null && approved > 0 ? approved : null;
}

/** Formatted CEC label for listings and certificates (`"4"`, `"2.5"`, or null). */
export function formatLmsCourseCecHoursLabel(course: LmsCourseCecSource): string | null {
  return formatCecHoursForDisplay(resolveLmsCourseCecHours(course));
}

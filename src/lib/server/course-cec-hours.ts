import { formatCecHoursForDisplay } from '@/lib/cec-display';
import { isCecExcludedSlug } from '@/lib/seed/cec-professional-assignments';
import { getApprovedCecHours } from '@/lib/seed/cec-approvals';

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
 * REGISTRY-ONLY, FAIL-CLOSED (licence-critical, GP-498). CEC hours display ONLY from a
 * founder-confirmed entry in the CEC approvals registry (data/seed/cec-approvals.json, the
 * SSOT). The DB/LMS `cecHours` column is WordPress-import pollution — stale values the IICRC
 * never approved — and is DELIBERATELY NOT consulted here; trusting it rendered "N IICRC CECs"
 * on unapproved courses on prod (fundamental-business-framework/glass-cleaning/PPE). Duration,
 * prose, meta and professional assignment are likewise never approval. An unapproved course
 * shows no CEC, never a fabricated one. (The founder-set catalog mechanism lives in the
 * git-controlled `courses-catalog.json` via `resolveCatalogCecHours`; this DB read path must
 * not inherit that trust because its `cecHours` provenance is the polluted DB column.)
 */
export function resolveLmsCourseCecHours(course: LmsCourseCecSource): number | null {
  if (isCecExcludedSlug(course.slug)) return null;

  const approved = getApprovedCecHours(course.slug);
  return approved != null && approved > 0 ? approved : null;
}

/** Formatted CEC label for listings and certificates (`"4"`, `"2.5"`, or null). */
export function formatLmsCourseCecHoursLabel(course: LmsCourseCecSource): string | null {
  return formatCecHoursForDisplay(resolveLmsCourseCecHours(course));
}

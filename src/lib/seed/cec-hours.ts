/**
 * Resolve IICRC CEC hours for WooCommerce / LMS course rows.
 *
 * Priority: the CEC approvals registry (`data/seed/cec-approvals.json`, the SSOT —
 * see `./cec-approvals`) → explicit founder-set `cec_hours` (the write-path override
 * until registry migration completes).
 *
 * FAIL-CLOSED (licence-critical): there is deliberately NO derivation of CEC hours
 * from course duration, description/short-description prose, or Woo meta. None of
 * those is IICRC approval — a CEC claim requires a recorded per-course IICRC approval
 * (registry entry) or an explicit founder-approved value. Absence of an approval
 * yields null (no CEC), never a derived number (founder directive 2026-07-09; the
 * duration/prose/meta fallback branches were removed 2026-07-09 as part of the
 * registry-SSOT cutover). Do not re-introduce any inference path.
 */

import { getApprovedCecHours } from './cec-approvals';

/** Course duration lines in Woo short descriptions (e.g. "Approx 4Hours").
 *  Duration is display metadata only — it is NEVER a source of CEC hours. */
const DURATION_TEXT_PATTERNS: RegExp[] = [
  /(?:Course\s+Duration|Duration)\s*:?\s*\n?\s*Approx(?:imately)?\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /(?:Course\s+Duration|Duration)\s*:?\s*\n?\s*(\d+(?:\.\d+)?)\s*to\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /Approx(?:imately)?\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /Approx(?:imately)?\s*(\d+(?:\.\d+)?)\s*Minutes?/i,
  /Approximately\s+(\d+(?:\.\d+)?)\s*Minutes?/i,
];

function parsePositiveHours(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function extractDurationHoursFromText(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  for (const pattern of DURATION_TEXT_PATTERNS) {
    const match = pattern.exec(text);
    if (!match?.[1]) continue;
    if (match[2] != null) {
      const low = parsePositiveHours(match[1]);
      const high = parsePositiveHours(match[2]);
      if (low != null && high != null) return Math.max(low, high);
      continue;
    }
    const value = parsePositiveHours(match[1]);
    if (value == null) continue;
    if (/minutes?/i.test(match[0])) return value / 60;
    return value;
  }
  return null;
}

export function resolveDurationHours(row: {
  durationHours?: number | null;
  duration_hours?: number | null;
  shortDescription?: string | null;
  short_description?: string | null;
  description?: string | null;
}): number | null {
  const explicit = parsePositiveHours(row.durationHours ?? row.duration_hours);
  if (explicit != null) return explicit;

  const text = [row.shortDescription ?? row.short_description, row.description]
    .filter(Boolean)
    .join('\n');
  return extractDurationHoursFromText(text);
}

export type CecResolvable = {
  slug?: string | null;
  cec_hours?: number | null;
  short_description?: string | null;
  description?: string | null;
  meta?: unknown;
  duration_hours?: number | null;
  iicrc_discipline?: string | null;
};

/**
 * CEC hours for a WP-export / LmsCourse DB row: registry approval (by slug) → null.
 *
 * REGISTRY-ONLY (licence-critical, GP-498, 2026-07-25). This path reads `row.cec_hours`
 * from WordPress-imported `LmsCourse` DB rows, whose stored `cec_hours` values are stale
 * import data the IICRC never approved. Trusting a stored positive here rendered
 * "N IICRC CECs, exportable for IICRC submission" on unapproved courses on prod
 * (fundamental-business-framework=4, glass-cleaning-course=1, donning/doffing-PPE=1).
 * The stored DB column is therefore NOT a founder-approval signal and is never consulted.
 * The founder-set mechanism lives in the git-controlled catalog (`resolveCatalogCecHours`,
 * `data/seed/courses-catalog.json`) and the approvals registry — not this legacy column.
 * Absence of a registry approval yields null (no CEC), never a stored or derived value.
 */
export function resolveCecHours(row: CecResolvable): number | null {
  // Registry is the ONLY trusted source on the WP/DB path; the stored `cec_hours`
  // column is WP-import pollution and is deliberately ignored (fail-closed).
  return getApprovedCecHours(row.slug) ?? null;
}

export function enrichCourseWithCecHours<T extends CecResolvable>(
  row: T
): T & { cec_hours: number | null } {
  return { ...row, cec_hours: resolveCecHours(row) };
}

/** Catalog JSON uses camelCase `cecHours`. Same rules as `resolveCecHours`. */
export function resolveCatalogCecHours(course: {
  slug?: string | null;
  cecHours?: number | null;
  shortDescription?: string | null;
  description?: string | null;
  meta?: unknown;
  durationHours?: number | null;
  iicrcDiscipline?: string | null;
}): number | null {
  const fromRegistry = getApprovedCecHours(course.slug);
  if (fromRegistry != null) return fromRegistry;

  const explicit = parsePositiveHours(course.cecHours);
  // Explicit 0 = not CEC-approved; never derive (see resolveCecHours).
  if (explicit === 0) return null;
  if (explicit != null) return explicit;

  return null;
}

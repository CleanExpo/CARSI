/**
 * Resolve IICRC CEC hours for WooCommerce / LMS course rows.
 *
 * Priority: explicit `cec_hours` → Woo meta keys → prose in short_description / description
 * (e.g. "Continuing Education Credit (CEC) : 3 Hours").
 *
 * FAIL-CLOSED: course duration is deliberately NOT a source of CEC hours. A CEC claim
 * requires a founder-approved value or an explicit source CEC statement; length is never
 * approval. Absence of any of these yields null (no CEC), never a derived number.
 */

export const CEC_META_KEYS = [
  'cec_hours',
  '_cec_hours',
  'iicrc_cec',
  'continuing_education_credits',
] as const;

/** Common phrasing in CARSI Woo short descriptions. */
const CEC_TEXT_PATTERNS: RegExp[] = [
  /Continuing Education Credit\s*\(CEC\)\s*:\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /Continuing Education Credit\s*:\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /approved for IICRC Continuing Education Credit\s*\(CEC\)\s*:\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /CEC\s+Credits?\s*[\n:]\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /\(CEC\)\s*:\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /\(CEC\)\s*:\s*(\d+(?:\.\d+)?)\b/i,
  /\bCEC\s*:\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /(\d+(?:\.\d+)?)\s*IICRC\s+CEC(?:\s+Hours?|\s+Credits?)?/i,
];

/** Course duration lines in Woo short descriptions (e.g. "Approx 4Hours"). */
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

export function extractCecHoursFromText(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;
  for (const pattern of CEC_TEXT_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const hours = parsePositiveHours(match[1]);
      if (hours != null) return hours;
    }
  }
  return null;
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

/** Read CEC from Woo `meta_data` array (`{ key, value }[]`) or plain object meta. */
export function extractCecHoursFromMeta(meta: unknown): number | null {
  if (meta == null) return null;

  if (Array.isArray(meta)) {
    for (const entry of meta) {
      if (!entry || typeof entry !== 'object') continue;
      const key = String((entry as { key?: unknown }).key ?? '').toLowerCase();
      if (!CEC_META_KEYS.includes(key as (typeof CEC_META_KEYS)[number])) continue;
      const hours = parsePositiveHours((entry as { value?: unknown }).value);
      if (hours != null) return hours;
    }
    return null;
  }

  if (typeof meta === 'object') {
    const record = meta as Record<string, unknown>;
    for (const [rawKey, rawValue] of Object.entries(record)) {
      const key = rawKey.toLowerCase();
      if (!CEC_META_KEYS.includes(key as (typeof CEC_META_KEYS)[number])) continue;
      const hours = parsePositiveHours(rawValue);
      if (hours != null) return hours;
    }
  }

  return null;
}

export type CecResolvable = {
  cec_hours?: number | null;
  short_description?: string | null;
  description?: string | null;
  meta?: unknown;
  duration_hours?: number | null;
  iicrc_discipline?: string | null;
};

/** Best available CEC hours for a WP-export or catalog-shaped row. */
export function resolveCecHours(row: CecResolvable): number | null {
  const explicit = parsePositiveHours(row.cec_hours);
  // Explicit 0 is a deliberate opt-out: the course has NOT been submitted to / approved by
  // IICRC for CECs, so no value may be derived from meta, prose or duration. Claiming CECs
  // without IICRC approval is a licence-critical defect (founder directive 2026-07-09).
  if (explicit === 0) return null;
  if (explicit != null) return explicit;

  const fromMeta = extractCecHoursFromMeta(row.meta);
  if (fromMeta != null) return fromMeta;

  const text = [row.short_description, row.description].filter(Boolean).join('\n');
  const fromText = extractCecHoursFromText(text);
  if (fromText != null) return fromText;

  // Fail-closed: a CEC claim requires an explicit approved value (cec_hours) or a source
  // CEC statement in meta/prose. Course DURATION is NOT approval — never infer CEC from
  // length. Deriving CECs for a course the IICRC has not approved is a licence-critical
  // false claim (founder directive 2026-07-09). This is the root-cause fix for the
  // duration-inference trap: absence of an approval must yield no CEC, not a fabricated one.
  return null;
}

export function enrichCourseWithCecHours<T extends CecResolvable>(
  row: T
): T & { cec_hours: number | null } {
  return { ...row, cec_hours: resolveCecHours(row) };
}

/** Catalog JSON uses camelCase `cecHours`. */
export function resolveCatalogCecHours(course: {
  cecHours?: number | null;
  shortDescription?: string | null;
  description?: string | null;
  meta?: unknown;
  durationHours?: number | null;
  iicrcDiscipline?: string | null;
}): number | null {
  const explicit = parsePositiveHours(course.cecHours);
  // Explicit 0 = not CEC-approved; never derive (see resolveCecHours).
  if (explicit === 0) return null;
  if (explicit != null) return explicit;
  return resolveCecHours({
    short_description: course.shortDescription,
    description: course.description,
    meta: course.meta,
    duration_hours: course.durationHours,
    iicrc_discipline: course.iicrcDiscipline,
  });
}

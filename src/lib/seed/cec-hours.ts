/**
 * Resolve IICRC CEC hours for WooCommerce / LMS course rows.
 *
 * Priority: explicit `cec_hours` → Woo meta keys → prose in short_description / description
 * (e.g. "Continuing Education Credit (CEC) : 3 Hours").
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
  /\(CEC\)\s*:\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /\(CEC\)\s*:\s*(\d+(?:\.\d+)?)\b/i,
  /\bCEC\s*:\s*(\d+(?:\.\d+)?)\s*Hours?/i,
  /(\d+(?:\.\d+)?)\s*IICRC\s+CEC(?:\s+Hours?|\s+Credits?)?/i,
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
    for (const key of CEC_META_KEYS) {
      if (key in record) {
        const hours = parsePositiveHours(record[key]);
        if (hours != null) return hours;
      }
    }
  }

  return null;
}

export type CecResolvable = {
  cec_hours?: number | null;
  short_description?: string | null;
  description?: string | null;
  meta?: unknown;
};

/** Best available CEC hours for a WP-export or catalog-shaped row. */
export function resolveCecHours(row: CecResolvable): number | null {
  const explicit = parsePositiveHours(row.cec_hours);
  if (explicit != null) return explicit;

  const fromMeta = extractCecHoursFromMeta(row.meta);
  if (fromMeta != null) return fromMeta;

  const text = [row.short_description, row.description].filter(Boolean).join('\n');
  return extractCecHoursFromText(text);
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
}): number | null {
  const explicit = parsePositiveHours(course.cecHours);
  if (explicit != null) return explicit;
  return resolveCecHours({
    short_description: course.shortDescription,
    description: course.description,
    meta: course.meta,
  });
}

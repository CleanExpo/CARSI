import { resolveCecHours } from '@/lib/seed/cec-hours';
import type { CourseListItem } from '@/lib/wordpress-export-courses';
import { loadWpExportCourses } from '@/lib/wordpress-export-courses';

/** User-facing CEC label: whole numbers without decimals, halves as one decimal. */
export function formatCecHoursForDisplay(
  value: number | string | null | undefined
): string | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n % 1 === 0 ? String(Math.trunc(n)) : String(Number(n.toFixed(1)));
}

let wpCecBySlugCache: Map<string, string> | undefined;

/** Slug → formatted CEC hours from `courses.json` (parsed text/meta when field is null). */
export function getWpExportCecHoursBySlug(): Map<string, string> {
  if (wpCecBySlugCache) return wpCecBySlugCache;

  wpCecBySlugCache = new Map();
  const courses = loadWpExportCourses();
  if (!courses?.length) return wpCecBySlugCache;

  for (const c of courses) {
    const hours = resolveCecHours({
      cec_hours: c.cec_hours,
      short_description: c.short_description,
      description: c.description,
      meta: c.meta,
    });
    const label = formatCecHoursForDisplay(hours);
    if (label) wpCecBySlugCache.set(c.slug.trim().toLowerCase(), label);
  }

  return wpCecBySlugCache;
}

export function resolveCecHoursLabelForSlug(
  slug: string,
  dbValue: number | string | null | undefined
): string | null {
  const fromDb = formatCecHoursForDisplay(dbValue);
  if (fromDb) return fromDb;
  return getWpExportCecHoursBySlug().get(slug.trim().toLowerCase()) ?? null;
}

export function withCecHoursFallback(item: CourseListItem): CourseListItem {
  const label = resolveCecHoursLabelForSlug(item.slug, item.cec_hours);
  return label ? { ...item, cec_hours: label } : { ...item, cec_hours: null };
}

export function withCecHoursFallbackList(items: CourseListItem[]): CourseListItem[] {
  return items.map(withCecHoursFallback);
}

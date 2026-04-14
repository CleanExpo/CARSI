import fs from 'node:fs';
import path from 'node:path';

import { getLmsSeedExportRows } from '@/lib/lms-seed-catalog';
import { normalizePublicAssetUrl } from '@/lib/remote-image';

/** U+2028/U+2029 break JS string embedding in some bundlers; strip from user-facing text. */
function sanitizeCourseText(s: string | null | undefined): string {
  if (s == null) return '';
  return s
    .replace(/\u2028/g, ' ')
    .replace(/\u2029/g, ' ')
    .replace(/\r\n/g, '\n');
}

/** Path to `wp:migrate` output (gitignored in development). */
export const WP_EXPORT_COURSES_PATH = path.join(
  process.cwd(),
  'data',
  'wordpress-export',
  'courses.json'
);

/** Row shape from `data/wordpress-export/courses.json`. */
export interface WpExportCourse {
  slug: string;
  title: string;
  description?: string;
  short_description?: string;
  thumbnail_url?: string | null;
  price_aud: number;
  is_free?: boolean;
  iicrc_discipline?: string | null;
  status?: string;
  wp_id: number;
  level?: string | null;
  category?: string | null;
  /** When set (e.g. LMS seed), listing UIs can show module/lesson counts. */
  lesson_count?: number | null;
  meta?: {
    wp_id?: number;
    wp_categories?: Array<{ id?: number; name?: string; slug?: string }>;
    wp_tags?: unknown[];
  };
}

/** Map WooCommerce / WP category slugs to IICRC tab codes (extends wp-migrate heuristics). */
const CATEGORY_SLUG_TO_DISCIPLINE: Record<string, string> = {
  'water-restoration': 'WRT',
  'water-damage-restoration': 'WRT',
  'water-damage-courses': 'WRT',
  wrt: 'WRT',
  'carpet-cleaning': 'CCT',
  'carpet-restoration': 'CRT',
  crt: 'CRT',
  'odour-control': 'OCT',
  'odor-control': 'OCT',
  oct: 'OCT',
  'applied-structural-drying': 'ASD',
  asd: 'ASD',
  'fire-smoke': 'FSRT',
  fsrt: 'FSRT',
  mould: 'AMRT',
  'mould-remediation': 'AMRT',
  microbial: 'AMRT',
  amrt: 'AMRT',
};

/**
 * Many exports have `iicrc_discipline: null` but carry discipline via `meta.wp_categories` slugs.
 * Used so CourseGrid discipline tabs (e.g. WRT) match wp-migrate output.
 */
export function inferDisciplineFromWpExport(row: WpExportCourse): string | null {
  if (row.iicrc_discipline) return row.iicrc_discipline;
  const cats = row.meta?.wp_categories;
  if (Array.isArray(cats)) {
    for (const c of cats) {
      const slug = typeof c?.slug === 'string' ? c.slug.toLowerCase() : '';
      if (slug && CATEGORY_SLUG_TO_DISCIPLINE[slug]) {
        return CATEGORY_SLUG_TO_DISCIPLINE[slug];
      }
    }
  }
  const combined = `${row.category ?? ''} ${row.title ?? ''}`.toUpperCase();
  for (const code of ['WRT', 'CRT', 'ASD', 'AMRT', 'OCT', 'CCT', 'FSRT'] as const) {
    if (combined.includes(code)) return code;
  }
  const title = (row.title ?? '').toLowerCase();
  if (title.includes('water') || title.includes('flood')) return 'WRT';
  if (title.includes('mould') || title.includes('mold') || title.includes('microbial'))
    return 'AMRT';
  if (title.includes('carpet clean')) return 'CCT';
  if (title.includes('odour') || title.includes('odor')) return 'OCT';
  if (title.includes('drying') || title.includes('structural')) return 'ASD';
  if (title.includes('fire') || title.includes('smoke')) return 'FSRT';
  return null;
}

/** Shared shape for home featured cards and `CourseGrid` (structural match). */
export type CourseListItem = {
  id: string;
  slug: string;
  title: string;
  short_description?: string | null;
  price_aud: number | string;
  is_free?: boolean;
  discipline?: string | null;
  thumbnail_url?: string | null;
  level?: string | null;
  category?: string | null;
  lesson_count?: number | null;
  /** LMS row status when loaded from Prisma (dashboard catalogue). */
  catalog_status?: 'draft' | 'published' | string | null;
  /** Number of modules (LMS curriculum); used for dashboard sorting. */
  module_count?: number | null;
  updated_at?: string | null;
  instructor?: { full_name: string } | null;
  /** IICRC CEC hours when known (LMS or export). */
  cec_hours?: string | null;
  /** Estimated or published duration hours. */
  duration_hours?: string | null;
};

export function mapWpExportToCourseListItem(row: WpExportCourse): CourseListItem {
  return {
    id: String(row.wp_id),
    slug: row.slug,
    title: sanitizeCourseText(row.title) || row.slug,
    short_description:
      row.short_description != null ? sanitizeCourseText(row.short_description) : null,
    price_aud: row.price_aud,
    is_free: row.is_free,
    discipline: inferDisciplineFromWpExport(row),
    thumbnail_url: normalizePublicAssetUrl(row.thumbnail_url),
    level: row.level != null ? sanitizeCourseText(row.level) : null,
    category: row.category != null ? sanitizeCourseText(row.category) : null,
    lesson_count: row.lesson_count ?? null,
    updated_at: null,
    instructor: null,
    cec_hours: null,
    duration_hours: null,
  };
}

/** Returns parsed courses or `null` if the file is missing or invalid. */
export function loadWpExportCourses(): WpExportCourse[] | null {
  const seed = getLmsSeedExportRows();
  if (seed.length > 0) return seed;

  try {
    if (!fs.existsSync(WP_EXPORT_COURSES_PATH)) return null;
    const raw = fs.readFileSync(WP_EXPORT_COURSES_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as WpExportCourse[];
  } catch {
    return null;
  }
}

/** First `limit` courses, preferring published when enough exist (for static/export-driven UIs). */
export function pickFeaturedFromExport(courses: WpExportCourse[], limit: number): WpExportCourse[] {
  const published = courses.filter((c) => c.status === 'published');
  const pool = published.length >= limit ? published : courses;
  return pool.slice(0, limit);
}

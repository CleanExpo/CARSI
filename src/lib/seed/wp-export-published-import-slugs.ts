import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isCoursesCatalogFile } from './courses-catalog-types';
import { readWpExportCoursesJsonOrThrow } from './wp-export-courses-json';

const HREF_RE = /carsi\.com\.au\/courses\/([^/"']+)\//g;

export type WpExportCourseRow = {
  slug: string;
  title: string;
  description?: string;
  status?: string;
  short_description?: string;
  thumbnail_url?: string | null;
  price_aud?: number;
  is_free?: boolean;
  duration_hours?: number | null;
  level?: string | null;
  category?: string | null;
  tags?: unknown;
  iicrc_discipline?: string | null;
  cec_hours?: number | null;
  meta?: unknown;
  wp_id?: number;
};

function normTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[\u2019']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function slugMatch(seedSlug: string, hrefSlug: string): boolean {
  const s = seedSlug.toLowerCase();
  const h = hrefSlug.toLowerCase();
  return s === h || h.startsWith(s) || s.startsWith(h);
}

export function buildSeedExclusionWpSlugs(
  seedSlugs: string[],
  seedTitles: Set<string>,
  wpExportJson: string
): Set<string> {
  const exclude = new Set<string>();
  const wp = JSON.parse(wpExportJson) as WpExportCourseRow[];

  for (const c of wp) {
    if (seedTitles.has(normTitle(c.title))) {
      exclude.add(c.slug);
    }
    const desc = c.description ?? '';
    let m: RegExpExecArray | null;
    const re = new RegExp(HREF_RE.source, 'g');
    while ((m = re.exec(desc)) !== null) {
      const h = m[1].toLowerCase();
      for (const s of seedSlugs) {
        if (slugMatch(s, h)) exclude.add(c.slug);
      }
    }
  }

  exclude.add('introduction-to-monitoring-air-quality-on-the-job-site');
  exclude.add('introduction-to-monitoring-air-quality-job-site');
  return exclude;
}

/**
 * Same course set as `db:seed-wp-export`: published Woo rows not overlapping the 20 catalog courses.
 */
export function getPublishedWpImportRows(appRoot: string): {
  rows: WpExportCourseRow[];
  excludeSlugs: Set<string>;
} {
  const catalogPath = join(appRoot, 'data', 'seed', 'courses-catalog.json');
  const catalogRaw = readFileSync(catalogPath, 'utf8');
  const catalog = JSON.parse(catalogRaw) as unknown;
  if (!isCoursesCatalogFile(catalog)) {
    throw new Error(`Invalid ${catalogPath}: expected courses catalog v1`);
  }

  const wpRaw = readWpExportCoursesJsonOrThrow(appRoot);
  const seedSlugs = catalog.courses.map((c) => c.slug.trim().toLowerCase());
  const seedTitles = new Set(catalog.courses.map((c) => normTitle(c.title)));
  const excludeSlugs = buildSeedExclusionWpSlugs(seedSlugs, seedTitles, wpRaw);

  const wp = JSON.parse(wpRaw) as WpExportCourseRow[];
  const rows = wp.filter(
    (c) =>
      !excludeSlugs.has(c.slug) && (c.status ?? '').trim().toLowerCase() === 'published'
  );

  return { rows, excludeSlugs };
}

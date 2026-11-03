import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ALL_IICRC_CODES, IICRC_DISCIPLINE_SHORT } from '@/lib/iicrc-discipline-display';
import {
  inferDisciplineFromWpExport,
  mapWpExportToCourseListItem,
  type WpExportCourse,
} from '@/lib/wordpress-export-courses';

// GP-527: inferDisciplineFromWpExport used to return IICRC discipline acronyms derived from
// WordPress categories and titles — a fail-open path that re-attached the codes GP-523 removed
// from CARSI courses. It must now return CARSI's plain-English topic label, never a code.

const row = (over: Partial<WpExportCourse>): WpExportCourse => ({
  slug: 'gp527-row',
  title: 'A course',
  price_aud: 0,
  wp_id: 1,
  ...over,
});

const LABELS = new Set(Object.values(IICRC_DISCIPLINE_SHORT));
const CODE_RE = new RegExp(`\\b(?:${ALL_IICRC_CODES})\\b`);

describe('inferDisciplineFromWpExport (GP-527)', () => {
  it.each([
    ['stored code', row({ iicrc_discipline: 'WRT' }), 'Water Restoration'],
    ['stored code, lower case', row({ iicrc_discipline: 'amrt' }), 'Microbial Remediation'],
    [
      'WP category slug',
      row({ meta: { wp_categories: [{ slug: 'odour-control' }] } }),
      'Odour Control',
    ],
    ['code in title', row({ title: 'ASD intensive' }), 'Structural Drying'],
    ['title keyword', row({ title: 'Mould remediation basics' }), 'Microbial Remediation'],
    ['title keyword (water)', row({ title: 'Flood response' }), 'Water Restoration'],
  ])('%s → plain-English label', (_name, input, expected) => {
    expect(inferDisciplineFromWpExport(input)).toBe(expected);
  });

  it('fails closed: an unknown stored value renders nothing rather than passing it through', () => {
    expect(inferDisciplineFromWpExport(row({ iicrc_discipline: 'XYZ' }))).toBeNull();
    expect(inferDisciplineFromWpExport(row({ title: 'Glass cleaning' }))).toBeNull();
  });

  it('never yields an IICRC code for any row of the real WordPress export', () => {
    const rows = JSON.parse(
      readFileSync(join(process.cwd(), 'data', 'wordpress-export', 'courses.json'), 'utf8')
    ) as WpExportCourse[];
    let labelled = 0;
    for (const r of rows) {
      const d = inferDisciplineFromWpExport(r);
      if (d === null) continue;
      labelled++;
      expect(LABELS.has(d), `${r.slug} → ${d}`).toBe(true);
      expect(CODE_RE.test(d), `${r.slug} → ${d}`).toBe(false);
      expect(mapWpExportToCourseListItem(r).discipline).toBe(d);
    }
    // Positive control: the export does carry discipline signals, so a vacuous all-null result
    // would mean the mapping went blind rather than safe.
    expect(labelled).toBeGreaterThan(0);
  });
});

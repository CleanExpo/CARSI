/**
 * The root layout template is `'%s | CARSI'`, so a page `title` that already ends in "| CARSI"
 * renders "… | CARSI | CARSI" (seen live on /subscribe and course pages). Open Graph and Twitter
 * titles are not templated and may keep the suffix.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { withoutSiteTitleSuffix } from './course-marketing';

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/^(page|layout)\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/**
 * `title:` string literals ending in "| CARSI" whose enclosing object is not openGraph/twitter.
 * The enclosing key is the nearest earlier line with less indentation.
 */
export function templatedTitlesWithSuffix(source: string): string[] {
  const lines = source.split('\n');
  const hits: string[] = [];
  lines.forEach((line, i) => {
    if (!/^\s*title:\s*['`"].*\|\s*CARSI['`"],?\s*$/.test(line)) return;
    const indent = line.search(/\S/);
    for (let j = i - 1; j >= 0; j--) {
      const prev = lines[j];
      if (!prev.trim()) continue;
      if (prev.search(/\S/) < indent) {
        if (!/\b(openGraph|twitter)\b/.test(prev)) hits.push(line.trim());
        return;
      }
    }
  });
  return hits;
}

describe('page titles carry the CARSI suffix once', () => {
  it('detects a templated title with the suffix, and ignores Open Graph / Twitter titles', () => {
    const planted = [
      'export const metadata = {',
      "  title: 'Yearly Membership | CARSI',",
      '  openGraph: {',
      "    title: 'Yearly Membership | CARSI',",
      '  },',
      '  twitter: {',
      "    card: 'summary',",
      "    title: 'Yearly Membership | CARSI',",
      '  },',
      '};',
    ].join('\n');
    expect(templatedTitlesWithSuffix(planted)).toEqual(["title: 'Yearly Membership | CARSI',"]);
  });

  it('no page or layout sets a templated title ending in "| CARSI"', () => {
    const offenders = walk(join(ROOT, 'app')).flatMap((file) =>
      templatedTitlesWithSuffix(readFileSync(file, 'utf8')).map(
        (hit) => `${relative(ROOT, file)}: ${hit}`
      )
    );
    expect(offenders).toEqual([]);
  });

  it('strips a trailing "| CARSI" from course-card SEO titles before the template adds it', () => {
    expect(withoutSiteTitleSuffix('Air Mover Selection and Placement Course | CARSI')).toBe(
      'Air Mover Selection and Placement Course'
    );
    expect(withoutSiteTitleSuffix('Fire & Smoke | carsi ')).toBe('Fire & Smoke');
    expect(withoutSiteTitleSuffix('CARSI Research | CARSI')).toBe('CARSI Research');
    expect(withoutSiteTitleSuffix('Water Damage Essentials')).toBe('Water Damage Essentials');
    expect(withoutSiteTitleSuffix('| CARSI')).toBe('| CARSI');
  });

  it('the course page and courseMetadata both apply the strip', () => {
    const page = readFileSync(join(ROOT, 'app/(public)/courses/[slug]/page.tsx'), 'utf8');
    expect(page).toContain('title: withoutSiteTitleSuffix(metaTitle)');
    const lib = readFileSync(join(ROOT, 'src/lib/seo/course-marketing.ts'), 'utf8');
    expect(lib).toContain('title: withoutSiteTitleSuffix(title)');
  });
});

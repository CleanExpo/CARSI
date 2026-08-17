import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * A course card's `seoTitle` is the PAGE title, not the whole document title.
 *
 * `app/layout.tsx` sets `title: { template: '%s | CARSI' }`, and
 * `app/(public)/courses/[slug]/page.tsx` feeds `card?.seoTitle ?? course.title` into it. So a
 * card whose seoTitle already ends in "| CARSI" gets the suffix twice.
 *
 * Measured on production 2026-08-18: 24 of the 80 live course pages rendered
 * "… | CARSI | CARSI" — and they were exactly the 24 courses backed by a card in this
 * directory, with no counterexample in either direction. The other 56 come straight from the
 * database, use the `course.title` fallback, which carries no suffix, and were correct. The
 * cards were the anomaly.
 *
 * This asserts the data invariant rather than the rendered output because rendering a course
 * page needs a database, and a test that silently skips is how the original defect survived.
 */
const CARDS_DIR = join(process.cwd(), 'data', 'seo', 'course-cards');
const INDEX = join(process.cwd(), 'data', 'seo', 'course-cards.index.json');
const SUFFIX = /\s*\|\s*CARSI\s*$/;

describe('course card seoTitle', () => {
  const files = readdirSync(CARDS_DIR).filter((f) => f.endsWith('.json'));

  it('has cards to check — a zero-length sweep proves nothing', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s does not repeat the site name the layout template adds', (file) => {
    const card = JSON.parse(readFileSync(join(CARDS_DIR, file), 'utf8')) as { seoTitle?: string };
    if (typeof card.seoTitle !== 'string') return;
    expect(card.seoTitle, `"${card.seoTitle}" would render as "… | CARSI | CARSI"`).not.toMatch(SUFFIX);
  });

  it('the index carries the same titles, and the same rule', () => {
    const index = JSON.parse(readFileSync(INDEX, 'utf8')) as Record<string, { seoTitle?: string }>;
    const entries = Object.entries(index);
    expect(entries.length).toBeGreaterThan(0);
    for (const [slug, entry] of entries) {
      if (typeof entry?.seoTitle !== 'string') continue;
      expect(entry.seoTitle, `${slug} would render as "… | CARSI | CARSI"`).not.toMatch(SUFFIX);
    }
  });

  // Prove the check can fail, rather than trusting that it would.
  it('the rule it enforces actually matches the shape that was live', () => {
    expect('Truckmount Operations Course (Australian) | CARSI').toMatch(SUFFIX);
    expect('Truckmount Operations Course (Australian)').not.toMatch(SUFFIX);
  });
});

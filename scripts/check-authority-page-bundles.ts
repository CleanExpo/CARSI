#!/usr/bin/env node
/**
 * GP-661 — authority page bundles vs seed catalogue and committed hero files.
 *
 *   npx tsx scripts/check-authority-page-bundles.ts
 *   npm run check:authority-bundles
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { authorityPages } from '../src/lib/marketing/authority-pages';
import { roleGuidePagePath } from '../src/lib/marketing/role-guides-path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = JSON.parse(
  readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8')
) as { courses: Array<{ slug: string; status: string }> };
const published = new Set(
  catalogue.courses.filter((c) => c.status === 'published').map((c) => c.slug)
);
const known = new Set(catalogue.courses.map((c) => c.slug));

let failed = false;

for (const page of authorityPages) {
  for (const slug of page.bundle.publishedSlugs) {
    if (!known.has(slug)) {
      console.error(`FAIL: ${roleGuidePagePath(page.slug)} publishedSlugs unknown in seed: ${slug}`);
      failed = true;
    } else if (!published.has(slug)) {
      console.error(
        `FAIL: ${roleGuidePagePath(page.slug)} publishedSlugs must be published in seed: ${slug}`
      );
      failed = true;
    }
  }
  for (const slug of page.bundle.awaitingCatalogueSlugs ?? []) {
    if (!known.has(slug)) {
      console.error(
        `FAIL: ${roleGuidePagePath(page.slug)} awaitingCatalogueSlugs unknown in seed: ${slug}`
      );
      failed = true;
    }
  }
  if (page.heroImage) {
    const disk = join(ROOT, 'public', page.heroImage.src.replace(/^\//, ''));
    if (!existsSync(disk)) {
      console.error(`FAIL: ${roleGuidePagePath(page.slug)} hero missing on disk: ${page.heroImage.src}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(
  `OK: ${authorityPages.length} authority guides, bundles and hero files align with seed.`
);

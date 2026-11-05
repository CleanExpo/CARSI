#!/usr/bin/env node
/**
 * GP-661 — live check that each authority guide publishedSlugs course page exists (not soft-404).
 *
 *   npm run verify:authority-bundle-courses
 *   FOR_AUTHORITY_BASE=https://carsi.com.au npx tsx scripts/verify-authority-bundle-courses.ts
 */
import { authorityPages } from '../src/lib/marketing/authority-pages';
import { roleGuidePagePath } from '../src/lib/marketing/role-guides-path';

const BASE = (process.env.FOR_AUTHORITY_BASE ?? 'https://carsi.com.au').replace(/\/$/, '');

async function courseLive(slug: string) {
  const url = `${BASE}/courses/${slug}`;
  const res = await fetch(url, { headers: { Accept: 'text/html' } });
  const html = await res.text();
  if (res.status !== 200) return { url, ok: false as const, why: `HTTP ${res.status}` };
  if (/Course Not Found/i.test(html)) return { url, ok: false as const, why: 'soft 404 title' };
  return { url, ok: true as const };
}

let failed = false;
for (const page of authorityPages) {
  for (const slug of page.bundle.publishedSlugs) {
    const result = await courseLive(slug);
    if (!result.ok) {
      console.error(
        `FAIL: ${roleGuidePagePath(page.slug)} needs live course ${slug} — ${result.why} (${result.url})`
      );
      failed = true;
    } else {
      console.log(`OK: ${slug} (${page.slug})`);
    }
  }
}

if (failed) process.exit(1);
console.log('OK: all publishedSlugs resolve on live site.');

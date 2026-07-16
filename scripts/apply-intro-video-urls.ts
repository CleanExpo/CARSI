/**
 * Write rendered course-intro video URLs into the catalog.
 *
 * The intro-video render (HeyGen → Cloudinary) is decoupled from this write-back so it
 * can be re-run safely and reviewed. This script reads a results map and sets, per course:
 *   - course.introVideoUrl        (top-level — what scripts/check-course-completeness.mjs reads)
 *   - course.meta.introVideoUrl   (what the app reads: admin-courses-service + public-courses-list)
 * plus optional introThumbnailUrl / captionsUrl into meta when present.
 *
 * Results map: data/video/course-intro-video-results.json (or --results=<path>)
 *   { "version": 1, "results": { "<course-slug>": { "url": "https://…mp4",
 *                                                    "captionsUrl"?: "…srt",
 *                                                    "thumbnailUrl"?: "…jpg" } } }
 *
 * Serialisation matches the committed catalog (1-space indent + trailing newline) so the diff
 * stays surgical. Idempotent: re-running with the same map is a no-op.
 *
 * Usage:
 *   npx tsx scripts/apply-intro-video-urls.ts            # apply
 *   npx tsx scripts/apply-intro-video-urls.ts --dry-run  # report what would change, write nothing
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CATALOG = 'data/seed/courses-catalog.json';
const argVal = (n: string) =>
  (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=') || undefined;
const RESULTS = argVal('results') || 'data/video/course-intro-video-results.json';
const DRY = process.argv.includes('--dry-run');

if (!existsSync(RESULTS)) {
  console.error(`No results map at ${RESULTS}. Render intros first, then write { "version":1, "results": { "<slug>": { "url": "…" } } }.`);
  process.exit(2);
}

const resultsFile = JSON.parse(readFileSync(RESULTS, 'utf8'));
const results: Record<string, { url?: string; captionsUrl?: string; thumbnailUrl?: string }> =
  resultsFile.results || {};

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const bySlug = new Map<string, any>(catalog.courses.map((c: any) => [c.slug, c]));

const changes: string[] = [];
let missing = 0;
for (const [slug, r] of Object.entries(results)) {
  const c = bySlug.get(slug);
  if (!c) { console.warn(`  ! results slug not in catalog: ${slug}`); missing++; continue; }
  if (!r.url) { console.warn(`  ! no url for ${slug} (skip)`); continue; }
  const already = c.introVideoUrl === r.url && c.meta?.introVideoUrl === r.url;
  if (already) continue;
  if (!DRY) {
    c.introVideoUrl = r.url;
    c.meta = c.meta || {};
    c.meta.introVideoUrl = r.url;
    if (r.thumbnailUrl) c.meta.introThumbnailUrl = r.thumbnailUrl;
    if (r.captionsUrl) c.meta.introCaptionsUrl = r.captionsUrl;
  }
  changes.push(slug);
}

console.log(`${DRY ? '[dry-run] would set' : 'set'} introVideoUrl on ${changes.length} course(s)${missing ? `, ${missing} unknown slug(s)` : ''}.`);
if (changes.length) console.log('  ' + changes.join('\n  '));
if (!DRY && changes.length) {
  writeFileSync(CATALOG, JSON.stringify(catalog, null, 1) + '\n', 'utf8');
  console.log(`\nwrote ${CATALOG} (1-space). Re-run: node scripts/check-course-completeness.mjs`);
}

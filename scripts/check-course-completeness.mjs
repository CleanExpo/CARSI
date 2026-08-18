#!/usr/bin/env node
/**
 * check-course-completeness.mjs — the objective "finalised" bar for CARSI courses.
 *
 * Scores every course in data/seed/courses-catalog.json against a documented
 * completeness bar and prints a per-course scorecard + summary. Cross-references
 * assessment drafts (data/seed/assessment-drafts/<slug>.quizzes.json) and the
 * media manifests (data/media/*-media-manifest.json).
 *
 * Advisory by default (exit 0) so it can land without blocking CI. Pass
 * --enforce=<slug,slug|all> to exit non-zero when any course in that release set
 * has an OPEN gap — that's how a series gets promoted to "must stay finalised".
 *
 * No dependencies: node built-ins only.
 *
 * The bar (each course):
 *   assessment   — a quiz lesson with real content, OR a non-empty
 *                  assessment-drafts/<slug>.quizzes.json
 *   thumbnail    — thumbnailUrl set (a CourseTextThumbnail fallback still counts
 *                  as "derived", flagged separately)
 *   introVideo   — introVideoUrl set, OR a media-manifest entry for the slug
 *   metadata     — durationHours, level, category, shortDescription, non-empty tags
 *   scaffolds    — body signals learning objectives AND at least one
 *                  nugget/take-away marker
 *   depth        — not a stub (>= MIN_BODY chars) and not too thin per lesson
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CATALOG = 'data/seed/courses-catalog.json';
const DRAFTS_DIR = 'data/seed/assessment-drafts';
const MEDIA_DIR = 'data/media';
const MIN_BODY = 2000; // below this = stub
const MIN_PER_LESSON = 500; // below this avg = thin

const args = process.argv.slice(2);
const enforceArg = (args.find((a) => a.startsWith('--enforce=')) || '').slice('--enforce='.length);
const enforceSet = enforceArg === 'all' ? 'all' : new Set(enforceArg.split(',').map((s) => s.trim()).filter(Boolean));
const jsonOut = args.includes('--json');

if (!existsSync(CATALOG)) { console.error(`missing ${CATALOG}`); process.exit(2); }
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const courses = catalog.courses || [];

// index the assessment drafts + media-manifest coverage by slug
const draftSlugs = new Set(
  existsSync(DRAFTS_DIR)
    ? readdirSync(DRAFTS_DIR).filter((f) => f.endsWith('.quizzes.json')).map((f) => f.replace('.quizzes.json', ''))
    : []
);
const mediaSlugs = new Set();
if (existsSync(MEDIA_DIR)) {
  for (const f of readdirSync(MEDIA_DIR).filter((f) => f.endsWith('.json'))) {
    try {
      const m = JSON.parse(readFileSync(join(MEDIA_DIR, f), 'utf8'));
      const course = m.course;
      const hasVideo = (m.assets || []).some((a) => a.kind === 'video');
      if (course && hasVideo) mediaSlugs.add(course);
    } catch { /* ignore */ }
  }
}

function bodyStats(course) {
  let chars = 0, lessons = 0, quizWithContent = false;
  for (const m of course.modules || []) {
    for (const l of m.lessons || []) {
      lessons++;
      chars += (l.contentBody || '').length;
      if (l.contentType === 'quiz' && (((l.contentBody || '').length > 40) || (l.resources && JSON.stringify(l.resources).length > 40))) {
        quizWithContent = true;
      }
    }
  }
  return { chars, lessons, quizWithContent };
}

/**
 * Exported so scripts/check-course-completeness.test.mjs can prove each bar FAILS when the
 * element is missing, without those gaps having to exist in the catalogue. This scorecard
 * runs in advisory mode and exits 0 even while reporting 0/37 finalised, so nothing else in
 * CI can tell the difference between a working bar and a bar that always returns true —
 * exactly how the introVideo shortcut survived.
 */
export function scoreCourse(course) {
  const slug = course.slug || course.id;
  const { chars, lessons, quizWithContent } = bodyStats(course);
  const bodyBlob = JSON.stringify(course).toLowerCase();

  const checks = {
    assessment: quizWithContent || draftSlugs.has(slug),
    thumbnail: !!course.thumbnailUrl,
    // Evidence about THIS course only: an intro video on the course record, or a media manifest
    // that names this slug and carries a video asset.
    //
    // A third clause used to read:
    //   mediaSlugs.has('ccw-workshop') && /ccw|carpet|floor|truckmount/.test(slug)
    // which passed any course whose slug merely CONTAINED one of those words, on the strength of
    // a single unrelated `ccw-workshop` manifest. It reported 5 of 37 courses "finalised" while
    // every one of the 37 had introVideoUrl undefined — verified by direct field read. A
    // scorecard that manufactures a pass is worse than no scorecard: it retires the very work it
    // exists to track. If a course really is covered by workshop footage, name its slug in a
    // manifest and the second clause will find it.
    introVideo: !!course.introVideoUrl || mediaSlugs.has(slug),
    metadata: !!course.durationHours && !!course.level && !!course.category && !!course.shortDescription && Array.isArray(course.tags) && course.tags.length > 0,
    scaffolds: /objective|by the end|you will (be able|learn)/.test(bodyBlob) && /(did you know|key takeaway|remember|expert nugget|take-?away|in summary|recap)/.test(bodyBlob),
    depth: chars >= MIN_BODY && (lessons === 0 || chars / lessons >= MIN_PER_LESSON),
  };
  const open = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  return { slug, title: course.title, chars, lessons, checks, open, complete: open.length === 0 };
}

// CLI only. Importing this module for the self-test must not run the scan or exit the
// process — without this, `import` prints the whole scorecard and calls process.exit(),
// so a self-test can never observe scoreCourse at all.
// pathToFileURL, never `file://` + the raw path — an unencoded space (or any character needing
// percent-encoding) in the checkout path makes this false and silently disarms the check.
const isCli = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (!isCli) {
  // Nothing below runs on import.
} else {

const scored = courses.map(scoreCourse);

if (jsonOut) {
  console.log(JSON.stringify({ total: scored.length, scored }, null, 2));
  process.exit(0);
}

// ── report ──────────────────────────────────────────────────────────────────
const BARS = ['assessment', 'thumbnail', 'introVideo', 'metadata', 'scaffolds', 'depth'];
console.log(`\nCARSI course completeness — ${scored.length} courses\n`);
console.log('  ' + 'course'.padEnd(52) + BARS.map((b) => b.slice(0, 6).padStart(7)).join('') + '   open');
console.log('  ' + '-'.repeat(52 + 7 * BARS.length + 7));
for (const s of scored.sort((a, b) => a.open.length - b.open.length || a.slug.localeCompare(b.slug))) {
  const cells = BARS.map((b) => (s.checks[b] ? '   ✓  ' : '   ✗  ').padStart(7)).join('');
  const mark = s.complete ? '✅' : `${s.open.length}`;
  console.log('  ' + (s.slug.slice(0, 50)).padEnd(52) + cells + `   ${mark}`);
}

console.log('\n  Gap totals (courses missing each element):');
for (const b of BARS) {
  const n = scored.filter((s) => !s.checks[b]).length;
  console.log(`    ${b.padEnd(12)} ${n} / ${scored.length}${n ? '  ✗' : '  ✓'}`);
}
const done = scored.filter((s) => s.complete).length;
console.log(`\n  Finalised (all bars green): ${done} / ${scored.length}`);

// ── enforcement ───────────────────────────────────────────────────────────────
if (enforceSet !== 'all' && enforceSet.size === 0) {
  console.log('\n  (advisory mode — pass --enforce=<slug,…|all> to fail CI on open gaps)\n');
  process.exit(0);
}
const inSet = (s) => enforceSet === 'all' || enforceSet.has(s.slug);
const failing = scored.filter((s) => inSet(s) && !s.complete);
if (failing.length) {
  console.error(`\n  ✖ ${failing.length} enforced course(s) have open gaps:`);
  for (const s of failing) console.error(`     ${s.slug}: ${s.open.join(', ')}`);
  console.error('');
  process.exit(1);
}
console.log(`\n  ✓ all enforced courses finalised.\n`);
process.exit(0);

}

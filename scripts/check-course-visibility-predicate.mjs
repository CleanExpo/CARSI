#!/usr/bin/env node
/**
 * Course-visibility predicate guard.
 *
 * `status` is the canonical publication flag (#137); `isPublished` is a legacy dual-write column.
 * Reading the legacy column ALONE to decide whether a learner sees a course splits the product in
 * two — 20 courses currently carry status='published' with isPublished=false, so they were
 * enrollable from the public catalogue while invisible in pathways, pathway progress and team
 * assignment (fixed in e2f1b6c4 and 8b922eed).
 *
 * Why this exists rather than a grep: I searched for this by hand twice and got the scope wrong
 * both times. The first pass checked only the two files I had edited. The second used a pattern
 * (`course.isPublished` / `course: { isPublished`) that structurally could not match the most
 * common Prisma shape — a bare `{ isPublished: true }` inside a where clause. A rule I have to
 * remember to apply is not a rule.
 *
 * What counts as SAFE, and why:
 *   - a union with status      `OR: [{ isPublished: true }, { status: 'published' }]`
 *                              tolerant: the canonical clause still admits the course
 *   - derived from status      `const isPublished = statusRaw === 'published'`
 *                              the legacy column is an OUTPUT here, not an input
 *   - a different entity       pathways, reviews and practical assessments each have their own
 *                              isPublished; only lmsCourse is in scope
 *   - admin surfaces           admin-courses-service reads both ON PURPOSE, to display the drift
 *
 * Usage: node scripts/check-course-visibility-predicate.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SCAN_DIRS = ['app', 'src'];
const SKIP = [/src\/generated\//, /\.test\.[tj]sx?$/, /node_modules/];
/** Admin surfaces legitimately read both columns to show the discrepancy. */
const ALLOW_FILES = [/src\/lib\/admin\/admin-courses-service\.ts$/];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    if (SKIP.some((r) => r.test(p))) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(p))) out.push(p);
  }
  return out;
}

/** A window around the hit, wide enough to see an adjacent status clause. */
const WINDOW = 220;

const findings = [];
for (const file of SCAN_DIRS.flatMap((d) => walk(d))) {
  if (ALLOW_FILES.some((r) => r.test(file))) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');

  // Word-boundary matched. Without it, `isPublishedRow` — the tolerant union helper in
  // renewal-summary — was reported as a violation because it merely CONTAINS the field name.
  for (const m of text.matchAll(/\bisPublished\b/g)) {
    const idx = m.index ?? 0;
    const lineNo = text.slice(0, idx).split('\n').length;
    const line = lines[lineNo - 1] ?? '';
    const ctx = text.slice(Math.max(0, idx - WINDOW), idx + WINDOW);

    if (/^\s*(\/\/|\*)/.test(line)) continue;                          // comment
    if (/^\s*import\b/.test(line)) continue;                           // import of the helper
    if (/isPublished\s*[:?]\s*(boolean|Boolean)/.test(line)) continue;  // type member
    if (/(const|let|var)\s+isPublished\s*=/.test(line)) continue;       // derived from status

    // Only a READ that DECIDES visibility matters. A `where` clause, or an in-memory filter.
    // Everything else — a select projection, a create/update payload, a React state setter — is
    // not a visibility decision, and flagging it would train someone to ignore this guard.
    const inWhere = /\bwhere\s*:\s*\{[^}]*$/s.test(text.slice(Math.max(0, idx - WINDOW), idx));
    // Check the LINE for a filter, not a backwards window. The window form used `[^)]*$`, which
    // cannot span an earlier closed paren — in pathway-progress the preceding line ends
    // `.filter((p) => p.courses.length > 0)`, so the real filter on the next line was never
    // recognised. A canary caught it; the window was the wrong instrument.
    const inFilter = /\.filter\s*\(/.test(line);
    if (!inWhere && !inFilter) continue;

    // SAFE only when a PUBLICATION status clause sits alongside it — the tolerant union.
    //
    // This was originally `if (/status/.test(ctx))`, which a canary proved defeated: the teams
    // route has `status: { notIn: ['cancelled'] }` (an ENROLMENT status) two lines above the
    // course filter, so an unrelated field named `status` disarmed the guard on the exact bug it
    // was written to catch. Match the publication value, not the word.
    if (/status\s*:\s*(\{\s*equals\s*:\s*)?['"]published['"]/i.test(ctx)) continue;

    // Only lmsCourse is in scope. Resolve the ENCLOSING Prisma model rather than sniffing a text
    // window — pathways, reviews and practical assessments each own an isPublished, and a window
    // wide enough to catch the model name is also wide enough to catch the wrong one.
    const before = text.slice(0, idx);
    const modelHits = [...before.matchAll(/prisma\.([A-Za-z]+)\s*\./g)];
    const nearestModel = modelHits.length ? modelHits[modelHits.length - 1][1] : null;
    const isCourseModel = nearestModel === 'lmsCourse';
    // A nested course relation inside another model's query still counts.
    const nestedCourse = /course\s*:\s*\{[^}]*$/s.test(text.slice(Math.max(0, idx - WINDOW), idx));
    // An in-memory read off a course object. A canary proved this was being missed: in
    // pathway-progress the nearest `prisma.` model is lmsLessonProgress, so model resolution
    // rejected `.filter(pc => pc.course.isPublished)` — the exact bug the guard exists for.
    const memberRead = /\.course\.isPublished\b/.test(line) || /\bcourse\.isPublished\b/.test(line);
    if (!isCourseModel && !nestedCourse && !memberRead) continue;

    findings.push({ file, line: lineNo, text: line.trim().slice(0, 120) });
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ findings }, null, 2));
} else if (findings.length === 0) {
  console.log('\n✓ No course-visibility decision reads the legacy `isPublished` column alone.\n');
} else {
  console.log('\n✖ Course visibility decided by the legacy `isPublished` column\n');
  console.log('  `status` is canonical (#137). Reading isPublished alone hides courses that are');
  console.log('  published — 20 rows currently differ. Use lmsPublishedCourseWhere, or');
  console.log('  isPublishedCourseStatus() for rows already in memory.\n');
  for (const f of findings) console.log(`  ${f.file}:${f.line}\n    → ${f.text}`);
  console.log('');
}

process.exit(findings.length === 0 ? 0 : 1);

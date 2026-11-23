#!/usr/bin/env node
/**
 * check-course-visuals.mjs: Course Standard v1, section 4.1 items 1 to 3 (Linear GP-752).
 *
 * Every course with meta.standard "v1" must have:
 *   cover    a thumbnailUrl (a local file under public/ must exist; an https or protocol-relative
 *            //host URL is accepted as remote);
 *   and every teaching lesson (contentType is not "quiz", COURSE_STANDARD.md section 3.3) must
 *   carry both
 *   image    a raster lesson image (.png .jpg .jpeg .webp .avif), as an <img src> in the body or a
 *            resource url; an SVG never counts as the lesson image, whatever its resource kind;
 *   diagram  a hand-written SVG at /courses/<folder>/diagrams/<name>.svg, as an <img src> in the
 *            body or a resource url, and the file must exist under public/. Only files in a
 *            diagrams folder count, because only those are checked by check:course-diagrams.
 *
 * Body images are read from the src attribute only (quoted or unquoted; data-src is ignored), and
 * HTML comments are skipped. The diagram suffix is a lower-case ".svg", as check:course-diagrams
 * reads it (GP-754).
 *
 * Scanned: data/seed/courses-catalog.json and every data/courses/<slug>/v1-draft/ and v1/
 * courses-catalog.json. Floor 5.10 of audit-course-depth.mjs only asks for "some visual"; this
 * check asks for each kind separately.
 *
 * Gaps that existed when the check was added are frozen in scripts/course-visuals-baseline.json,
 * keyed by course slug, lesson id and missing kind (lesson "-" for the cover). The key leaves out
 * the catalogue file on purpose: a draft promoted to data/seed keeps its lesson ids, and a seed
 * course and its v1-draft copy share them, so one entry covers the lesson wherever it lives. The
 * run fails when
 *   - a gap is not in the baseline (a new lesson without a visual, or a visual removed), or
 *   - a baseline entry is no longer a gap (it was fixed, or the lesson is gone): delete that
 *     entry in the same change, so the baseline only shrinks.
 *
 * Usage: node scripts/check-course-visuals.mjs [--root=DIR] [--baseline=FILE] [--print-gaps]
 *   --root        repository root to read data/ and public/ from (default: current directory)
 *   --baseline    baseline file (default: <root>/scripts/course-visuals-baseline.json)
 *   --print-gaps  print the current gaps as baseline JSON and exit 0 (for review, not for CI)
 * Exit codes: 0 pass, 1 new or stale gap, 2 input error (no v1 course found, unreadable file).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isEntryPoint } from './lib/is-entry-point.mjs';

export const KINDS = ['cover', 'image', 'diagram'];
const RASTER = /\.(png|jpe?g|webp|avif)$/i;
// Case-sensitive on purpose: check:course-diagrams only reads files ending in lower-case ".svg".
const DIAGRAM = /^\/courses\/[^/]+\/diagrams\/[^/]+\.svg$/;
// The src attribute only (whitespace before it, so data-src is not read), quoted or unquoted.
const IMG_SRC = /<img\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
const HTML_COMMENT = /<!--[\s\S]*?(?:-->|$)/g;
// https://host/... or protocol-relative //host/..., which loads over the page's https scheme.
const REMOTE = /^(?:https:)?\/\//i;

function bare(url) {
  return String(url || '')
    .trim()
    .replace(/[?#].*$/, '');
}
function localFileExists(root, url) {
  if (!url.startsWith('/') || url.startsWith('//') || url.includes('..')) return false;
  const p = join(root, 'public', url);
  return existsSync(p) && statSync(p).isFile();
}
/** A raster lesson image: an https URL, or a local file that exists under public/. */
export function isLessonImage(root, url) {
  const u = bare(url);
  if (!RASTER.test(u)) return false;
  if (REMOTE.test(u)) return true;
  return localFileExists(root, u);
}
/** A course diagram: /courses/<folder>/diagrams/<name>.svg that exists under public/. */
export function isDiagram(root, url) {
  const u = bare(url);
  return DIAGRAM.test(u) && localFileExists(root, u);
}
export function isCover(root, url) {
  const u = bare(url);
  if (!u) return false;
  if (REMOTE.test(u)) return true;
  return localFileExists(root, u);
}

/** Every visual URL a lesson references: body <img src> values plus resource urls. */
export function lessonUrls(lesson) {
  const out = [];
  const body = String(lesson.contentBody || '').replace(HTML_COMMENT, '');
  for (const m of body.matchAll(IMG_SRC)) out.push(m[1] ?? m[2] ?? m[3]);
  for (const r of Array.isArray(lesson.resources) ? lesson.resources : []) {
    if (r && typeof r.url === 'string') out.push(r.url);
  }
  return out;
}

/** The catalogue files in scope, as repository-relative paths with forward slashes. */
export function catalogueFiles(root) {
  const files = [];
  if (existsSync(join(root, 'data/seed/courses-catalog.json')))
    files.push('data/seed/courses-catalog.json');
  const dir = join(root, 'data/courses');
  if (existsSync(dir)) {
    for (const slug of readdirSync(dir).sort()) {
      for (const v of ['v1-draft', 'v1']) {
        const rel = `data/courses/${slug}/${v}/courses-catalog.json`;
        if (existsSync(join(root, rel))) files.push(rel);
      }
    }
  }
  return files;
}

export function gapKey(g) {
  return `${g.slug}::${g.lessonId}::${g.missing}`;
}

/** Scan every v1 course. Returns { courses, gaps } or throws on an unreadable catalogue. */
export function findGaps(root) {
  const gaps = [];
  const courses = [];
  for (const file of catalogueFiles(root)) {
    let catalog;
    try {
      catalog = JSON.parse(readFileSync(join(root, file), 'utf8'));
    } catch (e) {
      throw new Error(`cannot parse ${file}: ${e.message}`);
    }
    for (const course of Array.isArray(catalog?.courses) ? catalog.courses : []) {
      if (course?.meta?.standard !== 'v1') continue;
      const slug = String(course.slug);
      let teaching = 0;
      if (!isCover(root, course.thumbnailUrl))
        gaps.push({ file, slug, lessonId: '-', lessonTitle: '(course cover)', missing: 'cover' });
      (course.modules || []).forEach((m, i) => {
        (m?.lessons || []).forEach((l, j) => {
          if (!l || l.contentType === 'quiz') return;
          teaching++;
          const lessonId = String(l.id || `module-${i + 1}-lesson-${j + 1}`);
          const urls = lessonUrls(l);
          const base = { file, slug, lessonId, lessonTitle: String(l.title || '') };
          if (!urls.some((u) => isLessonImage(root, u))) gaps.push({ ...base, missing: 'image' });
          if (!urls.some((u) => isDiagram(root, u))) gaps.push({ ...base, missing: 'diagram' });
        });
      });
      courses.push({ file, slug, teaching });
    }
  }
  gaps.sort((a, b) => gapKey(a).localeCompare(gapKey(b)));
  return { courses, gaps };
}

/** Compare current gaps with the frozen baseline. */
export function compare(gaps, baselineGaps) {
  const base = new Set(baselineGaps.map(gapKey));
  const now = new Set(gaps.map(gapKey));
  return {
    added: gaps.filter((g) => !base.has(gapKey(g))),
    stale: baselineGaps.filter((g) => !now.has(gapKey(g))),
  };
}

function readBaseline(path) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  if (!j || !Array.isArray(j.gaps)) throw new Error(`${path} has no "gaps" array`);
  for (const g of j.gaps) {
    if (!g || !g.slug || !g.lessonId || !KINDS.includes(g.missing))
      throw new Error(`${path} has a malformed entry: ${JSON.stringify(g)}`);
  }
  return j.gaps;
}

if (isEntryPoint(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const root = opt('root') || '.';
  const baselinePath = opt('baseline') || join(root, 'scripts/course-visuals-baseline.json');
  let result;
  try {
    result = findGaps(root);
  } catch (e) {
    console.error(`check-course-visuals: ${e.message}`);
    process.exit(2);
  }
  const { courses, gaps } = result;
  if (courses.length === 0) {
    console.error(
      'check-course-visuals: no meta.standard v1 course found; a scan of nothing is not a pass'
    );
    process.exit(2);
  }
  if (args.includes('--print-gaps')) {
    const unique = new Map();
    for (const { slug, lessonId, lessonTitle, missing } of gaps)
      unique.set(gapKey({ slug, lessonId, missing }), { slug, lessonId, lessonTitle, missing });
    console.log(JSON.stringify({ gaps: [...unique.values()] }, null, 2));
    process.exit(0);
  }
  let baseline;
  try {
    baseline = readBaseline(baselinePath);
  } catch (e) {
    console.error(`check-course-visuals: cannot read baseline: ${e.message}`);
    process.exit(2);
  }
  console.log(`Course visuals (cover, lesson image, diagram): ${courses.length} v1 course(s)`);
  for (const c of courses) {
    const mine = gaps.filter((g) => g.file === c.file && g.slug === c.slug);
    const n = (k) => mine.filter((g) => g.missing === k).length;
    console.log(
      `  ${c.file}  ${c.slug}: ${c.teaching} teaching lessons; missing image ${n('image')}, diagram ${n('diagram')}, cover ${n('cover')}`
    );
  }
  // A lesson that is in both the seed and its v1-draft copy is one baseline entry; report each file.
  const { added, stale } = compare(gaps, baseline);
  console.log(
    `  known gaps (baseline): ${baseline.length - stale.length}; new: ${added.length}; fixed or gone: ${stale.length}`
  );
  if (added.length) {
    console.error('\n  NEW gaps (not in scripts/course-visuals-baseline.json):');
    for (const g of added)
      console.error(
        `    ${g.file}  ${g.slug}  ${g.lessonId}  "${g.lessonTitle}"  missing ${g.missing}`
      );
  }
  if (stale.length) {
    console.error('\n  Baseline entries that are no longer gaps; delete them from the baseline:');
    for (const g of stale)
      console.error(`    ${g.slug}  ${g.lessonId}  "${g.lessonTitle}"  missing ${g.missing}`);
  }
  if (added.length || stale.length) process.exit(1);
  console.log('  OK: no new gap, and every baseline entry is still a gap.');
  process.exit(0);
}

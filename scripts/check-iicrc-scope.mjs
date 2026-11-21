#!/usr/bin/env node
/**
 * IICRC scope guard (licence-critical, fail-closed). Linear GP-748.
 *
 * Founder rule (Phill, 21/11/2026): "We can NOT use IICRC CERTIFICATIONS or COURSE Content
 * details in Non- IICRC CeC accredited course." Founder decisions the same day: every course that
 * is not CEC-approved drops every IICRC standard and certification reference, and never names
 * the IICRC at all, not even to say "this is not IICRC certification". It says only that it is a
 * CARSI course and a CARSI credential. CEC-approved courses are out of scope here.
 *
 * A course is CEC-approved only when data/seed/cec-approvals.json holds an entry with its exact
 * slug and status "approved" (the same rule as src/lib/seed/cec-approvals.ts). Every other slug,
 * including a slug this guard cannot resolve, is scanned as NOT approved.
 *
 * BANNED on a learner-facing surface of a non-approved course:
 *   - the word IICRC in any form (ANSI/IICRC, AS-IICRC, iicrc.org links), and the IICRC's name
 *     spelled out;
 *   - an IICRC standard number: S100, S210, S220, S300, S400, S500, S520, S540, S600, S700, S800
 *     (also "S 500" and "S-500");
 *   - an IICRC certification or designation acronym from data/iicrc-codes.json (WRT, ASD, AMRT,
 *     FSRT, CCT, TCST ...), matched as an upper-case word. Codes that are also ordinary words
 *     (Oct, BMI, CPT, RCT, RFI, SCI, Mrs) are skipped; beside the word IICRC they are caught anyway.
 *     A product name that contains a code by coincidence (the HydraMaster "CDS xDrive") is listed
 *     exactly in PRODUCT_NAMES and removed before matching;
 *   - a non-null iicrcDiscipline on a catalogue entry.
 * Text is normalised the way a reader sees it (normaliseForScan from check-cec-course-brand.mjs:
 * JSON and HTML escapes decoded, invisible characters removed) and also read with markup removed.
 *
 * LEARNER-FACING FIELDS (scanned for every non-approved course):
 *   Catalogue entries: data/seed/courses-catalog.json and data/courses/<slug>/v1-draft/ or v1/
 *   courses-catalog.json
 *     course:   title, description, shortDescription, tags[], level, category, iicrcDiscipline,
 *               every string in meta EXCEPT meta.draftNote, meta.absorbs, meta.durationNote and
 *               meta.shortCourseDelivery (internal build notes; the curriculum API returns the rest
 *               of meta to the learner's browser, so the rest counts as learner-facing)
 *     module:   title
 *     lesson:   title, contentBody, every string under resources (label, url, cards, decks)
 *   Course JSON files keyed by courseSlug: every JSON file under data/seed/ (quizzes, assessments,
 *   assessment-drafts, flashcards, slides, audio-overview) and every other JSON file directly in
 *   data/courses/<slug>/v1-draft/ or v1/
 *     file:     disclaimer
 *     quiz:     title, lessonTitle; question: questionText, options[], explanation, unit
 *     assessment: title, instructions, every string under criteria
 *     decks / segments (flashcards, slides, audio overview): every string
 *   Course files served from public/courses/<folder>/ (field tools, diagrams, course packs): every
 *   text file (.md .svg .html .htm .txt .json .vtt .srt .csv .xml), whole.
 *   SEO course cards, data/seo/course-cards/<slug>.json and the matching entry in
 *   data/seo/course-cards.index.json, for every slug in a catalogue file above: every string.
 *   Markdown course copy directly in data/courses/<slug>/v1-draft/ or v1/ (not evidence/, not
 *   research-pack.md or a *spec.md): whole file.
 *
 * NOT SCANNED (internal, or out of this guard's reach; each is named in the output):
 *   meta.draftNote, meta.absorbs, meta.durationNote, meta.shortCourseDelivery; ids, slugs, status,
 *   prices, flags and media URLs (thumbnailUrl, introVideoUrl); a course JSON file's note, status
 *   and version; a question's sourceRef, correctIndex and points; evidence ledgers, research packs,
 *   specs, scaffolds and assessment skeletons; binary files under public/courses (PDF, images,
 *   video: counted and listed as NOT INSPECTED, never as clean); data/wordpress-export (the legacy
 *   WordPress seed, owned by GP-525 and GP-749); SEO course cards whose slug is in no
 *   catalogue file (legacy WordPress slugs, GP-749); the live database.
 *
 * FAIL CLOSED: exits 1 on a hit, on no approved slugs, on no catalogue course read, on a JSON
 * file that will not parse, on a data/seed JSON file that is neither a course file nor a known
 * registry, and on any field this header does not classify (a new field must be classified here
 * before it can pass). Files are enumerated from the filesystem, so a new untracked file is seen.
 *
 * Usage: node scripts/check-iicrc-scope.mjs [--root=DIR]
 * Fix a hit by rewriting the copy as CARSI's own teaching. Never exempt a course here: a course
 * may carry IICRC content only once it is approved in data/seed/cec-approvals.json.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normaliseForScan } from './check-cec-course-brand.mjs';
import { IICRC_CODES, IICRC_ORDINARY_WORD_CODES } from './iicrc-codes.mjs';
import { isEntryPoint } from './lib/is-entry-point.mjs';

const STANDARD_NUMBERS = ['100', '210', '220', '300', '400', '500', '520', '540', '600', '700', '800'];
const ACRONYMS = IICRC_CODES.filter((code) => !IICRC_ORDINARY_WORD_CODES.has(code));

const TERMS = [
  { label: 'IICRC', pattern: /iicrc/i },
  { label: 'IICRC name spelled out', pattern: /institute\s+of\s+inspection,?\s+cleaning,?\s+and\s+restoration/i },
  {
    label: 'IICRC standard number',
    pattern: new RegExp(`(?<![A-Za-z0-9])S[\\s-]?(?:${STANDARD_NUMBERS.join('|')})(?![0-9])`),
  },
  {
    label: 'IICRC certification acronym',
    pattern: new RegExp(`(?<![A-Za-z0-9])(?:${ACRONYMS.join('|')})(?![A-Za-z0-9])`),
  },
];

/**
 * Product names that contain an IICRC acronym by coincidence, removed before matching. Keep this
 * list to exact product names; never add an IICRC term here to make a course pass.
 */
const PRODUCT_NAMES = [/\bCDS xDrive\b/g];

/** Labels of every banned term in the text, as written or with markup removed. */
export function scopeHits(text) {
  const normal = normaliseForScan(String(text));
  const views = [normal, normal.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')].map((v) =>
    PRODUCT_NAMES.reduce((t, re) => t.replace(re, ' '), v)
  );
  return TERMS.filter(({ pattern }) => views.some((v) => pattern.test(v))).map(({ label }) => label);
}

function snippet(text, label) {
  const normal = normaliseForScan(String(text)).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const term = TERMS.find((t) => t.label === label);
  const m = term ? normal.match(term.pattern) : null;
  if (!m) return normal.slice(0, 120);
  const start = Math.max(0, m.index - 60);
  return normal.slice(start, m.index + m[0].length + 60).trim();
}

// ── Field classification ─────────────────────────────────────────────────────────────────────
const COURSE_LEARNER = new Set(['title', 'description', 'shortDescription', 'tags', 'level', 'category']);
const COURSE_INTERNAL = new Set([
  'id', 'slug', 'thumbnailUrl', 'instructorId', 'status', 'priceAud', 'isFree', 'durationHours',
  'cecHours', 'isPublished', 'introVideoUrl',
]);
const META_INTERNAL = new Set(['draftNote', 'absorbs', 'durationNote', 'shortCourseDelivery']);
const MODULE_LEARNER = new Set(['title']);
const MODULE_INTERNAL = new Set(['id', 'orderIndex']);
const LESSON_LEARNER = new Set(['title', 'contentBody', 'resources']);
const LESSON_INTERNAL = new Set(['id', 'contentType', 'orderIndex', 'isPreview']);
const FILE_LEARNER = new Set(['disclaimer', 'quizzes', 'assessment', 'decks', 'segments']);
const FILE_INTERNAL = new Set(['courseSlug', 'version', 'status', 'note']);
const QUIZ_LEARNER = new Set(['title', 'lessonTitle', 'questions']);
const QUIZ_INTERNAL = new Set(['quizId', 'attemptsAllowed', 'passPercentage']);
const QUESTION_LEARNER = new Set(['questionText', 'options', 'explanation', 'unit']);
const QUESTION_INTERNAL = new Set(['correctIndex', 'points', 'sourceRef']);
const ASSESSMENT_LEARNER = new Set(['title', 'instructions', 'criteria']);
const ASSESSMENT_INTERNAL = new Set(['id', 'isPublished', 'passThreshold']);
/** data/seed JSON files that are registries, not course files. */
const SEED_REGISTRIES = new Set([
  'data/seed/courses-catalog.json', 'data/seed/cec-approvals.json', 'data/seed/cec-professional-assignments.json',
  'data/seed/designations.json', 'data/seed/source-registry.json', 'data/seed/ccw-products.json',
]);
const PUBLIC_TEXT = /\.(md|svg|html?|txt|json|vtt|srt|csv|xml)$/i;
/** Internal markdown in a draft folder: research packs and specs. */
const DRAFT_MD_INTERNAL = /(^research-pack|spec)\.md$|-spec\.md$/;
/** public/courses folders whose name is not the course slug. */
const PUBLIC_FOLDER_SLUG = { 'ccw-carsi-truckmount': 'ccw-carsi-truckmount-operations' };

/** Every string leaf under a value, with its path. */
function strings(value, path, out = []) {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) strings(v, `${path}.${k}`, out);
  return out;
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (root, p) => p.slice(root.length + 1).split('\\').join('/');

function draftDirs(root) {
  const base = join(root, 'data/courses');
  if (!existsSync(base)) return [];
  const out = [];
  for (const slug of readdirSync(base).sort()) {
    for (const v of ['v1-draft', 'v1']) {
      const d = join(base, slug, v);
      if (existsSync(d) && statSync(d).isDirectory()) out.push(d);
    }
  }
  return out;
}

/**
 * Scan a repository (or a fixture copy of one). Returns { findings, stats }; findings are
 * strings "file :: course :: field :: term :: text". Throws on an unreadable registry.
 */
export function evaluate(root) {
  const findings = [];
  const stats = { courses: new Set(), approvedSkipped: new Set(), surfaces: 0, notInspected: [], legacyCards: 0 };
  const approved = new Set(
    (JSON.parse(readFileSync(join(root, 'data/seed/cec-approvals.json'), 'utf8')).approvals ?? [])
      .filter((a) => a && a.status === 'approved' && typeof a.slug === 'string')
      .map((a) => a.slug)
  );
  if (approved.size === 0) findings.push('data/seed/cec-approvals.json :: - :: approvals :: no approved slug read; refusing to pass');

  const readJson = (p) => {
    try {
      return JSON.parse(readFileSync(p, 'utf8'));
    } catch (e) {
      findings.push(`${rel(root, p)} :: - :: (file) :: unreadable JSON: ${e.message}`);
      return undefined;
    }
  };
  const scan = (file, slug, field, text) => {
    stats.surfaces += 1;
    for (const label of scopeHits(text)) findings.push(`${file} :: ${slug} :: ${field} :: ${label} :: "${snippet(text, label)}"`);
  };
  const unclassified = (file, slug, field) =>
    findings.push(`${file} :: ${slug} :: ${field} :: unclassified field: add it to the learner-facing or internal list in scripts/check-iicrc-scope.mjs`);
  const classify = (obj, learner, internal, file, slug, where, onLearner) => {
    for (const [k, v] of Object.entries(obj)) {
      if (internal.has(k)) continue;
      if (learner.has(k)) onLearner(k, v, `${where}.${k}`);
      else unclassified(file, slug, `${where}.${k}`);
    }
  };
  const scanAll = (file, slug, where, value) => {
    for (const [p, s] of strings(value, where)) scan(file, slug, p, s);
  };

  // 1. Catalogue entries.
  const catalogues = [join(root, 'data/seed/courses-catalog.json'), ...draftDirs(root).map((d) => join(d, 'courses-catalog.json'))].filter(existsSync);
  const catalogueSlugs = new Set();
  for (const path of catalogues) {
    const file = rel(root, path);
    const doc = readJson(path);
    if (!doc) continue;
    const courses = Array.isArray(doc.courses) ? doc.courses : [];
    if (courses.length === 0) findings.push(`${file} :: - :: courses :: no course entries read; refusing to pass`);
    courses.forEach((c, ci) => {
      const slug = typeof c?.slug === 'string' ? c.slug : `(no slug #${ci})`;
      catalogueSlugs.add(slug);
      if (approved.has(slug)) {
        stats.approvedSkipped.add(slug);
        return;
      }
      stats.courses.add(slug);
      const at = `courses[${ci}]`;
      for (const [k, v] of Object.entries(c)) {
        if (COURSE_INTERNAL.has(k)) continue;
        if (k === 'iicrcDiscipline') {
          if (v !== null && v !== undefined) findings.push(`${file} :: ${slug} :: ${at}.iicrcDiscipline :: IICRC discipline set :: "${v}"`);
        } else if (COURSE_LEARNER.has(k)) {
          scanAll(file, slug, `${at}.${k}`, v);
        } else if (k === 'meta') {
          for (const [mk, mv] of Object.entries(v ?? {})) if (!META_INTERNAL.has(mk)) scanAll(file, slug, `${at}.meta.${mk}`, mv);
        } else if (k === 'modules') {
          (v ?? []).forEach((m, mi) =>
            classify(m, new Set([...MODULE_LEARNER, 'lessons']), MODULE_INTERNAL, file, slug, `${at}.modules[${mi}]`, (mk, mv, mw) => {
              if (mk !== 'lessons') return scanAll(file, slug, mw, mv);
              (mv ?? []).forEach((l, li) =>
                classify(l, LESSON_LEARNER, LESSON_INTERNAL, file, slug, `${mw}[${li}]`, (lk, lv, lw) => scanAll(file, slug, lw, lv))
              );
            })
          );
        } else unclassified(file, slug, `${at}.${k}`);
      }
    });
  }
  if (stats.courses.size + stats.approvedSkipped.size === 0) findings.push('data/seed/courses-catalog.json :: - :: courses :: no catalogue course read; refusing to pass');

  // 2. Course JSON files keyed by courseSlug.
  const courseFiles = [
    ...walkFiles(join(root, 'data/seed')).filter((p) => p.endsWith('.json')),
    ...draftDirs(root).flatMap((d) => readdirSync(d).filter((n) => n.endsWith('.json') && n !== 'courses-catalog.json').map((n) => join(d, n))),
  ];
  for (const path of courseFiles) {
    const file = rel(root, path);
    if (SEED_REGISTRIES.has(file)) continue;
    const doc = readJson(path);
    if (!doc) continue;
    const slug = doc && typeof doc.courseSlug === 'string' ? doc.courseSlug : null;
    if (!slug) {
      findings.push(`${file} :: - :: courseSlug :: not a course file and not a known registry: classify it in scripts/check-iicrc-scope.mjs`);
      continue;
    }
    if (approved.has(slug)) {
      stats.approvedSkipped.add(slug);
      continue;
    }
    stats.courses.add(slug);
    classify(doc, FILE_LEARNER, FILE_INTERNAL, file, slug, '', (k, v, w) => {
      if (k === 'quizzes') {
        (v ?? []).forEach((q, qi) =>
          classify(q, QUIZ_LEARNER, QUIZ_INTERNAL, file, slug, `quizzes[${qi}]`, (qk, qv, qw) => {
            if (qk !== 'questions') return scanAll(file, slug, qw, qv);
            (qv ?? []).forEach((x, xi) =>
              classify(x, QUESTION_LEARNER, QUESTION_INTERNAL, file, slug, `${qw}[${xi}]`, (xk, xv, xw) => scanAll(file, slug, xw, xv))
            );
          })
        );
      } else if (k === 'assessment') {
        classify(v ?? {}, ASSESSMENT_LEARNER, ASSESSMENT_INTERNAL, file, slug, 'assessment', (ak, av, aw) => scanAll(file, slug, aw, av));
      } else scanAll(file, slug, w, v);
    });
  }

  // 3. Markdown course copy in draft folders.
  for (const d of draftDirs(root)) {
    for (const n of readdirSync(d).filter((x) => x.endsWith('.md') && !DRAFT_MD_INTERNAL.test(x))) {
      const slug = rel(root, d).split('/')[2];
      if (approved.has(slug)) continue;
      scan(rel(root, join(d, n)), slug, '(file)', readFileSync(join(d, n), 'utf8'));
    }
  }

  // 4. Files served from public/courses/<folder>/.
  const pub = join(root, 'public/courses');
  if (existsSync(pub)) {
    for (const folder of readdirSync(pub).sort()) {
      if (!statSync(join(pub, folder)).isDirectory()) continue;
      const slug = PUBLIC_FOLDER_SLUG[folder] ?? folder;
      if (approved.has(slug)) {
        stats.approvedSkipped.add(slug);
        continue;
      }
      stats.courses.add(slug);
      for (const p of walkFiles(join(pub, folder))) {
        const file = rel(root, p);
        if (PUBLIC_TEXT.test(p)) scan(file, slug, '(file)', `${file}\n${readFileSync(p, 'utf8')}`);
        else stats.notInspected.push(file);
      }
    }
  }

  // 5. SEO course cards for catalogue slugs.
  const cardDir = join(root, 'data/seo/course-cards');
  const index = existsSync(join(root, 'data/seo/course-cards.index.json')) ? readJson(join(root, 'data/seo/course-cards.index.json')) : null;
  if (existsSync(cardDir)) {
    for (const n of readdirSync(cardDir).filter((x) => x.endsWith('.json')).sort()) {
      const slug = n.slice(0, -'.json'.length);
      if (!catalogueSlugs.has(slug)) {
        stats.legacyCards += 1;
        continue;
      }
      if (approved.has(slug)) continue;
      const doc = readJson(join(cardDir, n));
      if (doc) scanAll(`data/seo/course-cards/${n}`, slug, 'card', doc);
      if (index && index[slug]) scanAll('data/seo/course-cards.index.json', slug, `["${slug}"]`, index[slug]);
    }
  }
  return { findings, stats };
}

function main() {
  const rootArg = process.argv.find((a) => a.startsWith('--root='));
  const root = rootArg ? rootArg.slice('--root='.length).replace(/\/+$/, '') : process.cwd();
  let result;
  try {
    result = evaluate(root);
  } catch (err) {
    console.error(`✖ IICRC scope guard could not read its inputs: ${err.message}`);
    process.exit(1);
  }
  const { findings, stats } = result;
  const notScanned =
    `Not scanned: ${stats.notInspected.length} binary file(s) under public/courses (NOT INSPECTED, not clean): ` +
    `${stats.notInspected.join(', ') || 'none'}; ${stats.legacyCards} SEO course card(s) with a legacy slug in no catalogue; ` +
    'data/wordpress-export (GP-525, GP-749). See the header for the full list.';
  if (findings.length > 0) {
    console.error(`\n✖ IICRC scope guard failed — ${findings.length} issue(s)\n`);
    console.error('A course that is not CEC-approved in data/seed/cec-approvals.json may not name the IICRC, an IICRC');
    console.error('standard or an IICRC certification. Rewrite each as CARSI teaching (Linear GP-748):\n');
    console.error(findings.map((f) => `  ${f}`).join('\n'));
    console.error(`\n${notScanned}\n`);
    process.exit(1);
  }
  console.log(
    `✓ IICRC scope guard passed — ${stats.courses.size} non-approved courses, ${stats.surfaces} learner-facing strings and files, ` +
      `no IICRC content (${stats.approvedSkipped.size} CEC-approved courses skipped).`
  );
  console.log(notScanned);
  process.exit(0);
}

if (isEntryPoint(import.meta.url)) main();

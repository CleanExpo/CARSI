#!/usr/bin/env node
/**
 * audit-course-depth.mjs — scores every seed course against the CARSI Course Standard v1
 * (docs/content/COURSE_STANDARD.md). The floor constants below must match section 5 of that
 * document; change both in one reviewed commit.
 *
 * Modes:
 *   (default)        report: score every course, print a table, exit 0.
 *   --ci             enforce: exit 1 when any course with meta.standard "v1" misses a floor.
 *                    Every other course is still scored and reported but never fails the run,
 *                    so the existing catalogue is not blocked until each course is upgraded.
 *   --json           machine-readable output (same exit codes).
 *   --seed-dir=DIR   read DIR/courses-catalog.json and quizzes/assessments under DIR
 *                    (default data/seed). Used by the fixtures that prove the gate can fail.
 *
 * Exit codes: 0 pass, 1 an enforced course misses a floor, 2 input error (missing or empty
 * catalogue, unknown meta.standard value). A scan of nothing is never a pass.
 *
 * Node built-ins plus two existing guards (reused, not copied): findUsForms from
 * check-au-english.mjs and scanText from check-iicrc-terminology.mjs.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isEntryPoint } from './lib/is-entry-point.mjs';
import { findUsForms } from './check-au-english.mjs';
import { scanText as scanIicrcTerminology } from './check-iicrc-terminology.mjs';

// ── Standard v1 constants (docs/content/COURSE_STANDARD.md §3–5) ─────────────────────────────
export const STANDARD_VERSION = 'v1';
export const LEVELS = ['L0-free', 'L1-foundation', 'L2-practitioner', 'L3-specialist'];
export const ROLE_PATHS = [
  'new-technician',
  'water-and-drying',
  'mould-and-indoor-air',
  'biohazard-and-decontamination',
  'fire-smoke-and-odour',
  'carpet-and-floors',
  'supervisor-and-estimator',
  'adjacent-buyers',
];
export const LESSON_PARTS = [
  'On the job',
  'The idea',
  'See it',
  'Do it in metric',
  'Field download',
  'Check yourself',
  'Takeaway',
];
export const MODULES_MIN = 4; // L1–L3
export const MODULES_MIN_L0 = 1;
export const MODULES_MAX = 6;
export const LESSONS_PER_MODULE_MIN = 3;
export const READING_WPM = 230;
export const MINUTES_PER_QUESTION = 1.5;
export const EVIDENCED_SHARE_MIN = 0.5;
export const QUESTIONS_PER_TEACHING_LESSON = 3;
export const MODULE_CHECK_MIN_QUESTIONS = 3;
export const EXPLANATION_MIN_CHARS = 20;
export const FINAL_QUIZ_MIN_QUESTIONS = 10;
export const FINAL_QUIZ_MIN_PASS = 70;
export const LESSON_WORDS_MIN = 400;
export const PRACTICAL_MIN_CRITERIA = 3;
const DOWNLOAD_KINDS = new Set(['download', 'checklist', 'template', 'field-card', 'form', 'pdf']);
const DOWNLOAD_EXT = /\.(pdf|docx|xlsx|csv)(?:$|[?#])/i;
const VISUAL_TAG = /<(img|svg|video|iframe)\b/i;
const METRIC_QTY =
  /\d(?:[\d,.]*)\s*(?:°C|%\s?RH|g\/kg|m²|m2\b|m³\/h|m³|m3\b|L\/day|L\/s|litres?\b|mm\b|cm\b|kPa\b|Pa\b|kg\b|V\b|A\b|kW\b|W\b|m\b|L\b)/;
const FLOORS = [
  'metadata',
  'structure',
  'depth',
  'moduleChecks',
  'explanations',
  'finalQuiz',
  'fieldDownloads',
  'lessonPattern',
  'lessonWords',
  'visual',
  'metricExample',
  'practical',
  'australian',
  'licence',
];
export { FLOORS };

// ── helpers ─────────────────────────────────────────────────────────────────────────────────
function stripHtml(s) {
  return String(s || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
}
export function wordCount(html) {
  const t = stripHtml(html).trim();
  return t ? t.split(/\s+/).length : 0;
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** True when the body has a heading (h2–h4 or markdown ##–####) whose text starts with `part`. */
export function hasPartHeading(body, part) {
  const p = escapeRe(part);
  const html = new RegExp(`<h[2-4][^>]*>\\s*(?:<[^>]+>\\s*)*${p}`, 'i');
  const md = new RegExp(`^#{2,4}\\s+${p}`, 'im');
  return html.test(body || '') || md.test(body || '');
}
function isTeaching(lesson) {
  return lesson.contentType !== 'quiz';
}
function resourcesOf(lesson) {
  return Array.isArray(lesson.resources) ? lesson.resources : [];
}
export function isFieldDownload(r) {
  if (!r || typeof r !== 'object') return false;
  if (r.kind && DOWNLOAD_KINDS.has(String(r.kind).toLowerCase())) return true;
  return typeof r.url === 'string' && !r.url.startsWith('quiz:') && DOWNLOAD_EXT.test(r.url);
}
function quizIdsOf(lesson) {
  const ids = [];
  if (lesson.contentType === 'quiz' && lesson.contentBody)
    ids.push(String(lesson.contentBody).trim());
  for (const r of resourcesOf(lesson)) {
    if (typeof r?.url === 'string' && r.url.startsWith('quiz:')) ids.push(r.url.slice(5).trim());
  }
  return ids;
}
/** Learner-facing copy only: titles, descriptions, lesson bodies, resource labels. */
function courseCopy(course) {
  const parts = [course.title, course.description, course.shortDescription];
  for (const m of course.modules || []) {
    parts.push(m.title);
    for (const l of m.lessons || []) {
      parts.push(l.title);
      if (isTeaching(l)) parts.push(l.contentBody);
      for (const r of resourcesOf(l)) parts.push(r?.label);
    }
  }
  return parts.filter((s) => typeof s === 'string' && s.trim());
}

// ── seed context (quizzes, practical assessments, CEC approvals) ────────────────────────────
function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}
export function loadContext(seedDir) {
  const quizzes = new Map();
  const practicals = new Map();
  const dirs = [seedDir, join(seedDir, 'assessment-drafts')].filter((d) => existsSync(d));
  for (const dir of dirs) {
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const j = readJsonSafe(join(dir, f));
      if (!j || typeof j !== 'object') continue;
      for (const q of Array.isArray(j.quizzes) ? j.quizzes : []) {
        if (q?.quizId) quizzes.set(String(q.quizId), { ...q, source: join(dir, f) });
      }
      if (dir === seedDir && f.endsWith('-assessment.json') && j.courseSlug && j.assessment) {
        practicals.set(j.courseSlug, j.assessment);
      }
    }
  }
  const approvals = readJsonSafe(join(seedDir, 'cec-approvals.json'));
  const cecApproved = new Set(
    (approvals?.approvals || []).filter((a) => a?.status === 'approved').map((a) => a.slug)
  );
  return { quizzes, practicals, cecApproved };
}

// ── scoring ─────────────────────────────────────────────────────────────────────────────────
/**
 * Score one course against every floor. Returns per-floor { ok, applicable, why } plus the
 * depth numbers. Exported so scripts/audit-course-depth.test.mjs can knock out each floor.
 */
export function scoreCourse(course, ctx) {
  const meta = course.meta || {};
  const modules = Array.isArray(course.modules) ? course.modules : [];
  const lessons = modules.flatMap((m) => (Array.isArray(m.lessons) ? m.lessons : []));
  const teaching = lessons.filter(isTeaching);
  const level = meta.standardLevel;
  const statedMinutes = (Number(course.durationHours) || 0) * 60;

  const resolve = (lesson) =>
    quizIdsOf(lesson)
      .map((id) => ctx.quizzes.get(id))
      .filter(Boolean);
  const allQuizzes = [...new Map(lessons.flatMap(resolve).map((q) => [q.quizId, q])).values()];
  const questionCount = allQuizzes.reduce((n, q) => n + (q.questions || []).length, 0);

  // depth
  const words = teaching.reduce((n, l) => n + wordCount(l.contentBody), 0);
  const videoMinutes = lessons.reduce((n, l) => {
    let v = 0;
    if (l.contentType === 'video' && Number(l.durationMinutes) > 0) v += Number(l.durationMinutes);
    for (const r of resourcesOf(l)) {
      if (r?.kind === 'video' && Number(r.durationMinutes) > 0) v += Number(r.durationMinutes);
    }
    return n + v;
  }, 0);
  const evidencedMinutes =
    words / READING_WPM + videoMinutes + questionCount * MINUTES_PER_QUESTION;
  const evidencedShare = statedMinutes > 0 ? evidencedMinutes / statedMinutes : 0;
  const wordsPerHour = course.durationHours > 0 ? words / course.durationHours : 0;

  const r = {};
  const set = (k, ok, why = '', applicable = true) => (r[k] = { ok: !!ok, applicable, why });

  // 5.1 metadata
  {
    const why = [];
    if (meta.standard !== STANDARD_VERSION) why.push('meta.standard not v1');
    if (!LEVELS.includes(level)) why.push('meta.standardLevel missing/unknown');
    const paths = Array.isArray(meta.rolePaths) ? meta.rolePaths : [];
    if (!paths.length || paths.some((p) => !ROLE_PATHS.includes(p)))
      why.push('meta.rolePaths missing/unknown');
    if (!(Number(course.durationHours) > 0)) why.push('durationHours');
    if (!course.shortDescription) why.push('shortDescription');
    set('metadata', why.length === 0, why.join('; '));
  }
  // 5.2 structure
  {
    const min = level === 'L0-free' ? MODULES_MIN_L0 : MODULES_MIN;
    const thin = modules.filter((m) => (m.lessons || []).length < LESSONS_PER_MODULE_MIN).length;
    const okCount = modules.length >= min && modules.length <= MODULES_MAX;
    set(
      'structure',
      okCount && thin === 0,
      [
        !okCount && `${modules.length} modules (need ${min}–${MODULES_MAX})`,
        thin && `${thin} module(s) under ${LESSONS_PER_MODULE_MIN} lessons`,
      ]
        .filter(Boolean)
        .join('; ')
    );
  }
  // 5.3 depth
  set(
    'depth',
    evidencedShare >= EVIDENCED_SHARE_MIN,
    `${Math.round(evidencedShare * 100)}% evidenced`
  );
  // 5.4 moduleChecks + 5.5 explanations
  {
    let missing = 0;
    let noExplain = 0;
    let checkedQuestions = 0;
    for (const m of modules) {
      const ls = m.lessons || [];
      const need = Math.max(
        MODULE_CHECK_MIN_QUESTIONS,
        QUESTIONS_PER_TEACHING_LESSON * ls.filter(isTeaching).length
      );
      const qs = ls.filter((l) => l.contentType === 'quiz').flatMap(resolve);
      const best = Math.max(0, ...qs.map((q) => (q.questions || []).length));
      if (best < need) missing++;
      for (const q of qs) {
        for (const qq of q.questions || []) {
          checkedQuestions++;
          if (String(qq.explanation || '').trim().length < EXPLANATION_MIN_CHARS) noExplain++;
        }
      }
    }
    set(
      'moduleChecks',
      modules.length > 0 && missing === 0,
      missing ? `${missing} module(s) without an adequate check` : ''
    );
    set(
      'explanations',
      checkedQuestions > 0 && noExplain === 0,
      checkedQuestions === 0
        ? 'no module-check questions'
        : noExplain
          ? `${noExplain} question(s) without explanation`
          : ''
    );
  }
  // 5.6 finalQuiz
  {
    const lastModule = modules[modules.length - 1];
    const last = lastModule?.lessons?.[lastModule.lessons.length - 1];
    const q = last && last.contentType === 'quiz' ? resolve(last)[0] : null;
    const ok =
      !!q &&
      (q.questions || []).length >= FINAL_QUIZ_MIN_QUESTIONS &&
      Number(q.passPercentage ?? 70) >= FINAL_QUIZ_MIN_PASS;
    set(
      'finalQuiz',
      ok,
      q
        ? `${(q.questions || []).length} questions, pass ${q.passPercentage ?? 70}%`
        : 'no resolvable final quiz'
    );
  }
  // 5.7 fieldDownloads
  {
    const without = modules.filter(
      (m) => !(m.lessons || []).some((l) => resourcesOf(l).some(isFieldDownload))
    ).length;
    set(
      'fieldDownloads',
      modules.length > 0 && without === 0,
      without ? `${without} module(s) without a field download` : ''
    );
  }
  // 5.8–5.11 per teaching lesson
  {
    const noPattern = teaching.filter((l) =>
      LESSON_PARTS.some((p) => !hasPartHeading(l.contentBody, p))
    ).length;
    const short = teaching.filter((l) => wordCount(l.contentBody) < LESSON_WORDS_MIN).length;
    const noVisual = teaching.filter(
      (l) =>
        !VISUAL_TAG.test(l.contentBody || '') &&
        !resourcesOf(l).some((x) => x?.kind === 'image' || x?.kind === 'video')
    ).length;
    const noMetric = teaching.filter((l) => !METRIC_QTY.test(stripHtml(l.contentBody))).length;
    const none = teaching.length === 0;
    set(
      'lessonPattern',
      !none && noPattern === 0,
      none
        ? 'no teaching lessons'
        : noPattern
          ? `${noPattern}/${teaching.length} lessons miss parts`
          : ''
    );
    set(
      'lessonWords',
      !none && short === 0,
      none
        ? 'no teaching lessons'
        : short
          ? `${short}/${teaching.length} lessons under ${LESSON_WORDS_MIN} words`
          : ''
    );
    set(
      'visual',
      !none && noVisual === 0,
      none
        ? 'no teaching lessons'
        : noVisual
          ? `${noVisual}/${teaching.length} lessons without a visual`
          : ''
    );
    set(
      'metricExample',
      !none && noMetric === 0,
      none
        ? 'no teaching lessons'
        : noMetric
          ? `${noMetric}/${teaching.length} lessons without a metric quantity`
          : ''
    );
  }
  // 5.12 practical
  {
    const applicable =
      level === 'L2-practitioner' || level === 'L3-specialist' || !!meta.designation;
    const p = ctx.practicals.get(course.slug);
    const ok =
      !!p &&
      !!String(p.instructions || '').trim() &&
      (p.criteria || []).length >= PRACTICAL_MIN_CRITERIA;
    set(
      'practical',
      ok,
      applicable ? (ok ? '' : 'no practical task with rubric') : 'n/a',
      applicable
    );
  }
  // 5.13 australian
  {
    const hits = courseCopy(course).flatMap((s) => findUsForms(s));
    set(
      'australian',
      hits.length === 0,
      hits.length ? `${hits.length} US form(s), e.g. "${hits[0].match}"` : ''
    );
  }
  // 5.14 licence
  {
    const why = [];
    const termHits = courseCopy(course).flatMap((s) =>
      scanIicrcTerminology(`${course.slug}.json`, s)
    );
    if (termHits.length) why.push(`${termHits.length} IICRC terminology hit(s)`);
    const cec = Number(course.cecHours) || 0;
    if (cec !== 0 && !ctx.cecApproved.has(course.slug))
      why.push(`cecHours ${cec} without approval`);
    if (meta.designation && course.iicrcDiscipline != null)
      why.push('designation course with iicrcDiscipline set');
    set('licence', why.length === 0, why.join('; '));
  }

  const applicable = FLOORS.filter((k) => r[k].applicable);
  const failing = applicable.filter((k) => !r[k].ok);
  return {
    slug: course.slug,
    title: course.title,
    enforced: meta.standard === STANDARD_VERSION,
    standardValue: meta.standard,
    modules: modules.length,
    lessons: lessons.length,
    words,
    wordsPerHour: Math.round(wordsPerHour),
    evidencedShare,
    floors: r,
    passed: applicable.length - failing.length,
    applicable: applicable.length,
    failing,
  };
}

/** Pure decision for the CLI; exported for tests. */
export function decide(scored, { ci }) {
  const badStandard = scored.filter(
    (s) => s.standardValue != null && s.standardValue !== STANDARD_VERSION
  );
  const enforced = scored.filter((s) => s.enforced);
  const enforcedFailing = enforced.filter((s) => s.failing.length > 0);
  let error = null;
  if (scored.length === 0)
    error = 'catalogue contains no courses — a scan of nothing is not a pass';
  else if (badStandard.length)
    error = `unknown meta.standard value on: ${badStandard.map((s) => `${s.slug}=${JSON.stringify(s.standardValue)}`).join(', ')}`;
  const exitCode = error ? 2 : ci && enforcedFailing.length ? 1 : 0;
  return { error, enforced, enforcedFailing, exitCode };
}

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────
if (isEntryPoint(import.meta.url)) {
  const args = process.argv.slice(2);
  const ci = args.includes('--ci');
  const jsonOut = args.includes('--json');
  const seedArg = args.find((a) => a.startsWith('--seed-dir='));
  const seedDir = seedArg ? seedArg.slice('--seed-dir='.length) : 'data/seed';
  const catalogPath = join(seedDir, 'courses-catalog.json');
  if (!existsSync(catalogPath)) {
    console.error(`audit-course-depth: missing ${catalogPath}`);
    process.exit(2);
  }
  const catalog = readJsonSafe(catalogPath);
  if (!catalog) {
    console.error(`audit-course-depth: cannot parse ${catalogPath}`);
    process.exit(2);
  }
  const courses = Array.isArray(catalog.courses) ? catalog.courses : [];
  const ctx = loadContext(seedDir);
  const scored = courses.map((c) => scoreCourse(c, ctx));
  const { error, enforced, enforcedFailing, exitCode } = decide(scored, { ci });

  if (jsonOut) {
    console.log(
      JSON.stringify(
        {
          seedDir,
          total: courses.length,
          scored,
          enforced: enforced.map((s) => s.slug),
          enforcedFailing: enforcedFailing.map((s) => s.slug),
          error,
          exitCode,
        },
        null,
        2
      )
    );
    process.exit(exitCode);
  }

  const ABBR = {
    metadata: 'meta',
    structure: 'struct',
    depth: 'depth',
    moduleChecks: 'modchk',
    explanations: 'explain',
    finalQuiz: 'final',
    fieldDownloads: 'dl',
    lessonPattern: '7part',
    lessonWords: 'words',
    visual: 'visual',
    metricExample: 'metric',
    practical: 'prac',
    australian: 'au',
    licence: 'licence',
  };
  console.log(`\nCARSI Course Standard ${STANDARD_VERSION} depth audit — ${seedDir}\n`);
  console.log('  ' + 'course'.padEnd(46) + 'v1  mods  less  words/h  evid%  floors  failing');
  console.log('  ' + '-'.repeat(120));
  const order = [...scored].sort(
    (a, b) =>
      Number(b.enforced) - Number(a.enforced) ||
      b.passed / b.applicable - a.passed / a.applicable ||
      a.slug.localeCompare(b.slug)
  );
  for (const s of order) {
    console.log(
      '  ' +
        String(s.slug).slice(0, 45).padEnd(46) +
        (s.enforced ? 'Y   ' : '-   ') +
        String(s.modules).padStart(4) +
        String(s.lessons).padStart(6) +
        String(s.wordsPerHour).padStart(9) +
        String(Math.round(s.evidencedShare * 100)).padStart(7) +
        `${s.passed}/${s.applicable}`.padStart(8) +
        '  ' +
        s.failing.map((k) => ABBR[k]).join(',')
    );
  }
  console.log('\n  Courses missing each floor:');
  for (const k of FLOORS) {
    const app = scored.filter((s) => s.floors[k].applicable);
    const miss = app.filter((s) => !s.floors[k].ok).length;
    console.log(`    ${k.padEnd(16)} ${String(miss).padStart(3)} / ${app.length}`);
  }
  const withText = scored.filter((s) => s.words > 0);
  console.log(`\n  scored ${scored.length} of ${courses.length} courses`);
  console.log(`  courses with lesson text: ${withText.length}`);
  console.log(
    `  median evidenced share (courses with text): ${Math.round(median(withText.map((s) => s.evidencedShare)) * 100)}%`
  );
  console.log(
    `  median words per stated hour (courses with text): ${Math.round(median(withText.map((s) => s.wordsPerHour)))}`
  );
  console.log(
    `  courses meeting every floor: ${scored.filter((s) => s.failing.length === 0).length}`
  );
  console.log(`  enforced (meta.standard v1): ${enforced.length}`);

  if (error) {
    console.error(`\n  ✖ ${error}\n`);
    process.exit(exitCode);
  }
  if (!ci) {
    console.log(
      '\n  (report mode — pass --ci to fail on meta.standard v1 courses that miss a floor)\n'
    );
    process.exit(0);
  }
  if (enforcedFailing.length) {
    console.error(`\n  ✖ ${enforcedFailing.length} meta.standard v1 course(s) miss a floor:`);
    for (const s of enforcedFailing) {
      for (const k of s.failing) console.error(`     ${s.slug}: ${k} — ${s.floors[k].why}`);
    }
    console.error('');
    process.exit(1);
  }
  console.log(
    `\n  ✓ every meta.standard v1 course meets every floor (${enforced.length} enforced; others reported only).\n`
  );
  process.exit(0);
}

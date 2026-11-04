#!/usr/bin/env node
/**
 * GP-683 — repo + optional live checks for Water Restoration Practitioner go-live.
 *
 * Production deploy alone does not publish course content; see docs/runbooks/course-go-live.md.
 *
 * Modes:
 *   (default)     Validate seed catalogue, quiz file, course-standard score, quiz id alignment.
 *   --live        Also GET the public course page on CARSI_SITE (default https://carsi.com.au).
 *   --require-live  Same as --live but exit 1 unless the page returns HTTP 200 with the title.
 *
 * Exit: 0 ready (and live OK when --require-live), 1 validation or live failure, 2 live probe error.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadContext, scoreCourse } from './audit-course-depth.mjs';

function readCatalog(seedDir) {
  const catalogPath = join(seedDir, 'courses-catalog.json');
  const raw = JSON.parse(readFileSync(catalogPath, 'utf8'));
  return Array.isArray(raw.courses) ? raw.courses : [];
}

export const SLUG = 'water-damage-restoration-fundamentals';
export const EXPECTED_TITLE = 'CARSI Water Restoration Practitioner';
export const EXPECTED_PRICE_AUD = 99;
export const QUIZ_FILE = 'data/seed/water-damage-restoration-fundamentals-quiz.json';

/** Must stay in sync with db/ops/read/06-water-orphan-quiz-check.sql and the quiz JSON. */
export const APPROVED_QUIZ_IDS = [
  '8874f437-a8ad-4c2c-bcdb-6dbf36c108a0',
  '9860fee3-daf0-4007-92b7-93229547a9d8',
  '618e4230-aa48-4ed6-977b-2389f20971e2',
  'eb442750-ac7a-4baf-bac4-fd6db0f7f30c',
  'ed90b217-493e-4dc0-93ac-87e51e86451c',
  '6220f5b8-3191-4701-8811-b1714153388b',
  'e7798876-961d-4e4c-a2f0-f91ded4cc2d1',
];

const SITE = (process.env.CARSI_SITE || 'https://carsi.com.au').replace(/\/$/, '');

export function quizIdsFromCatalogLessons(course) {
  const ids = [];
  for (const mod of course.modules || []) {
    for (const lesson of mod.lessons || []) {
      if (lesson.contentType !== 'quiz') continue;
      const body = String(lesson.contentBody || '').trim();
      if (/^[0-9a-f-]{36}$/i.test(body)) ids.push(body);
    }
  }
  return ids;
}

export function validateRepo(seedDir = join(process.cwd(), 'data', 'seed')) {
  const errors = [];
  const notes = [];

  const ctx = loadContext(seedDir);
  const courses = readCatalog(seedDir);
  const course = courses.find((c) => c.slug === SLUG);
  if (!course) {
    errors.push(`courses-catalog.json has no entry for slug ${SLUG}`);
    return { ok: false, errors, notes };
  }

  if (course.title !== EXPECTED_TITLE) {
    errors.push(`title is "${course.title}", expected "${EXPECTED_TITLE}"`);
  }
  if (course.status !== 'published') {
    errors.push(`status is "${course.status}", expected published`);
  }
  if (course.isPublished !== true) {
    errors.push(`isPublished is ${course.isPublished}, expected true`);
  }
  const price = Number(course.priceAud ?? course.price_aud);
  if (Number.isNaN(price) || price !== EXPECTED_PRICE_AUD) {
    errors.push(`priceAud is ${course.priceAud}, expected ${EXPECTED_PRICE_AUD}`);
  }

  const scored = scoreCourse(course, ctx);
  if (scored.failing.length) {
    errors.push(`Course Standard v1 floors missed: ${scored.failing.join(', ')}`);
  } else {
    notes.push(`Course Standard v1: ${scored.passed}/${scored.applicable} floors`);
  }

  const quizPath = join(process.cwd(), QUIZ_FILE);
  if (!existsSync(quizPath)) {
    errors.push(`missing quiz file ${QUIZ_FILE}`);
  } else {
    const quizDoc = JSON.parse(readFileSync(quizPath, 'utf8'));
    if (quizDoc.courseSlug !== SLUG) {
      errors.push(`quiz file courseSlug is "${quizDoc.courseSlug}"`);
    }
    if (quizDoc.status !== 'approved') {
      errors.push(`quiz file status is "${quizDoc.status}", expected approved`);
    }
    const fileIds = (quizDoc.quizzes || []).map((q) => q.quizId).sort();
    const approved = [...APPROVED_QUIZ_IDS].sort();
    if (fileIds.length !== approved.length || fileIds.some((id, i) => id !== approved[i])) {
      errors.push('quiz file quiz ids do not match APPROVED_QUIZ_IDS');
    } else {
      notes.push(`quiz file: ${fileIds.length} quizzes, status approved`);
    }
  }

  const lessonQuizIds = quizIdsFromCatalogLessons(course).sort();
  const approvedSorted = [...APPROVED_QUIZ_IDS].sort();
  if (
    lessonQuizIds.length !== approvedSorted.length ||
    lessonQuizIds.some((id, i) => id !== approvedSorted[i])
  ) {
    errors.push(
      `catalog quiz lessons reference ${lessonQuizIds.length} id(s); expected ${approvedSorted.length} matching approved list`
    );
  } else {
    notes.push('catalog quiz lessons align with approved quiz ids');
  }

  return { ok: errors.length === 0, errors, notes };
}

export async function probeLiveCoursePage(site = SITE, fetchImpl = globalThis.fetch) {
  const url = `${site}/courses/${SLUG}`;
  let res;
  try {
    res = await fetchImpl(url, {
      redirect: 'follow',
      headers: { Accept: 'text/html' },
    });
  } catch (err) {
    return { ok: false, error: `fetch failed: ${err.message}`, url, status: null, html: '' };
  }
  const html = await res.text();
  const notFound =
    res.status === 404 ||
    /Course Not Found/i.test(html) ||
    /course not found/i.test(html);
  const hasTitle = html.includes(EXPECTED_TITLE);
  return {
    url,
    status: res.status,
    html,
    notFound,
    hasTitle,
    ok: res.status === 200 && !notFound && hasTitle,
  };
}

export async function run(argv = process.argv.slice(2), opts = {}) {
  const live = argv.includes('--live') || argv.includes('--require-live');
  const requireLive = argv.includes('--require-live');
  const seedDir = opts.seedDir ?? join(process.cwd(), 'data', 'seed');
  const fetchImpl = opts.fetch ?? globalThis.fetch;

  console.log(`GP-683 water go-live verification (slug ${SLUG})`);

  const repo = validateRepo(seedDir);
  for (const n of repo.notes) console.log(`  ✓ repo: ${n}`);
  for (const e of repo.errors) console.error(`  ✗ repo: ${e}`);

  if (!repo.ok) {
    console.error('\nRepo is not ready for production seed.\n');
    return 1;
  }
  console.log('\n  ✓ repo ready for Rana preflight + db:seed-courses + db:seed-quizzes (--slug)\n');

  if (!live) {
    console.log('  (pass --live or --require-live to probe the public course page)\n');
    return 0;
  }

  const probe = await probeLiveCoursePage(opts.site ?? SITE, fetchImpl);
  if (probe.error) {
    console.error(`  ✖ live: ${probe.error}`);
    return requireLive ? 2 : 0;
  }
  console.log(`  live GET ${probe.url} → HTTP ${probe.status}`);
  if (probe.ok) {
    console.log(`  ✓ live page shows "${EXPECTED_TITLE}"`);
    return 0;
  }
  if (probe.notFound || probe.status === 404) {
    console.error(
      '  ✗ live: course page is not published (404 / Course Not Found). Run production seed per docs/runbooks/course-go-live.md.'
    );
  } else if (!probe.hasTitle) {
    console.error(`  ✗ live: HTTP ${probe.status} but title "${EXPECTED_TITLE}" not found in HTML`);
  } else {
    console.error(`  ✗ live: unexpected response (HTTP ${probe.status})`);
  }
  return requireLive ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then((code) => process.exit(code));
}

#!/usr/bin/env node
/**
 * Non-vacuity proof for the CEC course brand guard (scripts/check-cec-course-brand.mjs).
 *
 * Every control runs against the REAL repository inputs, cloned and planted, so a guard that
 * scans nothing, the wrong slugs or the wrong files fails here. Controls:
 *   - each CCW brand form (CCW, Carpet Cleaners Warehouse, ccwonline.com.au, the CCW Shopify asset
 *     path, a CCW logo file, a full CCW product name) planted into an approved course is flagged;
 *   - each surface (lesson, quiz seed by courseSlug and by file name, course card, intro brief,
 *     public course file) is reached;
 *   - the CCW-branded ccw-carsi-truckmount-operations course (not CEC-approved) passes, and is
 *     shown to really carry the brand, so its pass is not a blind spot;
 *   - an empty registry, an empty product list or an approved course missing from the catalogue
 *     fails closed;
 *   - CI runs the guard and this self-test.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import { brandHits, evaluate, loadRepoInputs } from './check-cec-course-brand.mjs';

const real = loadRepoInputs(process.cwd());
const clone = () => structuredClone(real);
const CARD_SLUG = 'introduction-to-air-quality-fundamentals';

function findJson(inputs, path) {
  const file = inputs.jsonFiles.find((f) => f.path === path);
  assert.ok(file, `${path} should be loaded`);
  return file.data;
}

function catalogueCourse(inputs, slug) {
  const course = findJson(inputs, 'data/seed/courses-catalog.json').courses.find((c) => c.slug === slug);
  assert.ok(course, `${slug} should be in the catalogue`);
  return course;
}

function firstLesson(course) {
  const lesson = course.modules.flatMap((m) => m.lessons ?? [])[0];
  assert.ok(lesson, `${course.slug} should have a lesson`);
  return lesson;
}

const findingsFor = (inputs, slug) => evaluate(inputs).findings.filter((f) => f.includes(slug));

test('reads the real registry and every approved course (scope floor)', () => {
  assert.equal(real.approvedSlugs.length, 38);
  assert.ok(real.productNames.length >= 200);
  const { surfaces } = evaluate(real);
  const kinds = (pattern) => surfaces.filter((s) => pattern.test(s.where)).length;
  assert.equal(kinds(/courses-catalog\.json/), 38);
  assert.ok(kinds(/data\/seo\/course-cards\//) >= 20);
  assert.ok(kinds(/course-intro-video-briefs\.json/) >= 1);
  assert.ok(kinds(/course-thumbnail-briefs\.json/) >= 1);
});

test('the real tree has no CCW brand in any CEC-approved course', () => {
  assert.deepEqual(evaluate(real).findings, []);
});

test('the CCW-branded truckmount course is not approved, carries the brand and passes', () => {
  assert.ok(!real.approvedSlugs.includes('ccw-carsi-truckmount-operations'));
  const course = catalogueCourse(real, 'ccw-carsi-truckmount-operations');
  assert.ok(brandHits(JSON.stringify(course), real.productNames).length > 0);
  assert.deepEqual(findingsFor(real, 'ccw-carsi-truckmount-operations'), []);
});

for (const [form, planted] of [
  ['CCW', 'Ask CCW about the unit.'],
  ['Carpet Cleaners Warehouse', 'Sold by Carpet&nbsp;Cleaners Warehouse.'],
  ['ccwonline.com.au link', '<a href="https://ccwonline.com.au/blogs/news/chemical-dilution-ratio-calculator">tool</a>'],
  ['CCW image asset', '<img src="https://cdn.shopify.com/s/files/1/2179/6391/products/x.jpg">'],
  ['CCW logo file', '<img src="/images/brand/ccw-logo.svg">'],
  ['CCW product name', 'Pre-treat with Thymox 5 ltr first.'],
]) {
  test(`flags ${form} planted into an approved course lesson`, () => {
    const inputs = clone();
    firstLesson(catalogueCourse(inputs, CARD_SLUG)).contentBody += ` ${planted}`;
    assert.ok(findingsFor(inputs, CARD_SLUG).length > 0, `${form} was not flagged`);
  });
}

// Evasions from the Gemini review (review-ccwft-r1-gm): JSON-escaped whitespace and HTML entities,
// plus the same class of trick (zero-width characters, markup, double encoding, fullwidth letters).
for (const [form, planted] of [
  ['CCW split by newlines', 'Ask C\nC\nW about the unit.'],
  ['CCW split by tabs', 'Ask C\tC\tW about the unit.'],
  ['Carpet Cleaners Warehouse split by a newline and a tab', 'Sold by Carpet\nCleaners\tWarehouse.'],
  ['a CCW product name split by a newline', 'Pre-treat with Thymox\n5 ltr first.'],
  ['CCW with a decimal entity', 'Ask &#67;CW about the unit.'],
  ['CCW with a hex entity', 'Ask C&#x43;W about the unit.'],
  ['CCW double-encoded', 'Ask &amp;#67;CW about the unit.'],
  ['a link with named entities', 'Visit ccwonline&period;com&period;au today.'],
  ['a link with numeric entities', 'Visit ccwonline&#46;com&#46;au today.'],
  ['a link percent-encoded', '<a href="https://ccwonline%2Ecom%2Eau/x">tool</a>'],
  ['CCW split by a zero-width space', 'Ask C\u200bCW about the unit.'],
  ['CCW split by markup', 'Ask C<span>C</span>W about the unit.'],
  ['CCW in fullwidth letters', 'Ask \uff23\uff23\uff37 about the unit.'],
]) {
  test(`flags ${form} planted into an approved course lesson`, () => {
    const inputs = clone();
    firstLesson(catalogueCourse(inputs, CARD_SLUG)).contentBody += ` ${planted}`;
    assert.ok(findingsFor(inputs, CARD_SLUG).length > 0, `${form} was not flagged`);
  });
}

test('flags a CCW link in a quiz seed keyed by courseSlug, and in one keyed only by file name', () => {
  for (const file of [
    { path: 'data/seed/assessment-drafts/x.quizzes.json', data: { courseSlug: CARD_SLUG, quizzes: [] } },
    { path: `data/seed/${CARD_SLUG}-quiz.json`, data: { quizzes: [] } },
  ]) {
    const inputs = clone();
    file.data.quizzes.push({ questions: [{ question: 'See https://ccwonline.com.au for stock.' }] });
    inputs.jsonFiles.push(file);
    assert.ok(findingsFor(inputs, CARD_SLUG).length > 0, `${file.path} was not reached`);
  }
});

test('flags a CCW link planted into the approved course card', () => {
  const inputs = clone();
  findJson(inputs, `data/seo/course-cards/${CARD_SLUG}.json`).metaDescription += ' https://ccwonline.com.au';
  assert.ok(findingsFor(inputs, CARD_SLUG).length > 0);
});

test('flags a CCW link planted into the approved course intro video brief', () => {
  const inputs = clone();
  const briefs = findJson(inputs, 'data/video/course-intro-video-briefs.json').briefs;
  const brief = briefs.find((b) => b.courseSlug === CARD_SLUG);
  assert.ok(brief, 'intro brief should exist');
  brief.script += ' Grab the chemicals from ccwonline.com.au.';
  assert.ok(findingsFor(inputs, CARD_SLUG).length > 0);
});

test('flags a CCW link in a media record keyed by the approved slug (intro video results)', () => {
  const inputs = clone();
  const results = findJson(inputs, 'data/video/course-intro-video-results.json').results;
  assert.ok(results[CARD_SLUG], 'intro video result should exist');
  results[CARD_SLUG].note = 'Footage supplied by ccwonline.com.au';
  assert.ok(findingsFor(inputs, CARD_SLUG).length > 0);
});

test('the CLI exits non-zero on a planted hit and zero on a clean copy', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cec-course-brand-'));
  try {
    for (const file of ['data/seed/cec-approvals.json', 'data/seed/ccw-products.json', 'data/seed/courses-catalog.json']) {
      mkdirSync(join(dir, dirname(file)), { recursive: true });
      cpSync(file, join(dir, file));
    }
    execFileSync('git', ['init', '-q'], { cwd: dir });
    const cli = () => spawnSync(process.execPath, [join(process.cwd(), 'scripts/check-cec-course-brand.mjs')], { cwd: dir, encoding: 'utf8' });
    const clean = cli();
    assert.equal(clean.status, 0, clean.stderr);
    const catalogue = JSON.parse(readFileSync(join(dir, 'data/seed/courses-catalog.json'), 'utf8'));
    firstLesson(catalogue.courses.find((c) => c.slug === CARD_SLUG)).contentBody += ' Order from CCW.';
    writeFileSync(join(dir, 'data/seed/courses-catalog.json'), JSON.stringify(catalogue));
    const planted = cli();
    assert.equal(planted.status, 1);
    assert.match(planted.stderr, new RegExp(`${CARD_SLUG}: data/seed/courses-catalog\\.json .* contains CCW`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('flags a CCW logo in a public course file for an approved slug', () => {
  const inputs = clone();
  inputs.publicFiles.push({ path: `public/courses/${CARD_SLUG}/course-pack.html`, text: '<p>Partner: CCW</p>' });
  assert.ok(findingsFor(inputs, CARD_SLUG).length > 0);
});

test('does not flag plain words that merely contain the letters', () => {
  assert.deepEqual(brandHits('Clockwise accw, ccwide and the Thymox story', real.productNames), []);
  assert.deepEqual(brandHits('Section C. Clean water, a&b, 50&#37; and C W ratios', real.productNames), []);
});

test('fails closed when the registry, products or an approved catalogue entry are missing', () => {
  assert.ok(evaluate({ ...clone(), approvedSlugs: [] }).findings.some((f) => /registry/i.test(f)));
  assert.ok(evaluate({ ...clone(), productNames: [] }).findings.some((f) => /product/i.test(f)));
  const inputs = clone();
  const catalogue = findJson(inputs, 'data/seed/courses-catalog.json');
  catalogue.courses = catalogue.courses.filter((c) => c.slug !== CARD_SLUG);
  assert.ok(evaluate(inputs).findings.some((f) => f.includes(CARD_SLUG) && /catalogue/i.test(f)));
});

test('CI runs the guard and this self-test', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['check:cec-course-brand'], 'node scripts/check-cec-course-brand.mjs');
  assert.equal(pkg.scripts['test:cec-course-brand'], 'node scripts/check-cec-course-brand.test.mjs');
  assert.match(ci, /run: npm run check:cec-course-brand\n/);
  assert.match(ci, /run: npm run test:cec-course-brand\n/);
});

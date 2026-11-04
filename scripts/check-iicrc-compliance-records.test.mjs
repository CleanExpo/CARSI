#!/usr/bin/env node
/**
 * GP-527 — proof that the IICRC/CEC compliance guard can FAIL on a prose CEC-approval claim inside
 * a course RECORD (data/wordpress-export/courses.json), naming the file and the course slug.
 *
 * Before GP-527 the guard did not scan data/wordpress-export/ at all, so
 *   carpet-cleaning        → "approved for IICRC Continuing Education Credit (CEC): 1 Hour"
 *   carpet-cleaning-basics → "(CEC) : 3 Hours"
 * passed `check:iicrc-compliance` clean while the seed (`db:seed-wp-export`) writes those
 * descriptions straight into lms_courses. A clean run over the exposure was taken as evidence.
 *
 * Two layers:
 *   (A) PROCESS: the real guard script, run in a throwaway git repo whose export plants a prose
 *       claim for an unapproved slug, must exit non-zero and name the file and the slug. A clean
 *       export in the same harness must exit 0 (so the red is caused by the plant, not the harness).
 *   (B) UNIT: the exported record scanner and the known-exposure classifier.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, 'check-iicrc-compliance.mjs');
const EXPORT_FILE = 'data/wordpress-export/courses.json';
const PLANTED_SLUG = 'gp527-planted-unapproved-course';

let failed = 0;
const fail = (msg) => {
  console.error(`✖ ${msg}`);
  failed++;
};

/** The exact <style> block reviewed in the real export (GP-673 review 2 placed it inside a word). */
function reviewedStyleBlock() {
  const rows = JSON.parse(readFileSync(join(HERE, '..', EXPORT_FILE), 'utf8'));
  for (const r of rows) {
    const m = typeof r.description === 'string' ? r.description.match(/<style>[\s\S]*?<\/style>/) : null;
    if (m) return m[0];
  }
  throw new Error('the real export no longer holds its reviewed <style> block; update the test deliberately');
}
/** GP-673 review 2: a Markdown table whose header cells render "C", "E", "C". */
const R2_TABLE = 'Earn 2 | C | E | C | hours\n--- | --- | --- | --- | ---\nTraining | credit | award | for | completion';
const R2_TABLE_NEUTRAL = 'Earn 2 | X | Y | Z | hours\n--- | --- | --- | --- | ---\nTraining | credit | award | for | completion';

const course = (slug, short_description, description = '<p>Neutral course copy.</p>') => ({
  slug,
  title: `Course ${slug}`,
  description,
  short_description,
  status: 'published',
  price_aud: 0,
  wp_id: 1,
});

/** Run the real guard in a scratch git repo holding only `files`. */
function runGuardIn(files) {
  const dir = mkdtempSync(join(tmpdir(), 'gp527-guard-'));
  try {
    // The IICRC-free files are a scope floor: a missing one fails the guard on its own. Provide
    // neutral copies so a non-zero exit can only come from the planted record.
    const all = {
      'src/lib/reviews/review-policy.ts': 'export const reviewPolicy = "How was your course?";\n',
      'src/components/lms/ReviewPolicy.tsx': 'export function ReviewPolicy() { return null; }\n',
      ...files,
    };
    for (const [rel, body] of Object.entries(all)) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), body);
    }
    execFileSync('git', ['init', '-q'], { cwd: dir });
    const r = spawnSync(process.execPath, [GUARD], { cwd: dir, encoding: 'utf8' });
    return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- (A) process level
{
  const planted = runGuardIn({
    [EXPORT_FILE]: JSON.stringify(
      [
        course('gp527-clean-course', 'A neutral description with no credit claim.'),
        course(
          PLANTED_SLUG,
          'Course Duration:\nApproximately 30 minutes\nContinuing Education Credit:\nThis course is approved for IICRC Continuing Education Credit (CEC): 1 Hour.'
        ),
      ],
      null,
      2
    ),
  });
  if (planted.status === 0) {
    fail(`planted prose CEC-approval claim for "${PLANTED_SLUG}" PASSED the guard (exit 0)`);
  }
  if (!planted.out.includes(EXPORT_FILE)) fail(`guard output does not name the file ${EXPORT_FILE}`);
  if (!planted.out.includes(PLANTED_SLUG)) fail(`guard output does not name the slug ${PLANTED_SLUG}`);
  if (planted.out.includes('gp527-clean-course')) fail('guard output names the clean course');

  // Review r5 (Codex, P1): neutral prose plus cec_hours "1 Hour" must fail the real guard, and a
  // zero-hours control must pass it.
  const unitHours = runGuardIn({
    [EXPORT_FILE]: JSON.stringify([{ ...course(PLANTED_SLUG, 'Neutral.', 'Neutral.'), title: 'Neutral title', cec_hours: '1 Hour' }]),
  });
  if (unitHours.status === 0 || !unitHours.out.includes(PLANTED_SLUG)) {
    fail(`cec_hours "1 Hour" for "${PLANTED_SLUG}" PASSED the guard or was not named`);
  }
  const zeroHours = runGuardIn({
    [EXPORT_FILE]: JSON.stringify([{ ...course(PLANTED_SLUG, 'Neutral.', 'Neutral.'), title: 'Neutral title', cec_hours: '0 Hours' }]),
  });
  if (zeroHours.status !== 0) fail(`zero-hours control ("0 Hours") was blocked:\n${zeroHours.out}`);

  // Review r1 (Codex, P1): the same claim split across two lines must fail the real guard too.
  const split = runGuardIn({
    [EXPORT_FILE]: JSON.stringify([course(PLANTED_SLUG, 'This course is approved for\nIICRC Continuing Education Credits.')]),
  });
  const inline = runGuardIn({
    [EXPORT_FILE]: JSON.stringify([course(PLANTED_SLUG, 'This course is IICRC <span>C</span><span>E</span><span>C</span> approved.')]),
  });
  if (inline.status === 0 || !inline.out.includes(PLANTED_SLUG)) {
    fail(`inline-markup CEC wording for "${PLANTED_SLUG}" PASSED the guard or was not named`);
  }
  if (split.status === 0 || !split.out.includes(PLANTED_SLUG)) {
    fail(`multi-line prose CEC-approval claim for "${PLANTED_SLUG}" PASSED the guard or was not named`);
  }

  // GP-673 review r1 (Codex, P1): the real guard, on text the student page renders as "CEC".
  for (const text of ['Earn 2 [C](#credit)EC hours.', 'Earn 2 C[cite: 1]EC hours.', 'Earn 2 C<strong>In conclusion, </strong>EC hours.']) {
    const r = runGuardIn({ [EXPORT_FILE]: JSON.stringify([{ ...course(PLANTED_SLUG, 'Neutral.', text), title: 'Neutral title' }]) });
    if (r.status === 0 || !r.out.includes(PLANTED_SLUG)) fail(`GP-673[renderer] real guard passed or did not name the slug for: ${text}`);
  }
  // Control: text the page only tidies (curly quotes, a stock opener) still passes the real guard.
  const tidied = runGuardIn({
    [EXPORT_FILE]: JSON.stringify([{ ...course(PLANTED_SLUG, 'Neutral.', 'Certainly! Neutral copy with \u2019quotes\u2019 and a list.'), title: 'Neutral title' }]),
  });
  if (tidied.status !== 0) fail(`GP-673 control: text the page only tidies was blocked\n${tidied.out.slice(0, 600)}`);
  // GP-673 review 2 (Codex, P1 x3): the real guard, on compositions the real student page
  // (CourseFormattedBody) renders as "CEC", each beside a neutral control built the same way.
  {
    const style = reviewedStyleBlock();
    for (const [cat, bad, neutralText] of [
      ['render-cta', 'Earn 2 C<h2>Already Purchased This Course?</h2><p>Access Here</p>EC hours.', 'Earn 2 credit<h2>Already Purchased This Course?</h2><p>Access Here</p> hours.'],
      ['render-style', `Earn 2 C${style}EC hours.`, `Earn 2 credit${style} hours.`],
    ]) {
      const r = runGuardIn({ [EXPORT_FILE]: JSON.stringify([{ ...course(PLANTED_SLUG, 'Neutral.', bad), title: 'Neutral title' }]) });
      if (r.status === 0 || !r.out.includes(PLANTED_SLUG)) fail(`GP-673[${cat}] real guard passed or did not name the slug for: ${bad.slice(0, 80)}`);
      const ok = runGuardIn({ [EXPORT_FILE]: JSON.stringify([{ ...course(PLANTED_SLUG, 'Neutral.', neutralText), title: 'Neutral title' }]) });
      if (ok.status !== 0) fail(`GP-673[${cat}] control: neutral text built the same way was blocked\n${ok.out.slice(0, 600)}`);
    }
    const table = runGuardIn({ [EXPORT_FILE]: JSON.stringify([{ ...course(PLANTED_SLUG, 'Neutral.', R2_TABLE), title: 'Neutral title' }]) });
    if (table.status === 0 || !table.out.includes(PLANTED_SLUG)) fail('GP-673[render-table] real guard passed or did not name the slug for the C | E | C table');
  }
  // Fail closed: a guard that cannot load the page's text stripper must fail, never pass.
  {
    const dir = mkdtempSync(join(tmpdir(), 'gp673-nostrip-'));
    try {
      mkdirSync(join(dir, 'scripts', 'lib'), { recursive: true });
      writeFileSync(join(dir, 'scripts', 'check-iicrc-compliance.mjs'), readFileSync(GUARD));
      writeFileSync(join(dir, 'scripts', 'lib', 'is-entry-point.mjs'), readFileSync(join(HERE, 'lib', 'is-entry-point.mjs')));
      for (const [rel, body] of Object.entries({
        'src/lib/reviews/review-policy.ts': 'export const reviewPolicy = "How was your course?";\n',
        'src/components/lms/ReviewPolicy.tsx': 'export function ReviewPolicy() { return null; }\n',
        [EXPORT_FILE]: JSON.stringify([course('gp673-clean-course', 'A neutral description.')]),
      })) {
        mkdirSync(dirname(join(dir, rel)), { recursive: true });
        writeFileSync(join(dir, rel), body);
      }
      execFileSync('git', ['init', '-q'], { cwd: dir });
      const r = spawnSync(process.execPath, [join(dir, 'scripts', 'check-iicrc-compliance.mjs')], { cwd: dir, encoding: 'utf8' });
      if (r.status === 0 || !`${r.stdout}${r.stderr}`.includes('could not be loaded')) {
        fail(`GP-673[renderer] guard without the page's text stripper did not fail closed (exit ${r.status})`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  const clean = runGuardIn({
    [EXPORT_FILE]: JSON.stringify([course('gp527-clean-course', 'A neutral description.')], null, 2),
  });
  if (clean.status !== 0) {
    fail(`harness control: a clean export should exit 0, got ${clean.status}\n${clean.out.slice(0, 800)}`);
  }

  // A malformed export must not read as "no records": fail closed, naming the file.
  const broken = runGuardIn({ [EXPORT_FILE]: '{ not json' });
  if (broken.status === 0) fail('malformed export JSON passed the guard (must fail closed)');
  if (!broken.out.includes(EXPORT_FILE)) fail('malformed export failure does not name the file');
}

// ---------------------------------------------------------------- (B) unit level
let mod;
try {
  mod = await import('./check-iicrc-compliance.mjs');
} catch (err) {
  fail(`cannot import the guard: ${err.message}`);
}
const { evaluateRecords, classifyRecordFindings, RECORD_SCANNED_DIRS, CEC_APPROVED_SLUGS, UNREADABLE_MESSAGE, studentView, renderedProblems } = mod ?? {};

if (typeof evaluateRecords !== 'function' || typeof classifyRecordFindings !== 'function') {
  fail('guard does not export evaluateRecords / classifyRecordFindings');
} else {
  const EMPTY = new Set();
  const NONE = new Set();
  const scan = (records, approved = NONE) =>
    evaluateRecords(EXPORT_FILE, JSON.stringify(records), { approvedSlugs: approved, allowlist: EMPTY });

  // Every prose claim shape seen in the real export, plus HTML-split and reworded variants.
  const MUST_BLOCK = [
    ['approved … (CEC): 1 Hour', 'This course is approved for IICRC Continuing Education Credit (CEC): 1 Hour.'],
    ['approved … (CEC) : 3 Hours', 'This course is approved for IICRC Continuing Education Credit (CEC) : 3 Hours'],
    ['bare "(CEC) : 3 Hours"', 'Continuing Education Credit (CEC) : 3 Hours'],
    ['unnumbered "approved for IICRC CECs"', 'This course is approved for IICRC CECs.'],
    ['unnumbered "carries … (CEC) hours"', 'It carries IICRC Continuing Education Credit (CEC) hours.'],
    ['"earns N CECs" without IICRC adjacency', 'Completing it earns 2 CECs.'],
    ['claim split by HTML tags', '<p>This course is <strong>approved for</strong> IICRC <em>Continuing Education Credit (CEC)</em>: 1 Hour.</p>'],
    ['claim split by an entity', 'This course is approved&nbsp;for IICRC Continuing Education Credit (CEC):&nbsp;2 Hours.'],
    // Review r1 (Codex, P1): a claim split across lines passed because lines were checked alone.
    ['claim split across two lines', 'This course is approved for\nIICRC Continuing Education Credits.'],
    ['claim split one word per line', 'This course is approved\nfor\nIICRC\nCECs.'],
    ['hours split from "(CEC)"', 'Continuing Education Credit (CEC)\n: 3 Hours'],
    ['claim split across a <br>', 'It carries<br />IICRC Continuing Education Credit (CEC) hours.'],
    ['zero-width space inside the claim', 'This course is approved​ for IICRC​ Continuing Education Credit (CEC): 1 Hour.'],
    ['soft hyphen inside a word', 'This course is appro­ved for IICRC CECs.'],
    ['hours written as a word', 'Continuing Education Credit (CEC): one Hour'],
    ['half an hour', 'Continuing Education Credit (CEC) : half an hour'],
    // Review r2 (Codex, P1): adjective order slipped past a phrase list. Second miss of the same
    // class, so the rule changed approach: in a course record for an unapproved slug, ANY CEC /
    // continuing-education wording blocks. Nothing tries to read the sentence's meaning.
    ['adjective order "IICRC CEC approved"', 'This course is IICRC CEC approved.'],
    ['hyphenated "CEC-approved"', 'A CEC-approved course.'],
    ['bare heading "CEC Credits"', 'CEC Credits'],
    ['"approved by the IICRC" without CEC', 'This course has been approved by the IICRC.'],
    ['continuing education without "credit"', 'Earn continuing education hours recognised by the IICRC.'],
    ['dotted "C.E.C."', 'Worth 2 C.E.C. hours.'],
    // Fail-closed: a denial is also CEC wording on an unapproved course. CLAUDE.md allows CEC
    // wording on a course only once it is approved, so the remedy is to remove the wording.
    ['denial', 'This course is not approved for IICRC CECs.'],
    ['denial with "yet"', 'This course is not yet approved for IICRC Continuing Education Credits.'],
    ['does-not-award denial', 'It does not award CECs.'],
    // Pre-round-3 probes: text that renders but sits inside markup or behind an entity.
    ['image alt text', '<img alt="approved for IICRC CEC: 1 hour" src="x.png">'],
    ['link title attribute', '<a title="CEC credits" href="#">Read more</a>'],
    ['hex entity', 'Worth &#x43;EC hours.'],
    // Review r3 (Codex, P1): inline tags inside a word. A browser renders "CEC"; the old
    // tag-to-space step produced "C E C". Text is now extracted the way a browser shows it.
    ['inline spans inside a word', 'This course is IICRC <span>C</span><span>E</span><span>C</span> approved.'],
    ['bold first letter', 'Earn <b>C</b>EC hours.'],
    ['inline tag inside "education"', 'Continuing <em>edu</em>cation credits apply.'],
    ['nested inline tags across words', 'IICRC <strong><span>CEC</span></strong> <i>appro</i>ved'],
  ];
  for (const [name, text] of MUST_BLOCK) {
    for (const field of ['short_description', 'description']) {
      const rec = course(PLANTED_SLUG, 'Neutral.', 'Neutral.');
      rec[field] = text;
      const f = scan([rec]);
      if (f.length === 0) fail(`MUST BLOCK (${field}) but passed: ${name}\n    ${text}`);
      else if (!f.every((x) => x.slug === PLANTED_SLUG && x.file === EXPORT_FILE && x.field === field)) {
        fail(`finding does not carry file/slug/field for: ${name}\n    ${JSON.stringify(f[0])}`);
      }
    }
  }

  const MUST_PASS = [
    ['neutral copy', 'Ten-question knowledge check. Australian-produced.'],
    ['duration only', 'Course Duration: Approximately 30 minutes'],
    ['IICRC endorsement disclaimer (no CEC wording)', 'The IICRC does not endorse any educational provider, product, offering, or service.'],
    ['word containing "cec" is not CEC', 'Recece and precede the checklist.'],
    ['block tags separate words', '<p>Spec</p><p>Echo</p><li>sec</li><li>c</li>'],
  ];
  for (const [name, text] of MUST_PASS) {
    const f = scan([course(PLANTED_SLUG, text)]);
    if (f.length > 0) fail(`MUST PASS but blocked: ${name}\n    ${f.map((x) => x.text).join(' | ')}`);
  }

  // A registry-approved slug may state its CEC hours; the SAME text on an unapproved slug blocks.
  const claim = 'This course is approved for IICRC Continuing Education Credit (CEC): 1 Hour.';
  const approvedSlug = Array.isArray(CEC_APPROVED_SLUGS) ? CEC_APPROVED_SLUGS[0] : undefined;
  if (!approvedSlug) {
    fail('CEC_APPROVED_SLUGS is empty or not exported — cannot run the approved-slug control');
  } else {
    if (scan([course(approvedSlug, claim)], new Set([approvedSlug])).length > 0) {
      fail(`approved slug ${approvedSlug} was blocked for its own CEC claim`);
    }
    // Exact slug match, never substring: "<approved>-copy" is a different course.
    if (scan([course(`${approvedSlug}-copy`, claim)], new Set([approvedSlug])).length === 0) {
      fail('slug approval matched by substring (approved-slug prefix exempted another course)');
    }
  }

  // A structured positive CEC-hours number on an unapproved slug is the claim in its plainest form.
  for (const rec of [
    { slug: PLANTED_SLUG, title: 't', cec_hours: 5 },
    { slug: PLANTED_SLUG, title: 't', meta: { cec_hours: 2 } },
    // Review r4 (Codex, P1): hours stored as a string or inside a list under a CEC key.
    { slug: PLANTED_SLUG, title: 't', cec_hours: '5' },
    { slug: PLANTED_SLUG, title: 't', meta: { cec_hours: [5] } },
    { slug: PLANTED_SLUG, title: 't', meta: { cec: { hours: 3 } } },
    // Review r5 (Codex, P1): ordinary unit wording in a CEC field ("1 Hour") is still a claim.
    { slug: PLANTED_SLUG, title: 't', cec_hours: '1 Hour' },
    { slug: PLANTED_SLUG, title: 't', cec_hours: '1.5 hours' },
    { slug: PLANTED_SLUG, title: 't', meta: { cec_hours: ['3 Hours'] } },
  ]) {
    const f = scan([rec]);
    if (f.length === 0) fail(`numeric CEC hours passed: ${JSON.stringify(rec)}`);
  }
  for (const rec of [
    { slug: PLANTED_SLUG, title: 't', cec_hours: null },
    { slug: PLANTED_SLUG, title: 't', cec_hours: 0 },
    { slug: PLANTED_SLUG, title: 't', cec_hours: '0' },
    { slug: PLANTED_SLUG, title: 't', cec_hours: '0 Hours' },
    { slug: PLANTED_SLUG, title: 't', cec_hours: '' },
    { slug: PLANTED_SLUG, title: 't', price_aud: 99, duration_hours: 4 },
  ]) {
    if (scan([rec]).length > 0) fail(`no-claim numeric record blocked: ${JSON.stringify(rec)}`);
  }
  if (approvedSlug && scan([{ slug: approvedSlug, title: 't', cec_hours: 1 }], new Set([approvedSlug])).length > 0) {
    fail('approved slug blocked for its own cec_hours');
  }

  // Review r4 (Codex, P1): CEC wording in the slug itself is course copy too (it is the URL).
  for (const slug of ['gp527-cec-approved-course', 'gp527-continuing-education-course']) {
    // Title is neutral on purpose: course() puts the slug in the title, which would make this vacuous.
    if (scan([{ ...course(slug, 'Neutral.', 'Neutral.'), title: 'Neutral title' }]).length === 0) {
      fail(`CEC wording in slug passed: ${slug}`);
    }
  }
  if (scan([course('gp527-neutral-course', 'Neutral.', 'Neutral.')]).length > 0) fail('neutral slug blocked');

  // A record with no slug cannot be matched to an approval: it must still block.
  if (scan([{ title: 'x', short_description: claim }]).length === 0) fail('slug-less record passed');
  // Not an array of records → fail closed with a finding, not silence.
  if (evaluateRecords(EXPORT_FILE, '{"courses": {}}', { approvedSlugs: NONE, allowlist: EMPTY }).length === 0) {
    fail('non-array export produced no finding');
  }

  // ------------------------------------------------ known-exposure classification (GP-525)
  const [f1] = scan([course('carpet-cleaning', claim)]);
  const listed = [{ file: EXPORT_FILE, slug: 'carpet-cleaning', field: 'short_description', text: f1?.text }];
  const ok = classifyRecordFindings([f1], listed, NONE);
  if (ok.blocking.length !== 0 || ok.known.length !== 1) fail('listed known-exposure claim was not classified as known');

  const [fNew] = scan([course('a-new-course', claim)]);
  if (classifyRecordFindings([fNew], listed, NONE).blocking.length === 0) {
    fail('known-exposure list let a NEW slug through with the same text');
  }
  const [fChanged] = scan([course('carpet-cleaning', claim.replace('1 Hour', '8 Hours'))]);
  if (classifyRecordFindings([fChanged], listed, NONE).blocking.length === 0) {
    fail('known-exposure list let a CHANGED claim through for a listed slug');
  }
  const stale = classifyRecordFindings([], listed, NONE);
  if (stale.blocking.length === 0) fail('stale known-exposure entry (claim gone) did not block');
  const overlap = classifyRecordFindings([f1], listed, new Set(['carpet-cleaning']));
  if (overlap.blocking.length === 0) fail('a slug on both the exposure list and the approvals registry did not block');

  // ------------------------------------------------ GP-673: deliberate evasion
  // Threat model: someone who edits the export ON PURPOSE so that a learner SEES CEC wording on an
  // unapproved course while the text scanner reads something harmless. GP-527's four review rounds
  // each found a new disguise, so these cases do not test more phrasings. They test that, for an
  // unapproved course, anything the scanner cannot read the way a browser shows it fails closed.
  // Each case was watched passing the base checker (96fab7a5) before the change.
  const EVASIONS = {
    'css-drawn': [
      ['::before content in a style block', '<style>p::before{content:"\\49 ICRC approved"}</style><p>Neutral.</p>'],
      ['content property inline', '<p style="content:\'1 hour\'">Neutral.</p>'],
      ['CSS-escaped property name', '<style>p:after{cont\\65nt:"\\43 EC"}</style><p>Neutral.</p>'],
      ['external stylesheet import', '<style>@import url(https://example.com/a.css);</style><p>Neutral.</p>'],
      ['web font that redraws letters', '<style>@font-face{font-family:x;src:url(https://example.com/x.woff)}</style><p style="font-family:x">ABA hours</p>'],
    ],
    'css-order': [
      ['flex row-reverse joins "EC" + "C"', '<p style="display:flex;flex-direction:row-reverse"><strong>EC</strong><strong>C</strong></p>'],
      ['flex order', '<p style="display:flex"><strong style="order:2">EC</strong><strong style="order:1">C</strong> hours</p>'],
      ['bidi override shows reversed text', '<p style="direction:rtl;unicode-bidi:bidi-override">devorppa CRCII</p>'],
      ['bdo element', '<bdo dir="rtl">devorppa CRCII</bdo>'],
      ['bidi control character', '\u202Edevorppa CRCII'],
    ],
    'hidden-decoy': [
      ['display:none decoy inside a word', 'Earn C<strong style="display:none">x</strong>EC hours.'],
      ['hidden attribute decoy', 'Earn C<strong hidden>x</strong>EC hours.'],
      ['site class that hides', 'Earn C<strong class="hidden">x</strong>EC hours.'],
      ['zero font-size decoy', 'Earn C<strong style="font-size:0">x</strong>EC hours.'],
      ['transparent colour decoy', 'Earn C<strong style="color:transparent">x</strong>EC hours.'],
      ['off-screen margin decoy', 'Earn C<strong style="margin-left:-9999px">x</strong>EC hours.'],
      ['comment holding ">"', 'Earn C<!-- > -->EC hours.'],
      ['template element decoy', 'Earn C<template>x</template>EC hours.'],
      // A reviewed <p> value moved onto an inline element is not reviewed there.
      ['reviewed callout colours on an inline decoy', 'Earn C<strong style="color:#555;background:#fff8e1">x</strong>EC hours.'],
      ['reviewed em size compounding inline', 'Earn C<strong style="font-size:0.85em"><strong style="font-size:0.85em">x</strong></strong>EC hours.'],
    ],
    svg: [
      ['letters drawn as SVG paths', '<svg viewBox="0 0 30 10"><path d="M2 2h4M2 2v6h4"/></svg> approved'],
      ['SVG image as a data URI', '<img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" alt="">'],
    ],
    image: [
      ['unreviewed image with neutral alt', '<img src="https://example.com/badge-1.png" alt="Course badge">'],
      ['unreviewed base64 image', '<img src="data:image/png;base64,iVBORw0KGgo=">'],
    ],
    'look-alike': [
      ['Cyrillic letters', 'IICRC \u0421\u0415\u0421 approved'],
      ['Greek epsilon', 'Earn C\u0395C hours.'],
      ['fullwidth letters', 'Earn \uFF23\uFF25\uFF23 hours.'],
      ['mathematical bold letters', 'Earn \u{1D402}\u{1D404}\u{1D402} hours.'],
      ['combining accent splits the word', 'Earn C\u0301EC hours.'],
      ['C with cedilla', 'Earn \u00C7EC hours.'],
    ],
    encoding: [
      ['numeric entity without semicolon', 'Worth &#67EC hours.'],
      ['named letter entity', 'Worth &Ccedil;EC hours.'],
      ['spaced letters "C E C"', 'Worth 2 C E C hours.'],
      ['hyphenated letters "C-E-C"', 'Worth 2 C-E-C hours.'],
      ['glued "IICRCCECapproved"', 'This course is IICRCCECapproved.'],
      ['glued "continuingeducation"', 'Earn continuingeducation hours.'],
      // Only the case-sensitive inside-a-word rule sees this one (letters on both sides).
      ['upper-case CEC inside a word', 'Earn ProCECplus hours.'],
    ],
  };
  // Review r1 (Codex, P1): the student page renders the stored text through stripAiWritingSigns
  // and, for tag-free fields, Markdown. Text those steps join or turn into images must block.
  EVASIONS.renderer = [
    ['Markdown link joins "C" + "EC"', 'Earn 2 [C](#credit)EC hours.'],
    ['Markdown image', '![Reviewed training badge](https://example.invalid/badge.png)'],
    ['Markdown code span', 'Earn 2 `C`EC hours.'],
    ['citation marker removed by the page', 'Earn 2 C[cite: 1]EC hours.'],
    ['template placeholder removed by the page', 'Earn 2 C{{name}}EC hours.'],
    ['stock phrase removed inside allowed markup', 'Earn 2 C<strong>In conclusion, </strong>EC hours.'],
    ['vendor marker word removed inside allowed markup', 'Earn 2 C<strong>oaicite</strong>EC hours.'],
    ['hiding tag formed only after the page strips a placeholder', 'Earn C<{{x}}strong style="display:none">x</strong>EC hours.'],
  ];
  for (const [cat, cases] of Object.entries(EVASIONS)) {
    for (const [name, text] of cases) {
      const rec = { ...course(PLANTED_SLUG, 'Neutral.', text), title: 'Neutral title' };
      const f = scan([rec]);
      if (f.length === 0) fail(`GP-673[${cat}] MUST BLOCK but passed: ${name}\n    ${text}`);
      else if (!f.some((x) => x.slug === PLANTED_SLUG && x.file === EXPORT_FILE && x.field === 'description')) {
        fail(`GP-673[${cat}] finding does not name file/slug/field for: ${name}\n    ${JSON.stringify(f[0])}`);
      }
    }
  }
  // GP-673 review 2 (Codex, P1 x3). The real student page removes the legacy purchase block and
  // <style> blocks and renders Markdown tables, and each can join or space letters into "CEC". The
  // CEC WORDING rules must fire on what the page shows (a readability finding alone is not enough
  // for these), and the same construct with neutral letters must not draw a wording finding.
  {
    const wording = (f) => f.filter((x) => x.message !== UNREADABLE_MESSAGE);
    const style = reviewedStyleBlock();
    for (const [cat, bad, neutralText, neutralMayBeUnreadable] of [
      ['render-cta', 'Earn 2 C<h2>Already Purchased This Course?</h2><p>Access Here</p>EC hours.', 'Earn 2 credit<h2>Already Purchased This Course?</h2><p>Access Here</p> hours.', false],
      ['render-cta', 'Earn 2 C<h3 class="x">Already Purchased This Course</h3><p>Use the link. Access Here.</p>EC hours.', null, false],
      ['render-style', `Earn 2 C${style}EC hours.`, `Earn 2 credit${style} hours.`, false],
      ['render-table', R2_TABLE, R2_TABLE_NEUTRAL, true],
    ]) {
      const rec = (text) => ({ ...course(PLANTED_SLUG, 'Neutral.', text), title: 'Neutral title' });
      const f = scan([rec(bad)]);
      if (wording(f).length === 0) fail(`GP-673[${cat}] no CEC wording finding on what the page shows for: ${bad.slice(0, 90)}`);
      else if (!wording(f).some((x) => x.slug === PLANTED_SLUG && x.field === 'description')) fail(`GP-673[${cat}] finding does not name slug/field`);
      if (neutralText === null) continue;
      const n = scan([rec(neutralText)]);
      if (wording(n).length > 0) fail(`GP-673[${cat}] control: neutral text drew a CEC wording finding\n    ${wording(n).map((x) => x.text).join(' | ')}`);
      if (!neutralMayBeUnreadable && n.length > 0) fail(`GP-673[${cat}] control: neutral text was blocked\n    ${n.map((x) => x.text).join(' | ')}`);
      // Tables are not in the reviewed output markup, so the neutral table is still unreadable.
      if (neutralMayBeUnreadable && n.length === 0) fail(`GP-673[${cat}] control: a Markdown table (not reviewed output markup) passed the readability gate`);
    }
  }
  // Brief item 2: CEC wording in link text, link targets, titles, image alt / title / file names,
  // and other attributes a learner sees or a screen reader reads, inside course text.
  {
    const LINK_IMAGE = [
      ['link text joins "C" + "EC"', 'Earn 2 <a href="https://carsi.com.au/courses">C</a>EC hours.'],
      ['link target path', '<p><a href="https://carsi.com.au/cec-approved-course">Read more</a></p>'],
      ['percent-encoded link target', '<p><a href="https://carsi.com.au/%43EC-hours">Read more</a></p>'],
      ['entity in link target', '<p><a href="https://carsi.com.au/x#&#67;EC">Read more</a></p>'],
      ['link title attribute', '<p><a href="https://carsi.com.au/x" title="CEC approved">Read more</a></p>'],
      ['Markdown link title', 'See [Read more](https://carsi.com.au/x "CEC approved") today.'],
      ['Markdown image alt', '![CEC approved badge](https://carsi.com.au/badge.png)'],
      ['image file name', '<img src="https://carsi.com.au/wp-content/uploads/IICRC-CEC-approved.png" alt="Badge">'],
      ['image title', '<img src="https://carsi.com.au/wp-content/uploads/badge.png" alt="Badge" title="CEC approved">'],
      ['image alt joined to a letter', 'Earn 2 C<img src="https://carsi.com.au/x.png" alt="EC"> hours.'],
      ['aria-label on a link', '<p><a href="https://carsi.com.au/x" aria-label="CEC approved course">Read more</a></p>'],
      ['bare address the page turns into a link', 'See https://carsi.com.au/cec-hours for details.'],
    ];
    for (const [name, text] of LINK_IMAGE) {
      const f = scan([{ ...course(PLANTED_SLUG, 'Neutral.', text), title: 'Neutral title' }]);
      if (f.length === 0) fail(`GP-673[link-image] MUST BLOCK but passed: ${name}\n    ${text}`);
    }
    for (const [name, text] of [
      ['neutral reviewed link', '<p><a href="https://carsi.com.au/courses/drying" role="button">Read more</a></p>'],
      ['neutral bare address', 'See https://carsi.com.au/courses for details.'],
    ]) {
      const f = scan([{ ...course(PLANTED_SLUG, 'Neutral.', text), title: 'Neutral title' }]);
      if (f.length > 0) fail(`GP-673[link-image] control blocked: ${name}\n    ${f.map((x) => x.text).join(' | ')}`);
    }
  }
  // GP-673 review 3 (Codex, P1 GP673-R3-DASH): letters split by an en or em dash read as "CEC" to a
  // learner, raw, as an entity or percent-encoded. The fix is one shared rule (any character that
  // is not a letter or digit separates the letters), so every punctuation character a learner can
  // read between C, E and C is covered, not only the ones a review happened to try. Each case has a
  // control built the same way with other letters, which must not draw a wording finding.
  {
    const wording = (f) => f.filter((x) => x.message !== UNREADABLE_MESSAGE);
    const rec = (text) => ({ ...course(PLANTED_SLUG, 'Neutral.', text), title: 'Neutral title' });
    const DASH = [
      ['en dash', 'Earn 2 C–E–C hours.', 'Earn 2 A–B–C hours.'],
      ['em dash', 'Earn 2 C—E—C hours.', 'Earn 2 A—B—C hours.'],
      ['spaced en dash', 'Earn 2 C – E – C hours.', 'Earn 2 A – B – C hours.'],
      ['en dash entity (numeric)', 'Earn 2 C&#8211;E&#8211;C hours.', 'Earn 2 A&#8211;B&#8211;C hours.'],
      ['em dash entity (hex)', 'Earn 2 C&#x2014;E&#x2014;C hours.', 'Earn 2 A&#x2014;B&#x2014;C hours.'],
      ['en dash entity (named)', 'Earn 2 C&ndash;E&ndash;C hours.', 'Earn 2 A&ndash;B&ndash;C hours.'],
      ['bullet', 'Earn 2 C•E•C hours.', 'Earn 2 A•B•C hours.'],
      ['ellipsis', 'Earn 2 C…E…C hours.', 'Earn 2 A…B…C hours.'],
      ['no-break space', 'Earn 2 C E C hours.', 'Earn 2 A B C hours.'],
      ['curly apostrophe', 'Earn 2 C’E’C hours.', 'Earn 2 A’B’C hours.'],
      ['comma', 'Earn 2 C,E,C hours.', 'Earn 2 A,B,C hours.'],
      ['colon', 'Earn 2 C:E:C hours.', 'Earn 2 A:B:C hours.'],
      ['plus', 'Earn 2 C+E+C hours.', 'Earn 2 A+B+C hours.'],
      ['tilde', 'Earn 2 C~E~C hours.', 'Earn 2 A~B~C hours.'],
      ['percent-encoded en dash in a link target', '<p><a href="https://carsi.com.au/C%E2%80%93E%E2%80%93C-hours">Read more</a></p>', '<p><a href="https://carsi.com.au/A%E2%80%93B%E2%80%93C-hours">Read more</a></p>'],
      ['en dash entity in a link target', '<p><a href="https://carsi.com.au/C&#8211;E&#8211;C-hours">Read more</a></p>', '<p><a href="https://carsi.com.au/A&#8211;B&#8211;C-hours">Read more</a></p>'],
    ];
    for (const [name, bad, neutralText] of DASH) {
      const f = wording(scan([rec(bad)]));
      if (f.length === 0) fail(`GP-673[dash] MUST DRAW A CEC WORDING FINDING but did not: ${name}\n    ${bad}`);
      else if (!f.some((x) => x.slug === PLANTED_SLUG && x.field === 'description')) fail(`GP-673[dash] finding does not name slug/field: ${name}`);
      const n = wording(scan([rec(neutralText)]));
      if (n.length > 0) fail(`GP-673[dash] control drew a CEC wording finding: ${name}\n    ${n.map((x) => x.text).join(' | ')}`);
    }
    // Ordinary prose with a dash between words, and initials, must not read as CEC.
    for (const text of ['Clean – extract – contain.', 'Section C – Equipment checks.', 'Grades A, B and C.']) {
      const n = wording(scan([rec(text)]));
      if (n.length > 0) fail(`GP-673[dash] control drew a CEC wording finding on ordinary prose: ${text}\n    ${n.map((x) => x.text).join(' | ')}`);
    }
    // The real guard, end to end, on two of the cases above.
    for (const bad of ['Earn 2 C–E–C hours.', '<p><a href="https://carsi.com.au/C%E2%80%93E%E2%80%93C-hours">Read more</a></p>']) {
      const r = runGuardIn({ [EXPORT_FILE]: JSON.stringify([rec(bad)]) });
      if (r.status === 0 || !r.out.includes(PLANTED_SLUG)) fail(`GP-673[dash] real guard passed or did not name the slug for: ${bad}`);
    }
  }
  // GP-673 review 3 (Codex, P0 GP673-R3-ATTR-MUTATION): each feed of the rendered view into the
  // wording rules needs a case that ONLY that feed can catch, so deleting the feed turns this test
  // red. The stored-text views cannot see these: the purchase block (removed only by the page) sits
  // inside the link target, or the wording exists only before or only after percent-decoding.
  {
    const wording = (f) => f.filter((x) => x.message !== UNREADABLE_MESSAGE);
    const rec = (text) => ({ ...course(PLANTED_SLUG, 'Neutral.', text), title: 'Neutral title' });
    const CTA = '<h2>Already Purchased This Course?</h2><p>Access Here</p>';
    const link = (href) => `<p><a href="https://carsi.com.au/${href}">Read more</a></p>`;
    const ATTR_FEED = [
      ['purchase block inside a link target (rendered attribute)', link(`C${CTA}EC-hours`), link(`courses${CTA}-drying`)],
      ['purchase block inside a link target, then a percent escape (decoded attribute only)', link(`C${CTA}%45C-hours`), link(`C${CTA}%45X-hours`)],
      ['wording only before percent-decoding (raw attribute only)', link('x%CEC-approved'), link('x%CEX-approved')],
    ];
    for (const [name, bad, neutralText] of ATTR_FEED) {
      const f = wording(scan([rec(bad)]));
      if (f.length === 0) fail(`GP-673[attr-feed] MUST DRAW A CEC WORDING FINDING but did not: ${name}\n    ${bad}`);
      const n = wording(scan([rec(neutralText)]));
      if (n.length > 0) fail(`GP-673[attr-feed] control drew a CEC wording finding: ${name}\n    ${n.map((x) => x.text).join(' | ')}`);
    }
  }
  // Review 2 warning GP673-W1: reviewed attribute VALUES are enforced, not only attribute names.
  for (const [name, text] of [
    ['ul type other than disc', '<ul type="x"><li>Neutral</li></ul>'],
    ['a role other than button', '<p><a href="https://carsi.com.au/x" role="tab">Link</a></p>'],
  ]) {
    if (scan([{ ...course(PLANTED_SLUG, 'Neutral.', text), title: 'Neutral title' }]).length === 0) fail(`GP-673[attr-value] MUST BLOCK but passed: ${name}`);
  }
  // The rendered-output layer alone. The input gate already blocks most of these records, so these
  // checks prove the second layer works by itself (each one was watched fail with that part removed).
  if (typeof studentView !== 'function' || typeof renderedProblems !== 'function') {
    fail('GP-673[render-output] guard does not export studentView / renderedProblems');
  } else {
    const view = (t) => studentView(t);
    const flat = (s) => s.replace(/\s+/g, ' ').trim();
    const realRowsOut = JSON.parse(readFileSync(join(HERE, '..', EXPORT_FILE), 'utf8'));
    const imgOwner = realRowsOut.find((r) => /<img\b/i.test(r.description ?? ''));
    const imgOnly = imgOwner?.description.match(/<img\b[^>]*>/i)?.[0];
    const OUT = [
      ['image alt sits in the visible text', () => flat(view('Earn 2 C<img src="https://carsi.com.au/x.png" alt="EC"> hours.').text).includes('CEC')],
      ['link target is collected', () => view('<p><a href="https://carsi.com.au/cec-x">Read</a></p>').attrs.includes('https://carsi.com.au/cec-x')],
      ['percent-escapes in a link target decode', () => view('<p><a href="https://carsi.com.au/%43EC">Read</a></p>').attrs.includes('https://carsi.com.au/CEC')],
      ['Markdown table cells are separated', () => /C E C/.test(flat(view(R2_TABLE).text))],
      ['purchase block is removed as the page does', () => flat(view('Earn 2 C<h2>Already Purchased This Course?</h2><p>Access Here</p>EC hours.').text) === 'Earn 2 CEC hours.'],
      ['hidden CSS on rendered markup is a problem', () => renderedProblems(view('<p style="display:none">Neutral.</p>'), PLANTED_SLUG).length > 0],
      ['reviewed CSS on rendered markup is not a problem', () => renderedProblems(view('<p style="margin: 0in; font-family: Calibri;">Neutral.</p>'), PLANTED_SLUG).length === 0],
      ['an unreviewed rendered image is a problem', () => renderedProblems(view('![Badge](https://carsi.com.au/badge.png)'), PLANTED_SLUG).length > 0],
      ['the reviewed image renders clean on its own course', () => Boolean(imgOnly) && renderedProblems(view(imgOnly), imgOwner.slug).length === 0],
      ['the reviewed image is a problem on another course', () => Boolean(imgOnly) && renderedProblems(view(imgOnly), PLANTED_SLUG).length > 0],
      ['a rendered table is a problem', () => renderedProblems(view(R2_TABLE_NEUTRAL), PLANTED_SLUG).length > 0],
    ];
    for (const [name, check] of OUT) {
      let ok = false;
      try {
        ok = check();
      } catch (err) {
        fail(`GP-673[render-output] crashed: ${name} (${err.message})`);
        continue;
      }
      if (!ok) fail(`GP-673[render-output] ${name}: not true`);
    }
  }
  // Rendered markup that is not in the reviewed output list (here a Markdown quote) is unreadable.
  if (scan([{ ...course(PLANTED_SLUG, 'Neutral.', '> A neutral quote.'), title: 'Neutral title' }]).length === 0) {
    fail('GP-673[render-output] MUST BLOCK but passed: Markdown blockquote (not reviewed output markup)');
  }

  // Percent-encoded wording in the slug (the URL bar decodes it).
  if (scan([{ ...course('gp673-%63ec-course', 'Neutral.', 'Neutral.'), title: 'Neutral title' }]).length === 0) {
    fail('GP-673[encoding] MUST BLOCK but passed: percent-encoded "cec" in the slug');
  }

  // New field shapes: a field the checker does not know, or a known field holding a new type.
  const neutral = () => ({ ...course(PLANTED_SLUG, 'Neutral.', 'Neutral.'), title: 'Neutral title' });
  for (const [name, extra] of [
    ['renamed hours key', { ceu_hours: 5 }],
    ['unknown text field', { credits: '2 IICRC credit hours' }],
    ['claim in a key name', { 'IICRC CEC approved': true }],
    ['unknown nested field', { meta: { extra: { c: 5 } } }],
    ['cec_hours as a boolean', { cec_hours: true }],
    ['cec_hours as a word', { cec_hours: 'five' }],
    ['tags holding an object', { tags: [{ label: 'x', n: 2 }] }],
    ['key named like a built-in', JSON.parse('{"constructor": "x"}')],
  ]) {
    let f;
    try {
      f = scan([{ ...neutral(), ...extra }]);
    } catch (err) {
      fail(`GP-673[field-shape] scanner crashed on: ${name} (${err.message})`);
      continue;
    }
    if (f.length === 0) fail(`GP-673[field-shape] MUST BLOCK but passed: ${name}`);
  }
  // A JSON "__proto__" key is an ordinary own field; it must block, not crash.
  try {
    if (evaluateRecords(EXPORT_FILE, `[{"slug":"${PLANTED_SLUG}","title":"t","__proto__":{"x":1}}]`, { approvedSlugs: NONE, allowlist: EMPTY }).length === 0) {
      fail('GP-673[field-shape] MUST BLOCK but passed: "__proto__" key');
    }
  } catch (err) {
    fail(`GP-673[field-shape] scanner crashed on a "__proto__" key (${err.message})`);
  }
  if (scan([{ ...neutral(), description: 'Worth &constructor; hours.' }]).length === 0) {
    fail('GP-673[encoding] MUST BLOCK but passed: entity named like a built-in');
  }

  // Course-card thumbnails are images too: pinned per course, exactly.
  {
    const realRowsForThumbs = JSON.parse(readFileSync(join(HERE, '..', EXPORT_FILE), 'utf8'));
    const own = realRowsForThumbs.find((r) => !(CEC_APPROVED_SLUGS ?? []).includes(r.slug) && r.thumbnail_url);
    const base = { ...neutral(), slug: own.slug };
    if (scan([{ ...base, thumbnail_url: own.thumbnail_url }]).length > 0) fail('GP-673 control: pinned thumbnail blocked on its own course');
    if (scan([{ ...base, thumbnail_url: '' }]).length > 0) fail('GP-673 control: empty thumbnail blocked');
    if (scan([{ ...base, thumbnail_url: own.thumbnail_url.replace(/\.(\w+)$/, '-cec.$1') }]).length === 0) {
      fail('GP-673[image] swapped thumbnail passed');
    }
    if (scan([{ ...neutral(), thumbnail_url: own.thumbnail_url }]).length === 0) fail('GP-673[image] thumbnail on a new course passed');
    if (scan([{ ...neutral(), thumbnail_url: 'https://carsi.com.au/wp-content/uploads/undefined' }]).length === 0) {
      fail('GP-673[image] "uploads/undefined" thumbnail on an unpinned course passed');
    }
  }
  // One slug, one record; approval needs the exact slug.
  if (approvedSlug) {
    const svg = '<svg><path d="M0 0"/></svg>';
    const twin = [course(approvedSlug, 'Neutral.'), course(approvedSlug, 'Neutral.', svg)];
    if (scan(twin, new Set([approvedSlug])).length === 0) fail('GP-673[field-shape] duplicate approved slug borrowed the approval');
    if (scan([course(` ${approvedSlug} `, 'Neutral.', svg)], new Set([approvedSlug])).length === 0) {
      fail('GP-673[field-shape] padded approved slug borrowed the approval');
    }
  }

  // Controls. Markup copied from the real export must still pass, so the gate is not "block all".
  const LIVE_SHAPED = [
    '<p style="margin: 0in; margin-left: .375in; font-family: Calibri; font-size: 13.5pt;">Neutral.</p>',
    '<ul style="direction: ltr; unicode-bidi: embed; margin-top: 0in; margin-bottom: 0in;" type="disc"><li style="margin-top: 0; margin-bottom: 0; vertical-align: middle;">Neutral &amp; plain &rsquo;quoted&rsquo; text&nbsp;here.</li></ul>',
    '<h3>Neutral</h3><p><strong>Bold</strong> and <em>em</em><br /><a href="https://carsi.com.au/x" role="button">Link</a></p>',
  ];
  for (const text of LIVE_SHAPED) {
    const f = scan([{ ...neutral(), description: text }]);
    if (f.length > 0) fail(`GP-673 control: live-shaped markup blocked\n    ${text}\n    ${f.map((x) => x.message).join(' | ')}`);
  }
  // An approved course is not held to the readability gate (it may state CEC wording anyway).
  if (approvedSlug) {
    const svgOnApproved = scan([{ ...course(approvedSlug, 'Neutral.', '<svg><path d="M0 0"/></svg>'), title: 'Neutral title' }], new Set([approvedSlug]));
    if (svgOnApproved.length > 0) fail('GP-673 control: readability gate ran on an approved course');
  }
  // The one reviewed live image passes only on its own course and only byte-for-byte.
  const realRows = JSON.parse(readFileSync(join(HERE, '..', EXPORT_FILE), 'utf8'));
  const imgRow = realRows.find((r) => /<img\b/i.test(r.description ?? ''));
  const imgTag = imgRow?.description.match(/<img\b[^>]*>/i)?.[0];
  if (!imgTag) fail('GP-673 control: the real export no longer holds its reviewed image; update the test deliberately');
  else {
    const onOwn = scan([{ ...neutral(), slug: imgRow.slug, description: imgTag }]);
    if (onOwn.length > 0) fail(`GP-673 control: reviewed image blocked on its own course\n    ${onOwn.map((x) => x.message).join(' | ')}`);
    if (scan([{ ...neutral(), description: imgTag }]).length === 0) fail('GP-673[image] reviewed image passed on a different course');
    if (scan([{ ...neutral(), slug: imgRow.slug, description: imgTag.replace('Sydney-3', 'Sydney-4') }]).length === 0) {
      fail('GP-673[image] a changed image source passed as reviewed');
    }
  }

  // ------------------------------------------------ scope floor
  if (!Array.isArray(RECORD_SCANNED_DIRS) || !RECORD_SCANNED_DIRS.includes('data/wordpress-export/')) {
    fail('data/wordpress-export/ is no longer record-scanned');
  }
  // Positive control on the real export: the scanner must still SEE claims in it (an empty result
  // here would mean the scan went blind, not that the export is clean).
  const real = evaluateRecords(EXPORT_FILE, readFileSync(join(HERE, '..', EXPORT_FILE), 'utf8'), {
    approvedSlugs: new Set(CEC_APPROVED_SLUGS ?? []),
    allowlist: EMPTY,
  });
  if (!real.some((x) => x.slug === 'carpet-cleaning') || !real.some((x) => x.slug === 'carpet-cleaning-basics')) {
    fail('real export scan does not see the GP-525 carpet-cleaning / carpet-cleaning-basics claims');
  }
  // GP-673: the frozen export itself must be fully readable (no "cannot read" finding on live data).
  const unreadable = real.filter((x) => /^GP-673/.test(x.message));
  if (unreadable.length > 0) {
    fail(`GP-673 control: ${unreadable.length} readability finding(s) on the real export\n    ${unreadable.slice(0, 5).map((x) => `${x.slug} ${x.field}: ${x.message}`).join('\n    ')}`);
  }
}

if (failed > 0) {
  console.error(`\n✖ IICRC/CEC record-scan self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log('✓ IICRC/CEC record-scan self-test passed (planted prose claim blocks naming file + slug; controls OK).');
process.exit(0);

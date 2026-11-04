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
const { evaluateRecords, classifyRecordFindings, RECORD_SCANNED_DIRS, CEC_APPROVED_SLUGS } = mod ?? {};

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
}

if (failed > 0) {
  console.error(`\n✖ IICRC/CEC record-scan self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log('✓ IICRC/CEC record-scan self-test passed (planted prose claim blocks naming file + slug; controls OK).');
process.exit(0);

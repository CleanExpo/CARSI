#!/usr/bin/env node
/**
 * Non-vacuity proof for the IICRC/CEC compliance guard's specific-CEC-hour rule (allowlist design).
 *
 * The guard is BLOCK-BY-DEFAULT: every numbered "N IICRC CEC(s)" line on a non-approved surface is
 * a finding UNLESS its exact normalised text is in the human-maintained allowlist
 * (scripts/iicrc-cec-allowlist.json, ships EMPTY). There is NO regex/auto exemption. This test:
 *   - MUST_BLOCK: with an EMPTY allowlist, every award / laundering / smuggle / parenthetical line
 *     produces a finding (they can only ever ship via the human allowlist).
 *   - GENUINE_ALLOWLISTABLE: a genuine IICRC program-requirement line BLOCKS when unannotated and
 *     PASSES only when its exact line is placed in the allowlist.
 *   - Negative controls: a NEAR-MISS of an allowlisted line still blocks (no wildcarding); a
 *     whitespace-only variant of an allowlisted line still passes (normalisation); planted claim
 *     fires and a clean line is silent.
 */
import { existsSync, readFileSync } from 'node:fs';

import { evaluateContent, evaluateIicrcFree, IICRC_FREE_FILES, normaliseLine } from './check-iicrc-compliance.mjs';

// A non-approved course fixture path (no slug appears in cec-approvals.json → not slug-exempt).
const NON_APPROVED = 'data/seed/courses-catalog.json';
const EMPTY = new Set();
const allowOf = (...lines) => new Set(lines.map(normaliseLine));

// Each MUST_BLOCK case must produce >=1 finding under the EMPTY (default) allowlist. Every entry is
// IICRC-adjacent (matches the rule) so none is vacuous. Under block-by-default the guard no longer
// needs to reason about award verbs, requirement forms, cadence or clause structure — any numbered
// IICRC-CEC line that a human has not allowlisted is a finding, full stop.
const MUST_BLOCK = [
  // 2026-11-02: describing a course as "CEC-accredited training" is a CEC claim that needs the
  // course's own IICRC approval. Twelve seed entries and six intro-video scripts carried it with no
  // approval; formerly this line was a MUST_PASS "site-wide value prop" sample.
  ['course called "CEC-accredited training" without approval',
    'Completing this CEC-accredited training also earns IICRC Continuing Education Credits (CECs).'],
  ['designation course "CEC-accredited training leading to"',
    'It is CEC-accredited training leading to the CARSI Water Restoration Practitioner designation.'],
  ['"(CEC-accredited)" tag', '"discipline": "CARSI Water Restoration Practitioner (CEC-accredited)"'],
  ['lesson title "a CEC-accredited overview"', 'Carpet, fibre and soil: an CEC-accredited overview'],
  ['N IICRC CECs', 'This course awards 4 IICRC CECs.'],
  ['N IICRC Continuing Education Credits', 'Completing it awards 4 IICRC Continuing Education Credits.'],
  ['N IICRC CECs + maintaining-IICRC boilerplate',
    'Completing this CEC-accredited training earns 4 IICRC CECs toward maintaining an existing IICRC certification.'],
  ['N IICRC CECs + bare "recertification"',
    'Completing this course earns 4 IICRC CECs toward IICRC recertification.'],
  ['award claim + trailing cadence', 'This course earns 4 IICRC CECs per 4-year cycle.'],
  ['completing this course earns … + cadence', 'Completing this course earns 4 IICRC CECs per 4-year cycle.'],
  ['award verb "awarded" + cadence', 'Learners are awarded 4 IICRC CECs every 4 years of study.'],
  ['"to get N IICRC CECs" + cadence', 'Complete this training to get 4 IICRC CECs per 4-year cycle.'],
  ['"counts for N IICRC CECs" + cadence', 'This course counts for 4 IICRC CECs per 4-year cycle.'],
  ['"qualifies for N IICRC CECs" + cadence', 'Qualifies for 4 IICRC CECs per cycle.'],
  ['"offers N IICRC CECs" + cadence', 'Offers 4 IICRC CECs every 4 years.'],
  ['"required" governs training, "earn" governs CECs',
    'Complete the required training to earn 4 IICRC CECs per 4-year cycle.'],
  ['"Renew" governs enrolment, "get" governs CECs',
    'Renew your enrolment and get 4 IICRC CECs every 4 years.'],
  ['"Maintain" governs streak, "earn" governs CECs',
    'Maintain your streak to earn 4 IICRC CECs per cycle.'],
  ['award verb in the require->number gap',
    'This course requires you to earn 4 IICRC CECs per 4-year cycle.'],
  ['award verb in the with->number gap',
    'Maintain your certification with coursework earning 4 IICRC CECs every 4 years.'],
  ['award clause between number and cadence (v6)',
    'This course requires only a minimum of 4 IICRC CECs, which you earn per cycle.'],
  ['award verb after number, before cadence', 'Requires 4 IICRC CECs that learners earn each 4-year cycle.'],
  ['award clause after semicolon', 'Requires 14 IICRC CECs; get them every 4 years.'],
  ['multi-clause laundering (v7)',
    'This non-approved course offered 4 IICRC CECs per 4-year cycle; IICRC recertification requires 14 IICRC CECs per 4-year cycle.'],
  // v8 parenthetical: a non-governed CEC inside a wide requirement-form span. Under the allowlist
  // design there is no span to fall inside — the whole line is just not allowlisted, so it blocks.
  ['v8 parenthetical (non-governed CEC inside a wide requirement span)',
    'Maintain certification (course: 4 IICRC CECs) with 14 IICRC CECs per cycle.'],
  ['veto: offered', 'This course offered 4 IICRC CECs per 4-year cycle.'],
  ['veto: offering', 'This course is offering 4 IICRC CECs per 4-year cycle.'],
  ['veto: counted / qualifying', 'Qualifying learners are counted for 4 IICRC CECs every 4 years.'],
  ['veto: counting', 'The portal is counting 4 IICRC CECs every 4 years.'],
  ['veto: qualified', 'Qualified students got 4 IICRC CECs per cycle.'],
  ['veto: carried', 'Each module carried 4 IICRC CECs per 4-year cycle.'],
  ['veto: awarding', 'The school is awarding 4 IICRC CECs every 4 years.'],
  ['veto: got', 'Students got 4 IICRC CECs per 4-year cycle.'],
  ['N IICRC CEC hours', 'This course provides 4 IICRC CEC hours.'],
  ['(CEC): N Hours label form', 'IICRC (CEC): 4 Hours'],
];

// Genuine IICRC program-requirement facts that ARE numbered IICRC-CEC lines. Each MUST block when
// unannotated (fail-closed default) AND pass when its exact line is in the allowlist.
const GENUINE_ALLOWLISTABLE = [
  ['requires N IICRC CEC hours every 4 years',
    'Certifications (WRT, ASD, AMRT) require 14 IICRC CEC hours every 4 years to maintain.'],
  ['requires N IICRC CEC hours every 2 years',
    'Master and Inspector certifications require 14 IICRC CEC hours every 2 years.'],
  ['requires N IICRC CECs per 4-year recertification cycle',
    'IICRC certifications require 14 IICRC CECs per 4-year recertification cycle.'],
  ['multi genuine requirement clauses (both IICRC-adjacent)',
    'IICRC recertification requires 14 IICRC CECs per 4-year cycle; master inspectors require 14 IICRC CECs every 2 years.'],
];

// Lines that are NOT numbered IICRC-CEC claims (do not match the rule) — pass under EMPTY allowlist.
// Includes genuine program facts whose number is NOT IICRC-adjacent (rule never fires on them).
const MUST_PASS_ALWAYS = [
  ['program fact — non-adjacent "require 14 CECs per 4-year cycle"', 'Standard IICRC certifications require 14 CECs per 4-year cycle.'],
  ['program fact — non-adjacent recertification requires', 'IICRC recertification requires 14 CECs per 4-year cycle.'],
  ['program fact — non-adjacent maintain certification', 'maintain your certification with 14 CECs every 4 years'],
  ['count of courses is not a CEC-hour claim',
    'CARSI delivers 40+ online courses. Each course earns verified Continuing Education Credits (CECs).'],
  ['learner CEC-tracking badge (allowed by CLAUDE.md)', "{ label: '50 CECs Earned' }"],
  ['CEC calculator requirement math (not a course claim)', '21 CECs as a Master'],
  ['ticket ref that abuts CEC', 'GP-498 CEC licence gate — production display path'],
  ['code comment about absence of CEC', 'No registry approval → 0 CEC, never a derived one.'],
  ['sanctioned provider wording', 'CARSI provides IICRC CEC Accredited training for aged care teams.'],
  ['negated disclaimer', 'It is <strong>not</strong> IICRC CEC accredited and it does not award CECs.'],
];

let failed = 0;
const fail = (msg) => { console.error(`✖ ${msg}`); failed++; };

// (1) MUST_BLOCK — empty allowlist.
for (const [name, line] of MUST_BLOCK) {
  if (evaluateContent(NON_APPROVED, line, EMPTY).length === 0) fail(`MUST BLOCK but passed: ${name}\n    ${line}`);
}

// (2) GENUINE_ALLOWLISTABLE — block unannotated, pass when allowlisted.
for (const [name, line] of GENUINE_ALLOWLISTABLE) {
  if (evaluateContent(NON_APPROVED, line, EMPTY).length === 0) fail(`GENUINE but PASSED unannotated (should block-by-default): ${name}\n    ${line}`);
  if (evaluateContent(NON_APPROVED, line, allowOf(line)).length > 0) fail(`GENUINE but BLOCKED when allowlisted: ${name}\n    ${line}`);
}

// (3) MUST_PASS_ALWAYS — empty allowlist.
for (const [name, line] of MUST_PASS_ALWAYS) {
  const f = evaluateContent(NON_APPROVED, line, EMPTY);
  if (f.length > 0) fail(`MUST PASS but blocked: ${name}\n    ${line}\n    ${f.join('\n    ')}`);
}

// (4) Negative control — the allowlist is EXACT, not a wildcard: a near-miss of an allowlisted line
// still blocks. Allowlist a genuine line, then feed variants that differ by number / word.
const G = 'IICRC certifications require 14 IICRC CECs per 4-year recertification cycle.';
const allowG = allowOf(G);
if (evaluateContent(NON_APPROVED, G, allowG).length > 0) fail('allowlisted exact line should PASS');
for (const nearMiss of [
  'IICRC certifications require 18 IICRC CECs per 4-year recertification cycle.',   // number changed
  'IICRC certifications require 14 IICRC CECs per 5-year recertification cycle.',   // cadence changed
  'This course awards 14 IICRC CECs per 4-year recertification cycle.',            // award reframing
]) {
  if (evaluateContent(NON_APPROVED, nearMiss, allowG).length === 0) fail(`near-miss of allowlisted line should BLOCK:\n    ${nearMiss}`);
}

// (5) Normalisation — a whitespace-only variant of an allowlisted line still passes (trim + collapse
// internal whitespace), but wording/number is preserved so it is not a wildcard.
const spacedVariant = '   IICRC certifications require 14 IICRC CECs   per 4-year recertification cycle.  ';
if (evaluateContent(NON_APPROVED, spacedVariant, allowG).length > 0) fail('whitespace-only variant of allowlisted line should PASS (normalisation)');

// (6) Plant/clean negative control.
if (evaluateContent(NON_APPROVED, 'This course awards 4 IICRC CECs.', EMPTY).length === 0) fail('planted "awards 4 IICRC CECs" did not fire.');
if (evaluateContent(NON_APPROVED, 'This course is Australian-produced. Ten-question knowledge check.', EMPTY).length > 0) fail('clean line fired the guard.');

// (6b) GP-753 — copy implying CARSI delivers or grants IICRC certification, or that the IICRC
// approved ("board-approved") the course. The first three lines are the GP-525 breaches verbatim
// from docs/marketing; this guard exited 0 on all three before GP-753. Dynamic import so the
// static import line above stays untouched (open PR #1190 edits it).
{
  const guard = await import('./check-iicrc-compliance.mjs');
  const MARKETING = 'docs/marketing/google-ads-campaign.md';
  const ctxOf = (entries = []) =>
    typeof guard.newCertificationContext === 'function' ? guard.newCertificationContext(entries) : undefined;
  const run = (line, ctx = ctxOf()) => guard.evaluateContent(MARKETING, line, EMPTY, ctx);
  const CERT_MUST_BLOCK = [
    ['GP-525 E1: product headline', '| Headline 1 | IICRC Cleaning Certification — Online |'],
    ['GP-525 E3: board-approved',
      `| "Online training isn't as good as hands-on" | "CARSI's courses are IICRC board-approved — the same credential standard as any classroom course. Plus, your crew gets hands-on experience on real job sites, which no classroom can replicate." |`],
    ['GP-525 E1: "with IICRC certifications" as a benefit',
      '| Description 1 | Stand out from competitors with IICRC certifications. Carpet cleaning, mould remediation, water damage — all available online. Build recognised skills and grow your business. |'],
    ['discipline certification as a product', 'IICRC Water Damage Certification'],
    ['multi-word discipline certification', 'Enrol in the IICRC Mould Remediation Certification today.'],
    ['ampersand discipline certification', 'IICRC Fire & Smoke Certifications'],
    ['online label, lower case', 'IICRC certification - online'],
    ['online prefix', 'Online IICRC Certification for cleaners'],
    ['board-approved, hyphen variant', 'Every module is IICRC-board-approved.'],
    ['board-approved, reordered', 'Board-approved by the IICRC and ready to start.'],
    ['board approved, spaced', 'CARSI courses: IICRC board approved.'],
    ['"with IICRC Creds" headline', '| Headline 4 | Win More Contracts with IICRC Creds |'],
    ['"with IICRC credentials" benefit', 'Builders and project managers — reduce defect liability with IICRC credentials.'],
    ['"companies with IICRC certifications win"', 'Cleaning companies with IICRC certifications win 3x more remediation contracts.'],
    ['grant verb "add"', 'Cleaning franchise owners and operators — add IICRC credentials to your business.'],
    ['grant verb "earn verifiable"', 'Earn verifiable IICRC credentials your HSE team can audit.'],
    ['grant verb "get your"', 'Get your IICRC certification in a weekend.'],
    ['grant verb "gain"', 'Gain IICRC qualifications without leaving the job site.'],
    ['slang "IICRC certs"', 'The 3 IICRC certs that unlock restoration revenue'],
  ];
  const CERT_MUST_PASS = [
    ['third-person: FSRT is an IICRC certification', 'FSRT is an IICRC certification covering fire and smoke restoration.'],
    ['third-person: obtained only through approved schools', 'IICRC certification is obtained only through IICRC-approved schools and examinations.'],
    ['denial: not IICRC CEC accredited', 'This course is not IICRC CEC accredited.'],
    ['denial: CARSI does not deliver', 'CARSI does not deliver IICRC certification.'],
    ['denial: courses do not grant', 'CARSI courses do not grant IICRC certification.'],
    ['denial: no CARSI course will get you', 'No CARSI course will get you IICRC credentials.'],
    ["student's own recert tracking", 'Track your IICRC WRT certification renewal and CEC hours.'],
    ["student's own designation, title case", 'Your IICRC Water Restoration Technician Certification is due for renewal.'],
    ['CEC toward an existing certification', 'Earn IICRC CECs toward maintaining your existing IICRC certification.'],
    ['third-person route to certification', 'Earn IICRC certification through an IICRC-approved school; CARSI CECs help keep it current.'],
    ['holders earn CECs', 'Technicians with IICRC certifications earn CECs through approved courses.'],
    ['learner brings own credentials', 'Bring your IICRC credentials, CEC records, and equipment inventory.'],
    ['provider standing', 'CARSI is an IICRC CEC Accredited provider — CEC hours are shown only on courses the IICRC has approved.'],
    ['industry fact', 'IICRC certification is required for many insurance panels.'],
  ];
  for (const [name, line] of CERT_MUST_BLOCK) {
    if (run(line).length === 0) fail(`GP-753 MUST BLOCK but passed: ${name}\n    ${line}`);
  }
  for (const [name, line] of CERT_MUST_PASS) {
    const f = run(line);
    if (f.length > 0) fail(`GP-753 MUST PASS but blocked: ${name}\n    ${line}\n    ${f.join('\n    ')}`);
  }
  // Known-findings baseline: a pinned exact (file, text) line is reported, not blocked; a near-miss
  // or the same text in another file still blocks; a pinned entry whose line is gone is stale.
  const pinnedLine = 'Win insurance work with IICRC credentials';
  if (typeof guard.newCertificationContext !== 'function' || typeof guard.staleCertificationEntries !== 'function') {
    fail('GP-753 baseline API (newCertificationContext / staleCertificationEntries) is not exported');
  } else {
    const ctx = ctxOf([{ file: MARKETING, text: pinnedLine }]);
    if (run(`   ${pinnedLine}  `, ctx).length > 0) fail('GP-753 pinned line (whitespace variant) should not block');
    if (ctx.known.size !== 1) fail('GP-753 pinned line should be recorded as a known finding');
    if (guard.staleCertificationEntries(ctx).length !== 0) fail('GP-753 matched pinned entry reported stale');
    if (run('Win more insurance work with IICRC credentials', ctx).length === 0) fail('GP-753 near-miss of pinned line should BLOCK');
    if (guard.evaluateContent('docs/marketing/other.md', pinnedLine, EMPTY, ctx).length === 0) fail('GP-753 pinned text in another file should BLOCK');
    const staleCtx = ctxOf([{ file: MARKETING, text: 'a line that is not there' }]);
    run('Clean copy.', staleCtx);
    if (guard.staleCertificationEntries(staleCtx).length !== 1) fail('GP-753 unmatched pinned entry should be STALE (baseline only shrinks)');
  }
  console.log(`  GP-753 certification-phrase cases: ${CERT_MUST_BLOCK.length} block, ${CERT_MUST_PASS.length} pass, baseline controls.`);
}

// (6c) GP-753 follow-up — the certification promise WITHOUT the word "IICRC" ("get certified",
// "certification course", "earn your certification"). Every CERT_BARE_MUST_BLOCK line exited 0
// against the guard as of PR #1201's head (81a73f91); the rules after it block them. Run the
// same plant against that guard to see it pass (vacuity check for this block).
{
  const guard = await import('./check-iicrc-compliance.mjs');
  const MARKETING = 'docs/marketing/google-ads-campaign.md';
  const ctx = () => (typeof guard.newCertificationContext === 'function' ? guard.newCertificationContext([]) : undefined);
  const run = (line) => guard.evaluateContent(MARKETING, line, EMPTY, ctx());
  const CERT_BARE_MUST_BLOCK = [
    ['podcast CTA (docs/content, fixed here)', '"💧 The 3 water categories every restorer must know (IICRC S500). Get certified → carsi.com.au #waterdamage"'],
    ['get certified, lower case', 'get certified fast and win more jobs'],
    ['become certified', 'Become certified in water restoration in a weekend.'],
    ['become a certified technician', 'Complete this course to become a certified technician.'],
    ['become fully certified', 'Our learners become fully certified online.'],
    ['getting certified', 'Getting certified has never been easier.'],
    ['certification course', 'Enrol in our certification course today.'],
    ['certification courses, hyphen', 'Online certification-courses for carpet cleaners.'],
    ['certification training', 'IICRC certification training online.'],
    ['certification program', 'Join the CARSI certification program.'],
    ['certification programme', 'A 12-week certification programme for technicians.'],
    ['certification class', 'Book a certification class near you.'],
    ['earn your certification', 'Earn your certification online with CARSI.'],
    ['achieve certification', 'Achieve certification in mould remediation.'],
    ['gain an industry certification', 'Gain an industry certification without leaving the job site.'],
    ['obtain your certification', 'Obtain your certification in three days.'],
    ['receive certification', 'Receive certification on completion.'],
  ];
  const CERT_BARE_MUST_PASS = [
    ['provider standing', 'CARSI offers IICRC CEC Accredited courses.'],
    ['third-person: FSRT', 'FSRT is an IICRC certification covering fire and smoke restoration.'],
    ['third-person: obtained through schools', 'IICRC certification is obtained only through IICRC-approved schools and examinations.'],
    ['third-person: route through school', 'Technicians get certified through an IICRC-approved school, then keep it current with CECs.'],
    ['third-person requirement ("be certified")', 'Technicians must be certified by the IICRC to join many insurance panels.'],
    ["student's own recert", 'Your IICRC recertification is due in March.'],
    ["student's own renewal", 'Track the CECs you need to renew your IICRC certification.'],
    ["student's own: keep current", 'Keep your IICRC certification current with CEC courses.'],
    ["student's own: maintain", 'Earn IICRC CECs toward maintaining your existing certification.'],
    ['member number', 'Enter your IICRC member number to log CECs.'],
    ['CEC tracking', 'Your CEC hours this cycle: 4 of 14 logged.'],
    ['CARSI designation', 'Earn your CARSI Water Restoration Practitioner designation.'],
    ['completion certificate', 'Download your certificate of completion.'],
    ['denial: not a certification course', 'This is not a certification course.'],
    ['denial: paired adjective (ccw-truckmount-assessment)', 'It is a manufacturer/operator competency assessment, not an accredited or certification course.'],
    ['denial: does not get you certified', 'A CARSI course does not get you certified by the IICRC.'],
    ['denial: cannot become certified here', 'You cannot become certified through a CARSI course.'],
  ];
  for (const [name, line] of CERT_BARE_MUST_BLOCK) {
    if (run(line).length === 0) fail(`GP-753 (bare) MUST BLOCK but passed: ${name}\n    ${line}`);
  }
  for (const [name, line] of CERT_BARE_MUST_PASS) {
    const f = run(line);
    if (f.length > 0) fail(`GP-753 (bare) MUST PASS but blocked: ${name}\n    ${line}\n    ${f.join('\n    ')}`);
  }
  console.log(`  GP-753 bare certification cases: ${CERT_BARE_MUST_BLOCK.length} block, ${CERT_BARE_MUST_PASS.length} pass.`);
}

// (7) IICRC-free files (public review policy): planted IICRC/CEC wording fires, neutral copy is
// silent, and every listed file exists and is currently clean.
for (const planted of [
  "eyebrow: 'IICRC CEC Accredited course review',",
  '// earns CECs towards your renewal',
  'Continuing Education Credit reminder',
  'subject: `Rate your iicrc course`',
]) {
  if (evaluateIicrcFree('src/lib/reviews/review-policy.ts', planted).length === 0) fail(`IICRC-free rule missed: ${planted}`);
}
if (evaluateIicrcFree('x.ts', "title: 'How was your course?', // a precedent for the record").length > 0) {
  fail('IICRC-free rule fired on neutral copy (CEC must match as a word, not inside "precedent")');
}
// Scope floor: the public review policy must stay on the list (an emptied list scans nothing).
for (const required of ['src/lib/reviews/review-policy.ts', 'src/components/lms/ReviewPolicy.tsx']) {
  if (!IICRC_FREE_FILES.includes(required)) fail(`IICRC_FREE_FILES no longer lists ${required}`);
}
for (const f of IICRC_FREE_FILES) {
  if (!existsSync(f)) fail(`IICRC-free file missing: ${f}`);
  else if (evaluateIicrcFree(f, readFileSync(f, 'utf8')).length > 0) fail(`IICRC-free file carries IICRC/CEC wording: ${f}`);
}

if (failed > 0) {
  console.error(`\n✖ IICRC/CEC compliance guard self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(
  `✓ IICRC/CEC compliance guard self-test passed ` +
  `(${MUST_BLOCK.length} block, ${GENUINE_ALLOWLISTABLE.length} genuine block+allowlist, ` +
  `${MUST_PASS_ALWAYS.length} always-pass, near-miss + normalisation + plant/clean controls OK).`
);
process.exit(0);

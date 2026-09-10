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
import { evaluateContent, normaliseLine, ALLOWLISTS } from './check-iicrc-compliance.mjs';

// A non-approved course fixture path (no slug appears in cec-approvals.json → not slug-exempt).
const NON_APPROVED = 'data/seed/courses-catalog.json';
const EMPTY = new Set();
const allowOf = (...lines) => new Set(lines.map(normaliseLine));

// Each MUST_BLOCK case must produce >=1 finding under the EMPTY (default) allowlist. Every entry is
// IICRC-adjacent (matches the rule) so none is vacuous. Under block-by-default the guard no longer
// needs to reason about award verbs, requirement forms, cadence or clause structure — any numbered
// IICRC-CEC line that a human has not allowlisted is a finding, full stop.
const MUST_BLOCK = [
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
  ['generic no-number CEC framing (site-wide value prop)',
    'Completing this CEC-accredited training also earns IICRC Continuing Education Credits (CECs).'],
  ['count of courses is not a CEC-hour claim',
    'CARSI delivers 40+ online courses. Each course earns verified Continuing Education Credits (CECs).'],
  ['learner CEC-tracking badge (allowed by CLAUDE.md)', "{ label: '50 CECs Earned' }"],
  ['CEC calculator requirement math (not a course claim)', '21 CECs as a Master'],
  ['ticket ref that abuts CEC', 'GP-498 CEC licence gate — production display path'],
  ['code comment about absence of CEC', 'No registry approval → 0 CEC, never a derived one.'],
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

// ── "IICRC-approved": block by default, exact human allowlist (v4, 2026-09-10) ─
// Four regex allow-patterns were each defeated by a new prose construction (see the rule's
// comment). The control is no longer a pattern - it is a human reading a sentence - so the tests
// below check the MECHANISM, not a shape: the shipped allowlist passes, near-misses do not, a
// wrap fragment cannot be approved, and an empty allowlist blocks everything.

// 1. POSITIVE CONTROL, generated from the shipped allowlist. Every approved line must pass; if
//    one does not, the guard is blocking a licence disclaimer the founder already approved.
let approvedChecked = 0;
for (const entry of ALLOWLISTS.iicrcApprovedLines) {
  approvedChecked += 1;
  if (evaluateContent(NON_APPROVED, entry).length > 0) {
    fail(`allowlisted line should PASS:\n    ${entry.slice(0, 140)}`);
  }
}
if (approvedChecked === 0) {
  fail('the IICRC-approved allowlist is empty - this control proved nothing');
}

// 2. NEAR-MISS, generated from the same allowlist. Splicing a CARSI offering noun into an
//    approved sentence must block: exact match means a near-miss is not "close enough". This is
//    generated rather than hand-written because a hand-written near-miss only ever tests the
//    variant its author imagined - the failure that produced four review rounds.
let nearMissChecked = 0;
for (const entry of ALLOWLISTS.iicrcApprovedLines) {
  for (const offering of ['courses', 'training', 'programs']) {
    const nearMiss = entry.replace(/IICRC([\s-])approved/i, `IICRC$1approved ${offering} from`);
    if (nearMiss === entry) continue;
    nearMissChecked += 1;
    if (evaluateContent(NON_APPROVED, nearMiss).length === 0) {
      fail(`near-miss of an approved line should BLOCK:\n    ${nearMiss.slice(0, 140)}`);
    }
  }
}
if (nearMissChecked < ALLOWLISTS.iicrcApprovedLines.size) {
  fail(`near-miss control did not generate: ${nearMissChecked} of ${ALLOWLISTS.iicrcApprovedLines.size}`);
}

// 3. Every construction the four review rounds found. None is in the allowlist, so each blocks
//    for the same reason rather than each needing its own rule. Kept as a regression record of
//    what the regex versions permitted.
const REVIEW_ROUND_PAYLOADS = [
  ['r1 institution modifying courses', 'Our IICRC-approved school courses get you certified.'],
  ['r1 same, across a wrap', 'Our IICRC-approved\nschool courses get you certified.'],
  ['r2 institution modifying training', 'Our IICRC-approved school training gets you certified.'],
  ['r3 offering through a possessive', "Our IICRC-approved school's examination courses get you certified."],
  ['r3 offering through "and"', 'Our IICRC-approved school and examination courses get you certified.'],
  ['r3 offering through "/"', 'Our IICRC-approved school/examination courses get you certified.'],
  ['r4 offering after a comma', 'Our IICRC-approved school, courses get you certified.'],
  ['r4 offering after an ampersand', 'Our IICRC-approved school & courses get you certified.'],
  ['r4 offering via the CE branch', 'Our IICRC-approved CE courses get you certified.'],
  ['offering after a semicolon', 'Our IICRC-approved school; courses get you certified.'],
  ['offering after a colon', 'Our IICRC-approved school: courses get you certified.'],
  ['offering after an em dash', 'Our IICRC-approved school — courses get you certified.'],
  ['offering after a preposition', 'Our IICRC-approved school at examination courses get you certified.'],
  ['offering via the CEC-provider branch', 'Our IICRC-approved CEC provider courses get you certified.'],
  // GP-583 and GP-584 were documented residuals of the regex versions. Exact-line matching
  // closes both FOR THIS RULE - pinned here so a future change cannot quietly reopen them.
  ['GP-583 bare possessive claim', 'Our IICRC-approved school.'],
  ['GP-584 allow co-occurring with a violation',
   'Our IICRC-approved courses get you certified. CARSI is a CEC provider.'],
];
for (const [name, text] of REVIEW_ROUND_PAYLOADS) {
  if (evaluateContent(NON_APPROVED, text).length === 0) {
    fail(`CARSI-offering claim should BLOCK: ${name}\n    ${text.replace(/\n/g, '\\n')}`);
  }
}

// 4. A wrap fragment must not be approvable. An entry ENDING on the banned phrase says nothing
//    about the noun on the following line, so honouring it would permit every continuation.
//    The loader drops such entries; this proves it, and proves the joined form still works.
const DANGLING_ENTRY = 'deliver IICRC certification. IICRC certifications are obtained through IICRC-approved';
const WRAPPED_SOURCE = `${DANGLING_ENTRY}\n              schools and examinations.`;
const EVASION_AFTER_FRAGMENT = `${DANGLING_ENTRY}\n              school courses get you certified.`;
if (evaluateContent(NON_APPROVED, WRAPPED_SOURCE, { iicrcApprovedLines: new Set([DANGLING_ENTRY]) }).length === 0) {
  fail('a dangling allowlist entry was honoured - it wildcards every continuation of the wrap');
}
if (evaluateContent(NON_APPROVED, EVASION_AFTER_FRAGMENT, { iicrcApprovedLines: new Set([DANGLING_ENTRY]) }).length === 0) {
  fail('a dangling allowlist entry let a CARSI-offering claim through on the wrapped line');
}
if (evaluateContent(NON_APPROVED, WRAPPED_SOURCE,
      { iicrcApprovedLines: new Set([normaliseLine(WRAPPED_SOURCE)]) }).length > 0) {
  fail('the JOINED text of a wrapped disclaimer should be approvable');
}

// 5. Fail-closed. An empty allowlist blocks every approved line - the guard never falls back to
//    a pattern, and there is no branch left that could quietly allow one.
for (const entry of ALLOWLISTS.iicrcApprovedLines) {
  if (evaluateContent(NON_APPROVED, entry, EMPTY).length === 0) {
    fail(`with an EMPTY allowlist every line must block, this did not:\n    ${entry.slice(0, 120)}`);
  }
}

if (failed > 0) {
  console.error(`\n✖ IICRC/CEC compliance guard self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(
  `✓ IICRC/CEC compliance guard self-test passed (${approvedChecked} allowlisted lines, ${nearMissChecked} generated near-misses) ` +
  `(${MUST_BLOCK.length} block, ${GENUINE_ALLOWLISTABLE.length} genuine block+allowlist, ` +
  `${MUST_PASS_ALWAYS.length} always-pass, near-miss + normalisation + plant/clean controls OK).`
);
process.exit(0);

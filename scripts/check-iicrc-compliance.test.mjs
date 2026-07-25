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
import { evaluateContent, normaliseLine } from './check-iicrc-compliance.mjs';

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

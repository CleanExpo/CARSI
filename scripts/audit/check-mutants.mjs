#!/usr/bin/env node
/**
 * GP-567 c3 — NEGATIVE CONTROL for the Evidence Ledger validator.
 *
 * A validator that cannot fail turns every green into decoration. This mutates a
 * KNOWN-GOOD entry once per schema rule and asserts each mutant is rejected.
 *
 * Two properties, not one — the second is the one usually skipped:
 *   1. every mutant is rejected           (the validator fires)
 *   2. every mutant is rejected BY ITS OWN RULE, matched on the expected
 *      message, so a mutant cannot pass the suite by tripping some unrelated
 *      check. Without this, one over-broad rule makes the whole suite vacuous.
 *
 * It also asserts the clean base entry PASSES, so the validator is not simply
 * rejecting everything — a validator that fails all input is as useless as one
 * that passes all input.
 */
import { validateEntry, REQUIRED_ALWAYS, GAP_ACTIONS, STATUSES, CONFIDENCES } from './validate-ledger.mjs';

const BASE_VERIFIED = {
  id: 'mutant-base',
  claim: 'The live /courses page lists 80 courses.',
  claim_class: 'count',
  surface: 'https://carsi.com.au/courses',
  status: 'VERIFIED',
  source_url: 'https://carsi.com.au/sitemap.xml',
  access_date: '2026-09-07',
  quote: 'sitemap.xml lists 80 URLs under /courses/',
  feeds: ['catalogue'],
};

const BASE_JUSTIFIED = {
  id: 'mutant-base-j',
  claim: 'Course duration reflects median completion time.',
  claim_class: 'workload',
  surface: 'repo:data/seed/courses-catalog.json',
  status: 'JUSTIFIED',
  confidence: 'medium',
  reasoning: 'No completion telemetry is published; the figure is the author estimate of record.',
  best_available_source: 'repo:data/seed/courses-catalog.json durationHours',
  feeds: ['catalogue'],
};

const BASE_GAP = {
  id: 'mutant-base-g',
  claim: 'CARSI is an IICRC CEC Accredited provider.',
  claim_class: 'banned-language',
  surface: 'https://carsi.com.au/courses',
  status: 'GAP',
  reason: 'cec-approvals.json holds zero approvals, so nothing backs the claim.',
  recommended_action: 'remove',
  feeds: ['catalogue'],
};

const drop = (o, k) => {
  const c = structuredClone(o);
  delete c[k];
  return c;
};
const set = (o, k, v) => ({ ...structuredClone(o), [k]: v });

const MUTANTS = [
  { rule: 'missing id', entry: drop(BASE_VERIFIED, 'id'), expect: /missing required field "id"/ },
  { rule: 'missing claim', entry: drop(BASE_VERIFIED, 'claim'), expect: /missing required field "claim"/ },
  { rule: 'missing claim_class', entry: drop(BASE_VERIFIED, 'claim_class'), expect: /missing required field "claim_class"/ },
  { rule: 'missing surface', entry: drop(BASE_VERIFIED, 'surface'), expect: /missing required field "surface"/ },
  { rule: 'missing feeds', entry: drop(BASE_VERIFIED, 'feeds'), expect: /missing required field "feeds"/ },
  // Added after round-2 review: `status` is in REQUIRED_ALWAYS and the validator
  // rejects its absence, but no mutant planted it. c3 claimed "one mutant per
  // schema rule" while a rule sat unmutated. The coverage assertion below now
  // makes that class of gap impossible rather than merely fixing this instance.
  { rule: 'missing status', entry: drop(BASE_VERIFIED, 'status'), expect: /missing required field "status"/ },
  {
    rule: 'GAP recommended_action off-vocabulary',
    entry: set(BASE_GAP, 'recommended_action', 'launder'),
    expect: /recommended_action "launder" is not one of/,
  },
  { rule: 'fourth status invented', entry: set(BASE_VERIFIED, 'status', 'PROBABLY_FINE'), expect: /there is no fourth state/ },
  { rule: 'CONFLICT smuggled in as status', entry: set(BASE_VERIFIED, 'status', 'CONFLICT'), expect: /CONFLICT is a sidecar field, never a status/ },
  { rule: 'VERIFIED without source_url', entry: drop(BASE_VERIFIED, 'source_url'), expect: /VERIFIED requires source_url/ },
  { rule: 'VERIFIED source_url not a URL', entry: set(BASE_VERIFIED, 'source_url', 'I looked at it'), expect: /neither a URL nor a repo: path/ },
  { rule: 'VERIFIED without access_date', entry: drop(BASE_VERIFIED, 'access_date'), expect: /VERIFIED requires access_date/ },
  { rule: 'VERIFIED access_date not ISO', entry: set(BASE_VERIFIED, 'access_date', 'Sept 2026'), expect: /VERIFIED requires access_date as YYYY-MM-DD/ },
  { rule: 'VERIFIED without quote', entry: drop(BASE_VERIFIED, 'quote'), expect: /VERIFIED requires quote/ },
  {
    rule: 'VERIFIED quote over 25 words',
    entry: set(BASE_VERIFIED, 'quote', Array.from({ length: 26 }, (_, i) => `w${i}`).join(' ')),
    expect: /quote is 26 words, limit is 25/,
  },
  { rule: 'JUSTIFIED without confidence', entry: drop(BASE_JUSTIFIED, 'confidence'), expect: /JUSTIFIED requires confidence/ },
  { rule: 'JUSTIFIED confidence off-vocabulary', entry: set(BASE_JUSTIFIED, 'confidence', 'pretty sure'), expect: /confidence "pretty sure" is not one of/ },
  { rule: 'JUSTIFIED without reasoning', entry: drop(BASE_JUSTIFIED, 'reasoning'), expect: /JUSTIFIED requires reasoning/ },
  { rule: 'JUSTIFIED without best_available_source', entry: drop(BASE_JUSTIFIED, 'best_available_source'), expect: /JUSTIFIED requires best_available_source/ },
  { rule: 'GAP without reason', entry: drop(BASE_GAP, 'reason'), expect: /GAP requires reason/ },
  { rule: 'GAP without recommended_action', entry: drop(BASE_GAP, 'recommended_action'), expect: /GAP requires recommended_action/ },
  { rule: 'conflict sidecar missing engines', entry: set(BASE_VERIFIED, 'conflict', { disagreement: 'x' }), expect: /conflict requires engine_a and engine_b/ },
  { rule: 'conflict sidecar missing disagreement', entry: set(BASE_VERIFIED, 'conflict', { engine_a: 'a', engine_b: 'b' }), expect: /conflict requires disagreement/ },
  {
    rule: 'conflict overwrote the original',
    entry: set(BASE_VERIFIED, 'conflict', { engine_a: 'a', engine_b: 'b', disagreement: 'x', overwrote_original: true }),
    expect: /conflict must never overwrite the original claim/,
  },
  { rule: 'feeds not an array', entry: set(BASE_VERIFIED, 'feeds', 'catalogue'), expect: /feeds must be an array/ },
  { rule: 'check_by not ISO', entry: set(BASE_VERIFIED, 'check_by', 'next year'), expect: /check_by must be YYYY-MM-DD/ },
  { rule: 'entry is not an object', entry: ['not', 'an', 'object'], expect: /entry is not a JSON object/ },
];

let failures = 0;

// COVERAGE ASSERTION — the fix for the round-2 finding, at the class level.
//
// c3 asserts "one mutant per schema rule". Round-2 review found that claim was
// simply untrue: `status` was required by the validator and never mutated. A
// hand-maintained mutant list will drift from a hand-maintained rule list every
// time either changes, and nothing notices — the suite still reports OK.
//
// So the suite now DERIVES its obligation from the validator's own exported
// vocabularies instead of restating them. Add a required field or a vocabulary
// value and forget the mutant, and this fails immediately, naming the gap.
const covered = MUTANTS.map((m) => m.rule).join(' | ');

for (const field of REQUIRED_ALWAYS) {
  if (!new RegExp(`missing ${field}\\b`).test(covered)) {
    failures += 1;
    console.error(`FAIL coverage: REQUIRED_ALWAYS field "${field}" has no mutant — c3's "one mutant per rule" claim would be false`);
  }
}
for (const [name, vocab, marker] of [
  ['GAP_ACTIONS', GAP_ACTIONS, 'recommended_action off-vocabulary'],
  ['STATUSES', STATUSES, 'fourth status invented'],
  ['CONFIDENCES', CONFIDENCES, 'confidence off-vocabulary'],
]) {
  if (!Array.isArray(vocab) || vocab.length === 0) {
    failures += 1;
    console.error(`FAIL coverage: closed vocabulary ${name} is empty or missing from the validator`);
  }
  if (!covered.includes(marker)) {
    failures += 1;
    console.error(`FAIL coverage: closed vocabulary ${name} has no off-vocabulary mutant (expected one whose rule mentions "${marker}")`);
  }
}

// Property 0: the clean bases must PASS, or the suite proves nothing.
for (const [name, base] of [
  ['VERIFIED', BASE_VERIFIED],
  ['JUSTIFIED', BASE_JUSTIFIED],
  ['GAP', BASE_GAP],
]) {
  const v = validateEntry(base, 0);
  if (v.length !== 0) {
    failures += 1;
    console.error(`FAIL control: clean ${name} base entry was rejected — validator rejects everything`);
    for (const m of v) console.error(`    ${m}`);
  }
}

// Properties 1 and 2.
for (const m of MUTANTS) {
  const v = validateEntry(m.entry, 1);
  if (v.length === 0) {
    failures += 1;
    console.error(`FAIL mutant NOT rejected: ${m.rule}`);
    continue;
  }
  if (!v.some((msg) => m.expect.test(msg))) {
    failures += 1;
    console.error(`FAIL mutant rejected by the WRONG rule: ${m.rule}`);
    console.error(`    expected to match: ${m.expect}`);
    for (const msg of v) console.error(`    got: ${msg}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} control failure(s) across ${MUTANTS.length} mutants + 3 clean bases`);
  process.exit(1);
}
console.log(`OK negative control: ${MUTANTS.length} mutants each rejected by their own rule; 3 clean bases pass`);

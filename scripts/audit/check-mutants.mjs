#!/usr/bin/env node
/**
 * GP-567 c3 — NEGATIVE CONTROL for the Evidence Ledger validator.
 *
 * A validator that cannot fail turns every green into decoration. This mutates a
 * KNOWN-GOOD entry once per schema rule and asserts each mutant is rejected.
 *
 * Three properties, not one — the third is the one round 3 proved was missing:
 *   1. every mutant is rejected                    (the validator fires)
 *   2. every mutant is rejected BY ITS OWN RULE, identified by the validator's
 *      emitted RULE ID, not by a name this file chose — so a mutant cannot pass
 *      by tripping some unrelated check, and cannot pass by being named after a
 *      rule it does not actually trigger.
 *   3. every rule in the validator's registry is covered by some mutant, and was
 *      OBSERVED firing — so a rule cannot be uncovered by construction.
 *
 * It also asserts the clean base entries PASS, so the validator is not simply
 * rejecting everything — a validator that fails all input is as useless as one
 * that passes all input.
 *
 * ── Why this was rebuilt (round-3 review) ─────────────────────────────────
 *
 * The round-2 design derived coverage from four exported field lists and matched
 * mutant NAME strings with a regex. Independent review defeated it twice, by
 * running it, not by reading it:
 *
 *   (a) It deleted the real "quote over 25 words" mutant. The suite still printed
 *       OK with 26 mutants, because the quote / ISO-date / sidecar / feeds rules
 *       are not reachable from any of those four lists — uncovered BY
 *       CONSTRUCTION, which is the worst kind, because the count still looked
 *       healthy.
 *   (b) It kept a mutant named "missing status" while planting a dropped `id`.
 *       The suite still printed OK, because the coverage check read the NAME.
 *
 * A name is not evidence. So coverage is now computed from what the validator
 * actually emitted while processing each mutant, and the obligation is the
 * validator's own exported `RULES` registry. Adding a rule without a mutant is a
 * suite failure; naming a mutant after a rule it does not trigger is a suite
 * failure. Neither is satisfiable by naming.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateEntryRules, validateFileRules, RULES, ENTRY_RULES, FILE_RULES } from './validate-ledger.mjs';

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

// Each mutant declares the RULE ID it must trigger. `expect` additionally pins
// the message text, so a rule firing with the wrong wording is still caught.
const MUTANTS = [
  { rule: 'missing-required:id', name: 'missing id', entry: drop(BASE_VERIFIED, 'id'), expect: /missing required field "id"/ },
  { rule: 'missing-required:claim', name: 'missing claim', entry: drop(BASE_VERIFIED, 'claim'), expect: /missing required field "claim"/ },
  { rule: 'missing-required:claim_class', name: 'missing claim_class', entry: drop(BASE_VERIFIED, 'claim_class'), expect: /missing required field "claim_class"/ },
  { rule: 'missing-required:surface', name: 'missing surface', entry: drop(BASE_VERIFIED, 'surface'), expect: /missing required field "surface"/ },
  { rule: 'missing-required:feeds', name: 'missing feeds', entry: drop(BASE_VERIFIED, 'feeds'), expect: /missing required field "feeds"/ },
  { rule: 'missing-required:status', name: 'missing status', entry: drop(BASE_VERIFIED, 'status'), expect: /missing required field "status"/ },
  { rule: 'gap-action-not-in-set', name: 'GAP recommended_action off-vocabulary', entry: set(BASE_GAP, 'recommended_action', 'launder'), expect: /recommended_action "launder" is not one of/ },
  { rule: 'status-not-in-set', name: 'fourth status invented', entry: set(BASE_VERIFIED, 'status', 'PROBABLY_FINE'), expect: /there is no fourth state/ },
  { rule: 'conflict-as-status', name: 'CONFLICT smuggled in as status', entry: set(BASE_VERIFIED, 'status', 'CONFLICT'), expect: /CONFLICT is a sidecar field, never a status/ },
  { rule: 'verified-no-source-url', name: 'VERIFIED without source_url', entry: drop(BASE_VERIFIED, 'source_url'), expect: /VERIFIED requires source_url/ },
  { rule: 'verified-source-url-shape', name: 'VERIFIED source_url not a URL', entry: set(BASE_VERIFIED, 'source_url', 'I looked at it'), expect: /neither a URL nor a repo: path/ },
  { rule: 'verified-no-access-date', name: 'VERIFIED without access_date', entry: drop(BASE_VERIFIED, 'access_date'), expect: /VERIFIED requires access_date/ },
  { rule: 'verified-no-access-date', name: 'VERIFIED access_date not ISO', entry: set(BASE_VERIFIED, 'access_date', 'Sept 2026'), expect: /VERIFIED requires access_date as YYYY-MM-DD/ },
  { rule: 'verified-no-quote', name: 'VERIFIED without quote', entry: drop(BASE_VERIFIED, 'quote'), expect: /VERIFIED requires quote/ },
  {
    rule: 'verified-quote-too-long',
    name: 'VERIFIED quote over 25 words',
    entry: set(BASE_VERIFIED, 'quote', Array.from({ length: 26 }, (_, i) => `w${i}`).join(' ')),
    expect: /quote is 26 words, limit is 25/,
  },
  { rule: 'justified-no-confidence', name: 'JUSTIFIED without confidence', entry: drop(BASE_JUSTIFIED, 'confidence'), expect: /JUSTIFIED requires confidence/ },
  { rule: 'justified-confidence-not-in-set', name: 'JUSTIFIED confidence off-vocabulary', entry: set(BASE_JUSTIFIED, 'confidence', 'pretty sure'), expect: /confidence "pretty sure" is not one of/ },
  { rule: 'justified-no-reasoning', name: 'JUSTIFIED without reasoning', entry: drop(BASE_JUSTIFIED, 'reasoning'), expect: /JUSTIFIED requires reasoning/ },
  { rule: 'justified-no-best-source', name: 'JUSTIFIED without best_available_source', entry: drop(BASE_JUSTIFIED, 'best_available_source'), expect: /JUSTIFIED requires best_available_source/ },
  { rule: 'gap-no-reason', name: 'GAP without reason', entry: drop(BASE_GAP, 'reason'), expect: /GAP requires reason/ },
  { rule: 'gap-no-action', name: 'GAP without recommended_action', entry: drop(BASE_GAP, 'recommended_action'), expect: /GAP requires recommended_action/ },
  // Added in round 3. `conflict-not-object` was reachable in the validator and
  // had NO mutant — the exact "uncovered by construction" class the reviewer
  // demonstrated. The coverage assertion below now names such a rule rather
  // than letting the suite print OK around it.
  { rule: 'conflict-not-object', name: 'conflict sidecar is not an object', entry: set(BASE_VERIFIED, 'conflict', 'they disagreed'), expect: /conflict must be an object sidecar/ },
  { rule: 'conflict-no-engines', name: 'conflict sidecar missing engines', entry: set(BASE_VERIFIED, 'conflict', { disagreement: 'x' }), expect: /conflict requires engine_a and engine_b/ },
  { rule: 'conflict-no-disagreement', name: 'conflict sidecar missing disagreement', entry: set(BASE_VERIFIED, 'conflict', { engine_a: 'a', engine_b: 'b' }), expect: /conflict requires disagreement/ },
  {
    rule: 'conflict-overwrote-original',
    name: 'conflict overwrote the original',
    entry: set(BASE_VERIFIED, 'conflict', { engine_a: 'a', engine_b: 'b', disagreement: 'x', overwrote_original: true }),
    expect: /conflict must never overwrite the original claim/,
  },
  { rule: 'feeds-not-array', name: 'feeds not an array', entry: set(BASE_VERIFIED, 'feeds', 'catalogue'), expect: /feeds must be an array/ },
  { rule: 'check-by-not-iso', name: 'check_by not ISO', entry: set(BASE_VERIFIED, 'check_by', 'next year'), expect: /check_by must be YYYY-MM-DD/ },
  { rule: 'entry-not-object', name: 'entry is not an object', entry: ['not', 'an', 'object'], expect: /entry is not a JSON object/ },
];

// File-level mutants. validateFile can fail in ways no single entry can, and an
// unmutated rule set is exactly what hides behind a green suite.
const line = (o) => `${JSON.stringify(o)}\n`;
const FILE_MUTANTS = [
  { rule: 'file-missing', name: 'ledger file absent', write: null, expect: /missing ledger file/ },
  { rule: 'file-invalid-json', name: 'ledger line is not JSON', write: '{not json at all\n', expect: /invalid JSON/ },
  { rule: 'file-duplicate-id', name: 'two entries share an id', write: line(BASE_VERIFIED) + line(BASE_VERIFIED), expect: /duplicate id "mutant-base"/ },
  { rule: 'file-empty', name: 'ledger holds no entries', write: '\n\n', expect: /an empty ledger is not a clean ledger/ },
];

let failures = 0;
// Every rule id the validator was OBSERVED emitting across the whole suite.
// Coverage is computed from this, never from a mutant's declared name.
const observed = new Set();

// Property 0: the clean bases must PASS, or the suite proves nothing.
for (const [name, base] of [
  ['VERIFIED', BASE_VERIFIED],
  ['JUSTIFIED', BASE_JUSTIFIED],
  ['GAP', BASE_GAP],
]) {
  const v = validateEntryRules(base, 0);
  if (v.length !== 0) {
    failures += 1;
    console.error(`FAIL base ${name}: clean entry rejected — ${v.map((x) => x.message).join('; ')}`);
  }
}

// Properties 1 and 2: every mutant rejected, BY THE RULE IT DECLARES.
for (const m of MUTANTS) {
  if (!ENTRY_RULES.includes(m.rule)) {
    failures += 1;
    console.error(`FAIL mutant "${m.name}": declares rule "${m.rule}" which is not in the validator's ENTRY_RULES`);
    continue;
  }
  const v = validateEntryRules(m.entry, 1);
  for (const x of v) observed.add(x.rule);
  const hit = v.filter((x) => x.rule === m.rule);
  if (v.length === 0) {
    failures += 1;
    console.error(`FAIL mutant "${m.name}": validator ACCEPTED it — the rule "${m.rule}" does not fire`);
  } else if (hit.length === 0) {
    failures += 1;
    console.error(
      `FAIL mutant "${m.name}": rejected, but NOT by its declared rule "${m.rule}" — `
      + `the validator emitted [${v.map((x) => x.rule).join(', ')}]. `
      + 'The mutant is named after a rule it does not trigger.',
    );
  } else if (!hit.some((x) => m.expect.test(x.message))) {
    failures += 1;
    console.error(`FAIL mutant "${m.name}": rule "${m.rule}" fired with unexpected wording — ${hit.map((x) => x.message).join('; ')}`);
  }
}

// File-level mutants, run against a real file in a temp dir.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gp567-mutants-'));
try {
  for (const m of FILE_MUTANTS) {
    if (!FILE_RULES.includes(m.rule)) {
      failures += 1;
      console.error(`FAIL file mutant "${m.name}": declares rule "${m.rule}" which is not in the validator's FILE_RULES`);
      continue;
    }
    const f = path.join(tmp, 'ledger.jsonl');
    if (m.write === null) {
      if (fs.existsSync(f)) fs.rmSync(f);
    } else {
      fs.writeFileSync(f, m.write);
    }
    const r = validateFileRules(f);
    for (const x of r.violations) observed.add(x.rule);
    const hit = r.violations.filter((x) => x.rule === m.rule);
    if (hit.length === 0) {
      failures += 1;
      console.error(
        `FAIL file mutant "${m.name}": not rejected by its declared rule "${m.rule}" — `
        + `emitted [${r.violations.map((x) => x.rule).join(', ') || 'nothing'}]`,
      );
    } else if (!hit.some((x) => m.expect.test(x.message))) {
      failures += 1;
      console.error(`FAIL file mutant "${m.name}": rule "${m.rule}" fired with unexpected wording — ${hit.map((x) => x.message).join('; ')}`);
    }
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Property 3 — COVERAGE, derived from the validator's registry and checked
// against OBSERVED behaviour.
//
// This is the round-3 fix. The obligation comes from `RULES`, which the
// validator owns, and it is discharged only by a rule actually firing during
// this run. Delete a mutant and its rule stops being observed: named. Add a
// rule to the validator and nothing triggers it: named. Rename a mutant to
// claim a rule it does not plant and the per-mutant check above catches it,
// while the rule it was supposed to cover goes unobserved and is named here.
const uncovered = RULES.filter((r) => !observed.has(r));
if (uncovered.length) {
  failures += uncovered.length;
  for (const r of uncovered) {
    console.error(`FAIL coverage: rule "${r}" is in the validator's registry but no mutant made it fire — c3's "one mutant per schema rule" would be false`);
  }
}

if (failures) {
  console.error(`FAIL c3: ${failures} control failure(s)`);
  process.exit(1);
}
console.log(
  `OK negative control: ${MUTANTS.length} entry mutants + ${FILE_MUTANTS.length} file mutants, `
  + `each rejected by the rule it declares; all ${RULES.length} registry rules observed firing; 3 clean bases pass`,
);

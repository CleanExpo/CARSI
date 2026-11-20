#!/usr/bin/env node
/**
 * Gate 0 — course evidence ledger enforcement.
 *
 * "No verified evidence contract = no course generation" is only a rule if something refuses.
 * `scripts/audit/validate-ledger.mjs` already encodes the contract — every claim resolves to
 * exactly one of VERIFIED / JUSTIFIED / GAP, with the fields that status demands — and
 * `scripts/audit/check-mutants.mjs` already proves it can fail, rule by rule. Both existed
 * before this script and neither is reimplemented here.
 *
 * What was missing was reach and enforcement:
 *   - the validator defaults to docs/audit/evidence-ledger.jsonl (31 entries) and had to be
 *     pointed at a course ledger by hand, so the 1020 entries under data/courses/ were never
 *     checked by it;
 *   - nothing ran it in CI at all, so a malformed course ledger could merge.
 *
 * This script closes both: it discovers every evidence-ledger.jsonl under the course tree and
 * the audit ledger, runs the existing validator against each, and fails if any one fails.
 * It is a fan-out, not a second schema.
 *
 * Fail-closed: a ledger that cannot be read, or a tree with no ledgers at all, is a failure —
 * silence must never be mistaken for conformance.
 *
 *   Run:  node scripts/check-evidence-ledgers.mjs
 *   Test: node scripts/check-evidence-ledgers.test.mjs   (proves this fan-out can fail)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const VALIDATOR = 'scripts/audit/validate-ledger.mjs';
const DEFAULT_COURSE_ROOT = 'data/courses';
const COURSE_ROOT = process.argv[2] ?? DEFAULT_COURSE_ROOT;
const AUDIT_LEDGER = 'docs/audit/evidence-ledger.jsonl';
const LEDGER_NAME = 'evidence-ledger.jsonl';
// The audit ledger belongs to the repo's own default run, not to an arbitrary root. Appending
// it unconditionally let an EMPTY course tree pass, because that one always-present ledger
// rescued the count — the self-test caught exactly that, so the root argument now scans only
// what it was pointed at.
const SCANNING_REPO_DEFAULT = COURSE_ROOT === DEFAULT_COURSE_ROOT;

/** Every evidence-ledger.jsonl under a root, at any depth (courses nest under v1-draft/). */
function findLedgers(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name === LEDGER_NAME) out.push(path);
    }
  };
  walk(root);
  return out.sort();
}

const errors = [];
const err = (m) => errors.push(m);

if (!existsSync(VALIDATOR)) {
  err(`${VALIDATOR} is missing — Gate 0 cannot be enforced without the contract validator`);
}

const ledgers = findLedgers(COURSE_ROOT);
if (SCANNING_REPO_DEFAULT && existsSync(AUDIT_LEDGER)) ledgers.push(AUDIT_LEDGER);

if (ledgers.length === 0) {
  err(`no ${LEDGER_NAME} found under ${COURSE_ROOT} — Gate 0 must not pass on an empty tree`);
}

let entriesTotal = 0;
if (errors.length === 0) {
  for (const ledger of ledgers) {
    if (statSync(ledger).size === 0) {
      err(`${ledger}: is empty`);
      continue;
    }
    const run = spawnSync('node', [VALIDATOR, ledger], { encoding: 'utf8' });
    const out = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim();
    if (run.status !== 0) {
      err(`${ledger}:\n      ${out.split('\n').join('\n      ')}`);
      continue;
    }
    const count = out.match(/(\d+) entries/);
    if (count) entriesTotal += Number(count[1]);
    console.log(`  ok  ${ledger}${count ? ` — ${count[1]} entries` : ''}`);
  }
}

if (errors.length > 0) {
  console.error(`\nGate 0 evidence-ledger check FAILED (${errors.length} problem(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `\nGate 0 evidence-ledger check passed — ${ledgers.length} ledger(s), ${entriesTotal} entries, 0 violations.`
);

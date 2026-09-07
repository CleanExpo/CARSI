#!/usr/bin/env node
/**
 * GP-567 — runs every audit criterion and reports one line each.
 *
 * These criteria existed with no tracked runner: the only thing invoking them was
 * a shell script in a scratch directory belonging to one agent session, so on any
 * other machine — or after that session's job was cleaned up — nothing ran them at
 * all. A control nothing invokes reads as coverage while providing none.
 *
 * Exits non-zero if any criterion fails, so it is usable as a gate.
 *
 *   npm run audit:verify
 *
 * ── Why this file imports NOTHING from scripts/audit ──────────────────────
 *
 * It deliberately uses raw `spawnSync` instead of `runCapture` from
 * subprocess.mjs, even though that is the module this repo otherwise routes every
 * subprocess through, and even though duplicating the status branch here is
 * slightly redundant.
 *
 * The first draft did import it, and that was a real hole. This runner decides
 * whether each criterion passed by reading its exit status — including c11, whose
 * entire job is to test that same reader. Mutate `runCapture` to return
 * `{status: 0}` unconditionally and c11 goes RED, exactly as designed, but this
 * runner reads c11's result THROUGH the mutation, sees 0, and prints
 * "11 of 11 criteria pass". The gate greens over its own failing control.
 *
 * That is the "only thing checking the controller is the controller" failure. The
 * outermost gate must not depend on anything it gates, so the six lines below are
 * duplicated on purpose. Do not refactor them away.
 */
import { spawnSync } from 'node:child_process';

const CRITERIA = [
  ['c1-inventory', ['scripts/audit/check-inventory.mjs']],
  ['c2-ledger', ['scripts/audit/validate-ledger.mjs', 'docs/audit/evidence-ledger.jsonl']],
  ['c3-mutants', ['scripts/audit/check-mutants.mjs']],
  ['c4-batch', ['scripts/audit/check-batch.mjs', '20']],
  ['c5-currency', ['scripts/audit/check-currency-sweep.mjs']],
  ['c6-compliance', ['scripts/audit/check-compliance-sweep.mjs']],
  ['c7-skill', ['scripts/audit/check-skill.mjs']],
  ['c8-finding1', ['scripts/audit/check-finding-1.mjs']],
  ['c9-runrecord', ['scripts/audit/check-run-record.mjs']],
  ['c10-parity', ['scripts/audit/check-parity-matcher.mjs']],
  ['c11-failclosed', ['scripts/audit/check-fail-closed.mjs']],
];

let failed = 0;
for (const [id, args] of CRITERIA) {
  const r = spawnSync(process.execPath, args, {
    cwd: process.cwd(), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
  // A criterion that could not be RUN is not a criterion that passed. Anything
  // other than a real numeric exit status counts as a failure here.
  const ran = !r.error && !r.signal && typeof r.status === 'number';
  if (!ran || r.status !== 0) failed += 1;
  const why = r.error ? `could not run: ${r.error.message}`
    : r.signal ? `killed by signal ${r.signal}`
      : `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n')[0] || '';
  console.log(`${id.padEnd(16)} exit=${String(ran ? r.status : 'n/a').padEnd(3)} ${why.slice(0, 88)}`);
}

console.log('');
if (failed) {
  console.error(`FAIL: ${failed} of ${CRITERIA.length} criteria failed`);
  process.exit(1);
}
console.log(`OK: ${CRITERIA.length} of ${CRITERIA.length} criteria pass`);

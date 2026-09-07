#!/usr/bin/env node
/**
 * GP-567 — runs every audit criterion and reports one line each.
 *
 * These eleven checks existed with no tracked runner: the only thing invoking
 * them was a shell script in a scratch directory belonging to one agent session,
 * so on any other machine — or after that session's job was cleaned up — nothing
 * ran them at all. A control nothing invokes reads as coverage while providing
 * none, which is the same family of defect as the fail-open reader c11 exists to
 * catch: in both cases the green is real and means nothing.
 *
 * Exits non-zero if any criterion fails, so it is usable as a gate.
 *
 *   npm run audit:verify
 */
import { runCapture } from './subprocess.mjs';

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
  const r = runCapture(process.execPath, args, { cwd: process.cwd() });
  if (r.status !== 0) failed += 1;
  const first = `${r.stdout}${r.stderr}`.trim().split('\n')[0] || '';
  console.log(`${id.padEnd(16)} exit=${String(r.status).padEnd(3)} ${first.slice(0, 88)}`);
}

console.log('');
if (failed) {
  console.error(`FAIL: ${failed} of ${CRITERIA.length} criteria failed`);
  process.exit(1);
}
console.log(`OK: ${CRITERIA.length} of ${CRITERIA.length} criteria pass`);

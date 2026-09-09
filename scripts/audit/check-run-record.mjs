#!/usr/bin/env node
/** GP-567 c9 verifier — run record and lessons exist, with counts, deferrals and the next batch named. */
import fs from 'node:fs';

const fail = (m) => {
  console.error(`FAIL c9: ${m}`);
  process.exit(1);
};

for (const f of ['docs/audit/lessons.md', 'docs/audit/run-records/run-1.md']) {
  if (!fs.existsSync(f)) fail(`missing ${f}`);
}

const run = fs.readFileSync('docs/audit/run-records/run-1.md', 'utf8');

// Round-4 (gemini lane): this previously tested only that the WORDS "VERIFIED",
// "JUSTIFIED" and "GAP" appeared somewhere in the file, while failing with
// "does not report ledger counts by status" — a message advertising a check the
// code did not perform. Same defect class as round 2's GAP-vocabulary message,
// one file over. The counts are now re-derived from the ledger and compared
// against the numbers the run record publishes, so a stale table fails.
const led = fs.readFileSync('docs/audit/evidence-ledger.jsonl', 'utf8')
  .split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
const actual = {
  VERIFIED: led.filter((e) => e.status === 'VERIFIED').length,
  JUSTIFIED: led.filter((e) => e.status === 'JUSTIFIED').length,
  GAP: led.filter((e) => e.status === 'GAP').length,
  'CONFLICT sidecars': led.filter((e) => e.conflict).length,
};
const problems = [];
for (const [label, n] of Object.entries(actual)) {
  const m = run.match(new RegExp(`\\| ${label} \\| (\\d+) \\|`));
  if (!m) problems.push(`run record does not report a "${label}" count in a parseable table row`);
  else if (Number(m[1]) !== n) problems.push(`run record says ${label} = ${m[1]}, ledger holds ${n}`);
}
const totalM = run.match(/\| \*\*Total entries\*\* \| \*\*(\d+)\*\* \|/);
if (!totalM) problems.push('run record does not report a total entry count');
else if (Number(totalM[1]) !== led.length) {
  problems.push(`run record says ${totalM[1]} total entries, ledger holds ${led.length}`);
}
if (problems.length) fail(`${problems.length} count problem(s)\n  - ${problems.join('\n  - ')}`);
if (!/[Dd]eferred/.test(run)) fail('run record does not name what was deferred — the gap is the most important line');
if (!/[Nn]ext run/.test(run)) fail('run record does not name the next run\'s first batch');

const lessons = fs.readFileSync('docs/audit/lessons.md', 'utf8');
if (lessons.trim().split('\n').length < 5) fail('lessons.md is too thin to be a learning layer');

console.log('OK c9: run record carries counts, deferrals and the next batch; lessons appended');

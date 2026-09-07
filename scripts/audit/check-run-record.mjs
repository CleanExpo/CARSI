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
if (!/VERIFIED/.test(run) || !/JUSTIFIED/.test(run) || !/GAP/.test(run)) {
  fail('run record does not report ledger counts by status');
}
if (!/[Dd]eferred/.test(run)) fail('run record does not name what was deferred — the gap is the most important line');
if (!/[Nn]ext run/.test(run)) fail('run record does not name the next run\'s first batch');

const lessons = fs.readFileSync('docs/audit/lessons.md', 'utf8');
if (lessons.trim().split('\n').length < 5) fail('lessons.md is too thin to be a learning layer');

console.log('OK c9: run record carries counts, deferrals and the next batch; lessons appended');

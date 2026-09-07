#!/usr/bin/env node
/**
 * GP-567 c5 verifier — the currency sweep exists AND its headline count is
 * reproducible by re-running the scan, not merely present as prose.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILE = 'docs/audit/currency-sweep.md';
const fail = (m) => {
  console.error(`FAIL c5: ${m}`);
  process.exit(1);
};

if (!fs.existsSync(FILE)) fail(`missing ${FILE}`);
const md = fs.readFileSync(FILE, 'utf8');

const recorded = (label) => {
  const m = md.match(new RegExp(`\\| ${label} \\| (\\d+) \\|`));
  return m ? Number(m[1]) : null;
};

let raw = '';
try {
  raw = execFileSync(
    'git',
    // Identical pathspec to build-sweeps.mjs. The audit's own files cite
    // S500:2021 to describe the problem; counting them would measure this
    // document rather than the catalogue.
    [
      '--no-pager', 'grep', '-nI', '-E', 'S500[^0-9]{0,3}(20[0-9]{2})?', '--',
      '*.ts', '*.tsx', '*.mjs', '*.js', '*.json', '*.md',
      ':(exclude)docs/audit/*', ':(exclude)scripts/audit/*', ':(exclude).claude/skills/course-truth/*',
    ],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
} catch (e) {
  raw = e.stdout || '';
}
const lines = raw.split('\n').filter(Boolean);
const now2021 = lines.filter((l) => /S500[^0-9]{0,3}2021/.test(l)).length;

const rec2021 = recorded('Lines asserting the \\*\\*2021\\*\\* edition');
if (rec2021 === null) fail('sweep does not record a 2021-edition line count in a parseable table row');
if (rec2021 !== now2021) {
  fail(`sweep records ${rec2021} lines asserting S500:2021 but re-running the scan finds ${now2021} — the recorded number is not reproducible`);
}
if (!/## Reproduce/.test(md)) fail('sweep does not publish the command needed to reproduce it');

console.log(`OK c5: sweep reproducible — ${now2021} lines assert S500:2021, matching the record`);

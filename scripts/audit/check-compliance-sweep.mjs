#!/usr/bin/env node
/**
 * GP-567 c6 verifier — the compliance sweep exists, records the EXISTING guards,
 * carries raw-HTML evidence for the live finding, and modified no guard.
 */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const FILE = 'docs/audit/compliance-language-sweep.md';
const fail = (m) => {
  console.error(`FAIL c6: ${m}`);
  process.exit(1);
};

if (!fs.existsSync(FILE)) fail(`missing ${FILE}`);
const md = fs.readFileSync(FILE, 'utf8');

for (const g of ['check:iicrc-compliance', 'check:iicrc-terminology', 'check:cec', 'check:standards-claims']) {
  if (!md.includes(g)) fail(`sweep does not record the existing guard ${g}`);
}
if (!/IICRC CEC Accredited/.test(md)) fail('sweep carries no verbatim live-surface evidence');
if (!/NOT RUN/.test(md)) fail('sweep must state which guard did not run rather than implying full coverage');

// No guard may be modified by an audit run.
let changed = '';
try {
  changed = execFileSync('git', ['--no-pager', 'diff', '--name-only', 'origin/main', '--', 'scripts/'], { encoding: 'utf8' });
} catch (e) {
  changed = e.stdout || '';
}
const touchedGuards = changed
  .split('\n')
  .filter(Boolean)
  .filter((f) => /^scripts\/check-/.test(f));
if (touchedGuards.length) fail(`an audit run modified guard(s): ${touchedGuards.join(', ')}`);

console.log('OK c6: existing guards recorded, live evidence verbatim, no guard modified');

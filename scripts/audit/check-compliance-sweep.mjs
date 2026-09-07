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

const REQUIRED_GUARDS = [
  'check:iicrc-compliance',
  'check:iicrc-terminology',
  'check:cec',
  'check:cec-surfaces',
  'check:standards-claims',
  'check:designations',
  'check:au-english',
];
for (const g of REQUIRED_GUARDS) {
  if (!md.includes(g)) fail(`sweep does not record the existing guard ${g}`);
  // Every named guard must carry a recorded exit code — naming a guard without a
  // result is what lets a sweep imply coverage it never had.
  if (!new RegExp(`\\\`${g.replace(/[:]/g, '[:]')}\\\`[^|]*\\|\\s*\\d+\\s*\\|`).test(md)) {
    fail(`sweep names ${g} but records no exit code for it`);
  }
}
if (!/IICRC CEC Accredited/.test(md)) fail('sweep carries no verbatim live-surface evidence');
if (!/\*\*Coverage: \d+ of \d+ guards/.test(md)) {
  fail('sweep does not state explicit coverage — a sweep that lists passes without stating how many guards ran implies coverage it may not have');
}

// No guard may be modified by an audit run.
//
// Compared against the MERGE BASE, not `origin/main`'s tip. Diffing a moving
// reference attributes ITS changes to this branch: main gained 8 lines in
// `scripts/check-cec-surfaces.mjs` via PR #782 on 2026-09-07, and this check
// immediately reported "an audit run modified guard(s)" naming a file the audit
// had never opened. `git diff HEAD -- <that file>` was empty at the time, which
// is what proved the accusation false.
//
// A guard that names the wrong culprit is worse than one that stays silent: the
// next session would have gone looking for an edit that does not exist. The
// merge base isolates what THIS branch did, which is the only thing this check
// is entitled to make a claim about.
let changed = '';
try {
  const mergeBase = execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], { encoding: 'utf8' }).trim();
  changed = execFileSync('git', ['--no-pager', 'diff', '--name-only', mergeBase, '--', 'scripts/'], { encoding: 'utf8' });
} catch (e) {
  changed = e.stdout || '';
}
const touchedGuards = changed
  .split('\n')
  .filter(Boolean)
  .filter((f) => /^scripts\/check-/.test(f));
if (touchedGuards.length) fail(`an audit run modified guard(s): ${touchedGuards.join(', ')}`);

console.log('OK c6: existing guards recorded, live evidence verbatim, no guard modified');

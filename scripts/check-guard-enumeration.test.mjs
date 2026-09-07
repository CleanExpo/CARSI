#!/usr/bin/env node
/**
 * Class-level control: every repo guard must scan files that are NOT YET TRACKED by git.
 *
 * WHY THIS EXISTS. On 2026-09-07 an independent reviewer failed a release because
 * `check:iicrc-terminology` exited 1 on committed content that had exited 0 minutes earlier,
 * while the same bytes sat untracked. The guards enumerated with bare `git ls-files`, which
 * lists ONLY tracked files, so a newly written file was invisible and the guard exited 0
 * having scanned nothing. A clean result from a check that never ran is indistinguishable
 * from a clean result from a clean tree — and it is the failure mode nobody investigates,
 * because nobody audits good news.
 *
 * FIVE guards shared the defect, and it bit hardest exactly where it mattered most:
 *   - check:iicrc-compliance is the CEC fail-closed backstop, added after 22 of 25 catalogue
 *     courses rendered unapproved CEC hours. A NEW course file is untracked by definition
 *     until it is committed, so the backstop was blind to the case it exists for.
 *   - check:standards-claims exists because a false absence claim about IICRC S520 nearly
 *     published. Brand copy is drafted as a new file too.
 *   - check:au-english enforces a founder MUST ("every CARSI course is Australian-produced").
 *
 * This test closes the CLASS, not the five instances. A sixth guard that enumerates with
 * bare `git ls-files` fails HERE, at development time, rather than in a release review.
 *
 * Each case plants that guard's OWN documented blocking fixture, taken from its own
 * non-vacuity test, so a pass cannot come from a fixture the guard was never meant to catch.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const REPO = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();

/** Guard script, a probe path INSIDE its scan scope, and content it must reject. */
const CASES = [
  {
    script: 'check:iicrc-terminology',
    probe: 'app/__guard_probe__/page.tsx',
    // from check-iicrc-terminology.test.mjs MUST_BLOCK
    content: 'export const copy = "Get IICRC certified fast with CARSI";\n',
  },
  {
    script: 'check:iicrc-compliance',
    probe: 'app/__guard_probe__/cec-claim.tsx',
    // from check-iicrc-compliance.test.mjs MUST_BLOCK
    content: 'export const copy = "This course awards 4 IICRC CECs.";\n',
  },
  {
    script: 'check:standards-claims',
    probe: 'docs/marketing/__guard_probe__.md',
    // the 2026-07-15 incident sentence itself, from check-standards-claims.test.mjs
    content: 'S520 does not mention ozone or hydroxyl.\n',
  },
  {
    script: 'check:cec-surfaces',
    probe: 'src/lib/__guard_probe__/cec-read.ts',
    // aliased destructure of the raw column, from check-cec-surfaces.test.mjs MUST_BLOCK
    content: 'export function f(course: any) { const { cecHours: raw } = course; return raw; }\n',
  },
  {
    script: 'check:au-english',
    probe: 'data/seed/assessment-drafts/__guard_probe__.json',
    // three separate AU rules at once: US spelling x2 and US voltage
    content: JSON.stringify({
      question: 'Remove the mold using 110V equipment and check the fiberglass.',
    }) + '\n',
  },
];

let passed = 0;
const failures = [];

function runScript(script) {
  try {
    execSync(`npm run ${script}`, { cwd: REPO, stdio: 'pipe' });
    return 0;
  } catch (e) {
    return e.status ?? 1;
  }
}

function cleanup(abs) {
  try { rmSync(abs, { force: true }); } catch { /* best effort */ }
  const dir = dirname(abs);
  if (dir.includes('__guard_probe__')) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

for (const c of CASES) {
  const abs = join(REPO, c.probe);
  try {
    // PRECONDITION 1: green before the probe. A guard already failing for another reason
    // would look exactly like a guard catching our plant.
    const before = runScript(c.script);
    if (before !== 0) {
      failures.push(`${c.script}: NOT GREEN before the probe (exit ${before}) — control would be vacuous`);
      continue;
    }

    // PRECONDITION 2: do not overwrite anything real.
    if (existsSync(abs)) {
      failures.push(`${c.script}: probe path ${c.probe} already exists — refusing to overwrite`);
      continue;
    }

    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, c.content, 'utf8');

    // PRECONDITION 3: the probe must actually be UNTRACKED, or this proves nothing.
    const tracked = execSync(`git ls-files -- ${JSON.stringify(c.probe)}`, { cwd: REPO, encoding: 'utf8' }).trim();
    if (tracked !== '') {
      failures.push(`${c.script}: probe is TRACKED, so it says nothing about untracked files`);
      cleanup(abs);
      continue;
    }

    // THE ASSERTION.
    const after = runScript(c.script);
    if (after === 0) {
      failures.push(
        `${c.script}: exited 0 with an UNTRACKED violating file at ${c.probe}. ` +
        `It enumerates tracked files only and scanned nothing. ` +
        `Fix: \`git ls-files --cached --others --exclude-standard\`.`,
      );
    } else {
      passed += 1;
    }
  } finally {
    cleanup(abs);
  }
}

// NON-VACUITY: zero cases must fail, never silently pass over everything.
if (CASES.length === 0) {
  console.error('FAIL — no cases defined; this control would pass over everything.');
  process.exit(2);
}

if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} of ${CASES.length} guards are blind to untracked files:\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`OK — all ${passed} guards scan untracked files.`);

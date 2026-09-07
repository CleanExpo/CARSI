#!/usr/bin/env node
/**
 * GP-567 c11 — NEGATIVE CONTROL for the fail-closed subprocess reader.
 *
 * Round 10 defeated c6 by breaking the git invocation rather than by defeating
 * the check's logic. c6 caught the failure, substituted `e.stdout || ''`, found
 * no modified guards in that empty string, and printed OK while a real edit sat
 * in `scripts/check-cec-surfaces.mjs`.
 *
 * So this asserts the property directly: WHEN THE MEASUREMENT CANNOT BE TAKEN,
 * EVERY SCRIPT THAT TAKES IT MUST REFUSE TO RENDER A VERDICT.
 *
 * Note the negative case here is strictly STRONGER than the review's repro. The
 * review needed a planted guard edit plus a broken git; this needs only the
 * broken git, because "could not measure" must fail whether or not a guard was
 * actually modified. That also means this control mutates no file in the tree —
 * nothing to restore, so it cannot leave the repo dirty if it dies part-way.
 *
 * Three layers, because one would not be enough:
 *   1. the reader itself — including the ONE allowed non-zero, `git grep`'s
 *      exit 1 for "no matches", which must NOT throw, or the reader would be
 *      refusing everything and layer 2 would prove nothing
 *   2. each verifier end-to-end under a stub `git` that exits 128 — asserting
 *      the exit is non-zero AND that the message names the measurement that
 *      could not be taken, not merely that something went wrong
 *   3. the generator — which must die before writing, so a broken git can never
 *      publish a sweep full of zeroes for a verifier to then agree with
 *
 * The positive control for layers 1 and 2 is the same scripts under the real
 * `git`, asserted here: a control whose subjects fail under every condition
 * discriminates nothing.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { run, runCapture, SubprocessFailure } from './subprocess.mjs';
import { parseLdBlocks, LdParseFailure } from './parse-ld.mjs';

const ROOT = process.cwd();
let failures = 0;
const bad = (m) => {
  failures += 1;
  console.error(`FAIL c11: ${m}`);
};

// ---------- layer 1: the reader ---------------------------------------------

const expectThrow = (name, fn, re) => {
  let threw = null;
  try {
    fn();
  } catch (e) {
    threw = e;
  }
  if (threw === null) return bad(`${name}: returned a value where it must have thrown`);
  if (!(threw instanceof SubprocessFailure)) {
    return bad(`${name}: threw ${threw.name}, not SubprocessFailure — callers catch on type`);
  }
  if (!re.test(threw.message)) {
    return bad(`${name}: threw with "${threw.message}", which does not name the failure (${re})`);
  }
  return undefined;
};

expectThrow('non-zero exit', () => run('sh', ['-c', 'echo out; echo err >&2; exit 1']), /exited 1: err/);
expectThrow('exit 128', () => run('sh', ['-c', 'echo boom >&2; exit 128']), /exited 128: boom/);
expectThrow('absent binary', () => run('gp567-no-such-binary', []), /could not be run/);
expectThrow('signal death', () => run('sh', ['-c', 'kill -9 $$']), /killed by signal/);
expectThrow('over maxBuffer', () => run('sh', ['-c', 'yes | head -c 100000'], { maxBuffer: 16 }), /could not be run/);
expectThrow('runCapture absent binary', () => runCapture('gp567-no-such-binary', []), /could not be run/);

// Positive controls for the reader. Without these it could be throwing on
// everything, and every case above would pass while measuring nothing.
try {
  const out = run('sh', ['-c', 'echo measured']);
  if (out.trim() !== 'measured') bad(`reader: a successful command returned "${out.trim()}"`);
} catch (e) {
  bad(`reader: threw on a successful command — ${e.message}`);
}
try {
  // The single documented allowance: `git grep` exits 1 to mean "no matches",
  // which is a real, successful, empty measurement. This is the exact option
  // shape both S500 scan sites pass, so it is the positive control for them.
  const out = run('sh', ['-c', 'exit 1'], { allowedExits: [0, 1] });
  if (out !== '') bad(`reader: allowed non-zero returned "${out}" rather than empty`);
} catch (e) {
  bad(`reader: threw on an ALLOWED non-zero exit — git grep's "no matches" would fail closed wrongly (${e.message})`);
}
try {
  // runCapture's whole purpose: a guard's non-zero exit is the datum, not an error.
  const r = runCapture('sh', ['-c', 'echo verdict; exit 3']);
  if (r.status !== 3) bad(`runCapture: recorded exit ${r.status}, not the real 3`);
  if (r.stdout.trim() !== 'verdict') bad('runCapture: lost the guard output it exists to record');
} catch (e) {
  bad(`runCapture: threw on a real non-zero exit — it would refuse to record any failing guard (${e.message})`);
}

// ---------- the stub git ----------------------------------------------------

const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gp567-failclosed-'));
fs.writeFileSync(
  path.join(stubDir, 'git'),
  '#!/bin/sh\necho "fatal: not a git repository (or any of the parent directories): .git" >&2\nexit 128\n',
);
fs.chmodSync(path.join(stubDir, 'git'), 0o755);
const brokenGitPath = `${stubDir}:${process.env.PATH}`;

const spawnScript = (script, env) => spawnSync(
  process.execPath,
  [path.join('scripts/audit', script)],
  { cwd: ROOT, encoding: 'utf8', env, maxBuffer: 32 * 1024 * 1024 },
);

// ---------- layer 2: the verifiers, end to end ------------------------------

const SUBJECTS = [
  {
    script: 'check-compliance-sweep.mjs',
    // The message must name the measurement that could not be taken. "Something
    // failed" would let the next regression hide behind a generic error.
    names: /could not measure whether a guard was modified/,
  },
  {
    script: 'check-currency-sweep.mjs',
    names: /could not re-run the S500 scan/,
  },
];

for (const { script, names } of SUBJECTS) {
  const r = spawnScript(script, { ...process.env, PATH: brokenGitPath });
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  if (r.status === 0) {
    bad(`${script} exited 0 with git broken — it rendered a verdict on a measurement it could not take`);
  }
  if (!names.test(output)) {
    bad(`${script} failed, but its message does not name the unmeasurable thing (${names}) — got: ${output.trim().split('\n')[0]}`);
  }
  if (!/exited 128/.test(output)) {
    bad(`${script} failed without reporting the underlying exit status — the next reader cannot tell why`);
  }

  // Positive control: the same script, same everything, real git.
  const ok = spawnScript(script, process.env);
  if (ok.status !== 0) {
    bad(`${script} does not pass under a WORKING git (exit ${ok.status}) — the failure above proves nothing`);
  }
}

// ---------- layer 3: the generator must die before it writes ----------------

// build-sweeps.mjs reads git at the top and writes docs/audit/*.md at the
// bottom. Under a broken git it must not reach the writes: a sweep recording 0
// for every count is the artefact c5 would then re-scan, get 0, and agree with.
const before = runCapture('git', ['status', '--porcelain'], { cwd: ROOT });
const gen = spawnScript('build-sweeps.mjs', { ...process.env, PATH: brokenGitPath });
const genOut = `${gen.stdout || ''}${gen.stderr || ''}`;
if (gen.status === 0) {
  bad('build-sweeps.mjs exited 0 with git broken — it would publish a sweep of zeroes');
}
if (!/SubprocessFailure/.test(genOut) || !/exited 128/.test(genOut)) {
  bad(`build-sweeps.mjs failed for an unnamed reason — got: ${genOut.trim().split('\n')[0]}`);
}
const after = runCapture('git', ['status', '--porcelain'], { cwd: ROOT });
if (before.stdout !== after.stdout) {
  bad('build-sweeps.mjs modified the tree before failing — a partial sweep is a published measurement');
}

fs.rmSync(stubDir, { recursive: true, force: true });

// ---------- layer 4: the outermost gate must not depend on what it gates ----
//
// verify-all.mjs decides whether each criterion passed by reading its exit
// status — including THIS file, whose job is to test the subprocess reader. If
// the runner read those statuses through `runCapture`, mutating `runCapture` to
// return {status: 0} would turn c11 red while the runner still printed
// "11 of 11 criteria pass": the gate greening over its own failing control.
//
// This is checked STATICALLY because it is a property of the source, not of a
// run: the runner must import nothing from the tree it gates. c11 cannot simply
// execute verify-all.mjs to test it — verify-all runs c11, so that recurses.
const runnerSrc = fs.readFileSync(path.join(ROOT, 'scripts/audit/verify-all.mjs'), 'utf8');
const relImports = [...runnerSrc.matchAll(/^\s*import\s[^;]*?from\s+['"](\.[^'"]*)['"]/gm)].map((m) => m[1]);
if (relImports.length) {
  bad(
    `verify-all.mjs imports ${relImports.join(', ')} from the tree it gates — `
    + 'a mutated reader would let the runner report a pass over its own failing control',
  );
}

// ---------- layer 5: the JSON-LD reader -------------------------------------
//
// Same class as the subprocess swallow, different mechanism. The generator used
// `catch { return null }` then `.filter(Boolean)`, so an unparseable ItemList
// block emptied ldCourses and every course silently lost its live name, price
// and availability — while c1 still passed, because row count comes from the
// sitemap, not the JSON-LD.
const LD_OK = '<script type="application/ld+json">{"@type":"ItemList","itemListElement":[]}</script>';
try {
  const blocks = parseLdBlocks(`<html>${LD_OK}</html>`);
  if (blocks.length !== 1 || blocks[0]['@type'] !== 'ItemList') {
    bad(`parseLdBlocks: a valid block parsed to ${JSON.stringify(blocks)}`);
  }
} catch (e) {
  bad(`parseLdBlocks: threw on a VALID block — it would refuse every snapshot (${e.message})`);
}
try {
  // A page with no JSON-LD at all is a real, observable measurement, not a
  // failure. Without this the reader could be throwing on everything.
  const blocks = parseLdBlocks('<html><body>no structured data here</body></html>');
  if (blocks.length !== 0) bad(`parseLdBlocks: found ${blocks.length} blocks in a page with none`);
} catch (e) {
  bad(`parseLdBlocks: threw on a page with no JSON-LD, which is not a failure (${e.message})`);
}

// Round-12 P1. The first fix threw on a bad block but FOUND blocks with a regex
// that only matched a double-quoted, whitespace-free `type`. Every spelling below
// is valid HTML for the same element, and each was previously read as "no block
// present" rather than as a parse failure — the silent-empty class one layer down.
//
// Each case carries an UNPARSEABLE body, so the only correct outcome is a throw.
// A spelling that goes unrecognised returns [] instead, and this catches it.
const BAD_BODY = '{"@type":';
const SPELLINGS = [
  ['double-quoted (the only one the old regex saw)', `<script type="application/ld+json">${BAD_BODY}</script>`],
  ['single-quoted', `<script type='application/ld+json'>${BAD_BODY}</script>`],
  ['whitespace around =', `<script type = "application/ld+json">${BAD_BODY}</script>`],
  ['unquoted value', `<script type=application/ld+json>${BAD_BODY}</script>`],
  ['uppercase attribute and MIME', `<SCRIPT TYPE="APPLICATION/LD+JSON">${BAD_BODY}</SCRIPT>`],
  ['charset parameter', `<script type="application/ld+json; charset=utf-8">${BAD_BODY}</script>`],
  ['type after another attribute', `<script id="x" data-a="b" type="application/ld+json">${BAD_BODY}</script>`],
  ['newline inside the tag', `<script\n  type="application/ld+json"\n>${BAD_BODY}</script>`],
];
for (const [name, html] of SPELLINGS) {
  let threw = null;
  try {
    parseLdBlocks(`<html><body>${html}</body></html>`);
  } catch (e) {
    threw = e;
  }
  if (threw === null) {
    bad(`parseLdBlocks: ${name} — an unparseable block was NOT seen at all, so it read as absent rather than broken`);
  } else if (!(threw instanceof LdParseFailure)) {
    bad(`parseLdBlocks: ${name} — threw ${threw.name}, not LdParseFailure`);
  }
}

// A <script> with no type is JavaScript per the HTML spec, not JSON-LD. Treating
// it as LD would make the reader throw on ordinary pages, so this is the negative
// half: the classifier must discriminate, not just say yes.
try {
  const blocks = parseLdBlocks('<html><script>var x = {broken:</script></html>');
  if (blocks.length !== 0) bad(`parseLdBlocks: treated a plain <script> as JSON-LD (${blocks.length} blocks)`);
} catch (e) {
  bad(`parseLdBlocks: threw on a plain JavaScript <script>, which is not JSON-LD (${e.message})`);
}

// Names WHICH block failed, so a multi-block page points at the right one.
{
  let threw = null;
  try {
    parseLdBlocks(`<html>${LD_OK}<script type="application/ld+json">${BAD_BODY}</script></html>`);
  } catch (e) {
    threw = e;
  }
  if (threw === null) {
    bad('parseLdBlocks: accepted an UNPARSEABLE block — a silent drop empties ldCourses while c1 still passes');
  } else if (!/block 2 of 2 does not parse/.test(threw.message)) {
    bad(`parseLdBlocks: did not name WHICH block failed — got: ${threw.message.slice(0, 80)}`);
  }
}

if (failures) {
  console.error(`FAIL c11: ${failures} control failure(s)`);
  process.exit(1);
}
console.log(
  `OK c11: reader refuses ${6} unmeasurable cases and permits the 1 documented empty (git grep exit 1); `
  + `${SUBJECTS.length} verifiers fail closed under a broken git and pass under a working one; `
  + 'generator dies before writing, tree unchanged; runner imports nothing it gates; '
  + `JSON-LD reader refuses a broken block in all ${SPELLINGS.length} valid spellings of the type `
  + 'attribute, permits a page with none, and does not mistake plain JavaScript for JSON-LD',
);

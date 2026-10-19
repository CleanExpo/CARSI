#!/usr/bin/env node
/**
 * Non-vacuity test for scripts/lib/is-entry-point.mjs.
 *
 * Node resolves symlinks for the main module, so import.meta.url holds the real path while
 * process.argv[1] keeps the path the caller typed. The old idiom, comparing import.meta.url
 * with pathToFileURL(process.argv[1]).href, is therefore false whenever a guard
 * is run through a symlink (/tmp -> /private/tmp on macOS, a symlinked checkout or scripts
 * dir), the CLI body never runs, and the guard exits 0 having reported nothing.
 *
 * The planted cases run two CI guards, one per broken idiom (check-iicrc-terminology and
 * check-iicrc-compliance), through a symlinked scripts directory on a tree that contains a
 * banned phrase, and require exit 1.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const scriptsDir = resolve('scripts');
const dir = mkdtempSync(join(tmpdir(), 'entry-point-'));

/** Exit status of `node <script>` run from the planted tree. */
function run(script) {
  try {
    execFileSync(process.execPath, [script], { cwd: dir, stdio: 'pipe' });
    return 0;
  } catch (e) {
    return e.status;
  }
}

try {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  mkdirSync(join(dir, 'app'), { recursive: true });
  // From check-iicrc-terminology.test.mjs MUST_BLOCK.
  writeFileSync(
    join(dir, 'app/page.tsx'),
    'export const copy = "Get IICRC certified fast with CARSI";\n'
  );
  const link = join(dir, 'linked-scripts');
  symlinkSync(scriptsDir, link);

  // Positive control: through the real path the planted phrase is caught, so a 0 below can
  // only mean the CLI body was skipped.
  assert.equal(
    run(join(scriptsDir, 'check-iicrc-terminology.mjs')),
    1,
    'planted violation must fail via the real path'
  );
  assert.equal(
    run(join(link, 'check-iicrc-terminology.mjs')),
    1,
    'check-iicrc-terminology run through a symlinked path must exit 1 on a planted violation'
  );

  // The CEC backstop used the fileURLToPath(import.meta.url) === argv[1] form of the same
  // defect. From check-iicrc-compliance.test.mjs MUST_BLOCK.
  writeFileSync(
    join(dir, 'app/cec-claim.tsx'),
    'export const copy = "This course awards 4 IICRC CECs.";\n'
  );
  assert.equal(
    run(join(scriptsDir, 'check-iicrc-compliance.mjs')),
    1,
    'planted CEC claim must fail via the real path'
  );
  assert.equal(
    run(join(link, 'check-iicrc-compliance.mjs')),
    1,
    'check-iicrc-compliance run through a symlinked path must exit 1 on a planted violation'
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// Helper cases.
const { isEntryPoint } = await import(
  pathToFileURL(join(scriptsDir, 'lib/is-entry-point.mjs')).href
);
const here = join(scriptsDir, 'lib/is-entry-point.mjs');
const url = pathToFileURL(here).href;
assert.equal(isEntryPoint(url, here), true, 'same path is the entry point');
assert.equal(
  isEntryPoint(url, join(scriptsDir, 'lib', '..', 'lib', 'is-entry-point.mjs')),
  true,
  'un-normalised path resolves'
);
assert.equal(
  isEntryPoint(url, join(scriptsDir, 'check-iicrc-terminology.mjs')),
  false,
  'a different script is not'
);
assert.equal(isEntryPoint(url, undefined), false, 'no argv[1] (REPL, -e) is not');
assert.equal(
  isEntryPoint(url, join(scriptsDir, 'no-such-file.mjs')),
  false,
  'a missing path is not, and does not throw'
);

console.log(
  'is-entry-point: both symlinked guard runs failed on their planted violations; helper cases passed'
);

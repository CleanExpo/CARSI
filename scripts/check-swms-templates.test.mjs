#!/usr/bin/env node
/**
 * Non-vacuity proof for the SWMS template guard.
 *
 * A guard's silence is not a pass. This plants each kind of leak the guard exists to catch —
 * an identifying name, a contact detail, an IICRC/CEC reference — inside a deflate-compressed
 * PDF content stream, the same way real PDF text is stored, and asserts the guard exits
 * non-zero and names what it found.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const GUARD = 'scripts/check-swms-templates.mjs';
const LIBRARY = 'public/downloads/swms';

/** A minimal PDF whose page text lives in a deflate-compressed stream, as a real one does. */
function pdfWithText(text) {
  const stream = deflateSync(Buffer.from(`BT /F1 9 Tf 72 700 Td (${text}) Tj ET\n`, 'latin1'));
  return Buffer.concat([
    Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Length ' + stream.length + ' /Filter /FlateDecode >>\nstream\n',
      'latin1'
    ),
    stream,
    Buffer.from('\nendstream\nendobj\n%%EOF\n', 'latin1'),
  ]);
}

function runGuard(dir) {
  const r = spawnSync('node', [GUARD, dir], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

/** Guard against one planted document; the manifest-parity errors are expected noise here. */
function runOnPlanted(text) {
  const dir = mkdtempSync(join(tmpdir(), 'swms-guard-'));
  try {
    writeFileSync(join(dir, 'swms-planted.pdf'), pdfWithText(text));
    return runGuard(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const cases = [
  [
    'company name in a compressed stream',
    'Company name: Disaster Recovery QLD',
    /identifying string "Disaster Recovery"/,
  ],
  ['a signer name', 'Worker: Jye Diesing', /identifying string "Diesing"/],
  ['a street address', '4/17 Tile St, Wacol QLD 4076', /identifying string "Wacol"/],
  ['an ABN value', 'ABN: 11 222 333 444', /contains an ABN value/],
  ['a landline', 'Phone number: 07 3879 4677', /identifying string "3879 4677"/],
  ['an unseen landline', 'Phone number: 02 9999 1234', /contains a phone number/],
  ['a mobile', 'Contact: 0412 345 678', /contains a mobile number/],
  ['an email address', 'Email: office@example.com.au', /contains an email address/],
  ['a website', 'Web: www.example.com.au', /contains a website/],
  ['an IICRC reference', 'Aligned to the IICRC S500 standard', /contains an IICRC reference/],
  ['a CEC claim', 'This SWMS is worth 2 CEC hours', /contains a CEC reference/],
];

let failed = 0;

for (const [name, planted, expected] of cases) {
  const { code, out } = runOnPlanted(planted);
  if (code === 0) {
    console.error(`✖ ${name}: guard exited 0 — it did not see the planted leak.`);
    failed++;
  } else if (!expected.test(out)) {
    console.error(`✖ ${name}: guard failed, but not for the planted reason.\n    ${out.trim()}`);
    failed++;
  }
}

// An empty library must fail rather than pass silently.
const emptyDir = mkdtempSync(join(tmpdir(), 'swms-guard-empty-'));
const empty = runGuard(emptyDir);
rmSync(emptyDir, { recursive: true, force: true });
if (empty.code === 0 || !/no PDFs/.test(empty.out)) {
  console.error(
    `✖ empty library: expected a failure naming the empty directory, got:\n    ${empty.out.trim()}`
  );
  failed++;
}

// And the published library must actually pass — the other half of non-vacuity, proving the
// rules do not simply reject everything. Reported as NOT RUN, never as a pass, when the PDFs
// are absent: the guard itself still fails closed on an empty library (asserted above).
let libraryCount = 0;
try {
  libraryCount = readdirSync(LIBRARY).filter((f) => f.toLowerCase().endsWith('.pdf')).length;
} catch {
  libraryCount = 0;
}
let realChecked = false;
if (libraryCount > 0) {
  const real = runGuard(LIBRARY);
  realChecked = true;
  if (real.code !== 0) {
    console.error(`✖ published library: guard failed against ${LIBRARY}:\n    ${real.out.trim()}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n✖ SWMS template guard self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(`✓ SWMS template guard self-test passed (${cases.length + 1} negative cases).`);
if (!realChecked) {
  console.log(
    `  NOT RUN: the positive control against ${LIBRARY} — no PDFs are present there yet, ` +
      `so "the real templates pass" is unproven. The guard still fails closed on the empty library.`
  );
}
process.exit(0);

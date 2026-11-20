#!/usr/bin/env node
/**
 * Non-vacuity proof for the Gate 0 evidence-ledger fan-out.
 *
 * check-mutants.mjs already proves the underlying validator fails rule by rule. What is proved
 * here is the layer this script adds: that a bad ledger ANYWHERE in the tree fails the run, that
 * an empty tree fails rather than passing silently, and that a clean tree still passes — the
 * last being what stops the check from being satisfied by rejecting everything.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHECK = 'scripts/check-evidence-ledgers.mjs';

/** A minimal conforming entry: VERIFIED needs source_url + access_date + a short quote. */
const goodEntry = (id) =>
  JSON.stringify({
    id,
    claim: 'Mains voltage in Australia is 230 V nominal.',
    claim_class: 'electrical',
    surface: 'lesson-1',
    status: 'VERIFIED',
    feeds: ['lesson-1'],
    part: 'requirement',
    lesson_id: 'lesson-1',
    evidence_grade: 'A1',
    source_url: 'https://www.legislation.gov.au/example',
    access_date: '2026-11-20',
    quote: 'Nominal supply voltage is 230 V.',
  });

/** VERIFIED with no source_url/access_date/quote — the contract's central violation. */
const badEntry = (id) =>
  JSON.stringify({
    id,
    claim: 'Something asserted with no primary source at all.',
    claim_class: 'safety-threshold',
    surface: 'lesson-2',
    status: 'VERIFIED',
    feeds: ['lesson-2'],
    part: 'requirement',
    lesson_id: 'lesson-2',
  });

function run(root) {
  const r = spawnSync('node', [CHECK, root], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function tree(spec) {
  const dir = mkdtempSync(join(tmpdir(), 'gate0-'));
  for (const [rel, lines] of Object.entries(spec)) {
    const full = join(dir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, lines.join('\n') + '\n');
  }
  return dir;
}

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) {
    console.error(`✖ ${name}${detail ? `\n    ${detail.trim()}` : ''}`);
    failed++;
  }
};

// 1. A clean tree passes — the positive control.
{
  const dir = tree({ 'a/evidence/evidence-ledger.jsonl': [goodEntry('c-1'), goodEntry('c-2')] });
  const { code, out } = run(dir);
  rmSync(dir, { recursive: true, force: true });
  check('clean tree passes', code === 0, out);
}

// 2. A bad entry in the ONLY ledger fails.
{
  const dir = tree({ 'a/evidence/evidence-ledger.jsonl': [badEntry('b-1')] });
  const { code, out } = run(dir);
  rmSync(dir, { recursive: true, force: true });
  check('bad ledger fails', code !== 0, out);
}

// 3. A bad entry in ONE of several ledgers still fails the whole run — the fan-out's real job.
{
  const dir = tree({
    'a/evidence/evidence-ledger.jsonl': [goodEntry('c-1')],
    'b/v1-draft/evidence/evidence-ledger.jsonl': [goodEntry('c-2')],
    'c/v1-draft/evidence/evidence-ledger.jsonl': [goodEntry('c-3'), badEntry('b-9')],
  });
  const { code, out } = run(dir);
  rmSync(dir, { recursive: true, force: true });
  check('one bad ledger among many fails the run', code !== 0, out);
  check('failure names the offending ledger', /c\/v1-draft/.test(out), out);
}

// 4. A nested ledger is discovered at all — a walker that missed v1-draft/ would pass vacuously.
{
  const dir = tree({ 'deep/v1-draft/evidence/evidence-ledger.jsonl': [badEntry('b-2')] });
  const { code } = run(dir);
  rmSync(dir, { recursive: true, force: true });
  check('nested ledger is discovered and checked', code !== 0);
}

// 5. An empty tree fails rather than passing silently.
{
  const dir = mkdtempSync(join(tmpdir(), 'gate0-empty-'));
  const { code, out } = run(dir);
  rmSync(dir, { recursive: true, force: true });
  check('empty tree fails', code !== 0 && /no evidence-ledger\.jsonl found/.test(out), out);
}

// 6. An empty ledger file fails.
{
  const dir = tree({ 'a/evidence/evidence-ledger.jsonl': [] });
  const { code } = run(dir);
  rmSync(dir, { recursive: true, force: true });
  check('empty ledger file fails', code !== 0);
}

if (failed > 0) {
  console.error(`\n✖ Gate 0 fan-out self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log('✓ Gate 0 fan-out self-test passed (7 assertions: 1 positive control, 6 negative).');
process.exit(0);

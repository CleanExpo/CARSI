// Guard test for scripts/media-workflow-args.sh (generate-course-media.yml "Build script
// arguments"). A slug or limit carrying a newline must be refused: a line-based check let
// "good-course\nphase=--persist=db" through and forged a second phase line in GITHUB_OUTPUT
// (independent review of b88e63d8, P1). Run: node --test scripts/media-workflow-args.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'media-workflow-args.sh');

function run(env) {
  const out = join(mkdtempSync(join(tmpdir(), 'media-args-')), 'output');
  writeFileSync(out, '');
  const r = spawnSync('bash', [script], {
    env: { PATH: process.env.PATH, GITHUB_OUTPUT: out, ...env },
    encoding: 'utf8',
  });
  return { code: r.status, log: `${r.stdout}${r.stderr}`, output: readFileSync(out, 'utf8') };
}

test('valid slug and limit produce exactly one phase and one extra line', () => {
  const r = run({ INPUT_MODE: 'generate', INPUT_SLUG: 'mould-remediation-fundamentals', INPUT_LIMIT: '5' });
  assert.equal(r.code, 0, r.log);
  assert.equal(r.output, 'phase=--generate --yes --persist=seed\nextra= --slug=mould-remediation-fundamentals --limit=5\n');
});

test('blank slug and limit are allowed', () => {
  const r = run({ INPUT_MODE: 'dry-run', INPUT_SLUG: '', INPUT_LIMIT: '' });
  assert.equal(r.code, 0, r.log);
  assert.equal(r.output, 'phase=--generate --dry-run\nextra=\n');
});

for (const [name, env] of [
  ['multiline slug', { INPUT_SLUG: 'good-course\nphase=--generate --yes --persist=db' }],
  ['multiline limit', { INPUT_LIMIT: '12\nphase=--generate --yes --persist=db' }],
  ['carriage return in slug', { INPUT_SLUG: 'good-course\rx' }],
  ['shell metacharacters in slug', { INPUT_SLUG: 'a;touch /tmp/x' }],
  ['trailing newline in slug', { INPUT_SLUG: 'good-course\n' }],
  ['non-numeric limit', { INPUT_LIMIT: '5 --persist=db' }],
]) {
  test(`refuses ${name} and writes nothing`, () => {
    const r = run({ INPUT_MODE: 'generate', INPUT_SLUG: '', INPUT_LIMIT: '', ...env });
    assert.equal(r.code, 1, r.log);
    assert.equal(r.output, '');
    assert.match(r.log, /::error::/);
  });
}

test('unknown mode is refused', () => {
  const r = run({ INPUT_MODE: 'generate\nphase=x' });
  assert.equal(r.code, 1, r.log);
  assert.equal(r.output, '');
});

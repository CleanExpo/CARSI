// Guard test for scripts/seed-courses-catalog.ts: a seed with no course slug must be refused
// unless --all is given, because a whole-catalogue seed deletes learner lesson progress for
// every course (deleteCourseCurriculum). npm drops a bare `--slug=x` that is not after `--`,
// so a slugless run is an easy mistake. Run: node --test scripts/seed-courses-catalog.refuse.test.mjs
//
// No database is touched: DATABASE_URL points at an unresolvable host, and the refusal must
// fire before any database access. The --all case unsets DATABASE_URL and expects the
// script's own "DATABASE_URL is not set." exit, proving --all passes the refusal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// `node --import tsx` loads TypeScript in-process. The tsx CLI wrapper instead opens an IPC
// socket under TMPDIR, which fails (EINVAL) when TMPDIR is a long path, as in review sandboxes.
const script = join(root, 'scripts', 'seed-courses-catalog.ts');
const UNREACHABLE = 'postgresql://refuse-test:x@refuse-test.invalid:1/none';

function run(args, env) {
  const base = { ...process.env };
  delete base.DATABASE_URL;
  delete base.SEED_COURSE_SLUG;
  const r = spawnSync(process.execPath, ['--import', 'tsx', script, ...args], {
    cwd: root,
    env: { ...base, ...env },
    encoding: 'utf8',
    timeout: 60_000,
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

test('no slug and no --all is refused before any database access', () => {
  const r = run([], { DATABASE_URL: UNREACHABLE });
  assert.equal(r.code, 1);
  assert.match(r.out, /refusing: no --slug/);
  assert.doesNotMatch(r.out, /Seeded course|refuse-test\.invalid/);
});

test('blank --slug= is refused', () => {
  const r = run(['--slug= '], { DATABASE_URL: UNREACHABLE });
  assert.equal(r.code, 1);
  assert.match(r.out, /refusing: blank --slug/);
});

test('blank SEED_COURSE_SLUG is refused', () => {
  const r = run([], { DATABASE_URL: UNREACHABLE, SEED_COURSE_SLUG: '   ' });
  assert.equal(r.code, 1);
  assert.match(r.out, /refusing: blank SEED_COURSE_SLUG/);
});

test('--all passes the refusal (stops at the missing DATABASE_URL instead)', () => {
  const r = run(['--all'], {});
  assert.equal(r.code, 1);
  assert.match(r.out, /DATABASE_URL is not set\./);
  assert.doesNotMatch(r.out, /refusing:/);
});

test('--all together with a slug is refused as ambiguous', () => {
  const r = run(['--all', '--slug=mould-remediation-fundamentals'], { DATABASE_URL: UNREACHABLE });
  assert.equal(r.code, 1);
  assert.match(r.out, /refusing: --all and a slug together/);
});

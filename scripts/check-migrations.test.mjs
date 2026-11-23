#!/usr/bin/env node
/**
 * Non-vacuity test for scripts/check-migrations.mjs (GP-678).
 *
 * Each case copies the REAL prisma/migrations tree and pin file into a temp directory, plants one
 * defect and runs the guard as CI does (a child process), so a pass cannot come from a fixture
 * the guard never reads. The first planted case is the exact edit GP-678 warns about: deleting
 * the extra blank line at the end of the applied coaching marketing pack migration.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { whitespaceFindings } from './check-migrations.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(REPO, 'scripts', 'check-migrations.mjs');
const MARKETING = '20261104120000_coaching_marketing_pack';
const NEW = '20991231000000_gp678_probe';
const CLEAN_SQL = 'ALTER TABLE "lms_users" ADD COLUMN "gp678_probe" TEXT;\n';

function freshTree({ withPins = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'gp678-migrations-'));
  cpSync(join(REPO, 'prisma', 'migrations'), join(root, 'prisma', 'migrations'), {
    recursive: true,
  });
  if (withPins) {
    cpSync(
      join(REPO, 'prisma', 'migration-checksums.json'),
      join(root, 'prisma', 'migration-checksums.json')
    );
  }
  return root;
}

function run(root, ...args) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

function addMigration(root, name, sql) {
  mkdirSync(join(root, 'prisma', 'migrations', name), { recursive: true });
  writeFileSync(join(root, 'prisma', 'migrations', name, 'migration.sql'), sql);
}

test('the real repository passes', () => {
  const r = spawnSync(process.execPath, [SCRIPT], { cwd: REPO, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('the applied marketing pack migration still carries its blank line (left alone on purpose)', () => {
  const sql = readFileSync(join(REPO, 'prisma', 'migrations', MARKETING, 'migration.sql'), 'utf8');
  assert.ok(
    sql.endsWith(';\n\n'),
    'fixture drifted: the migration no longer ends with the blank line'
  );
});

test('removing the blank line from the applied marketing pack migration fails', () => {
  const root = freshTree();
  try {
    const p = join(root, 'prisma', 'migrations', MARKETING, 'migration.sql');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/\n\n$/, '\n'));
    const r = run(root);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, new RegExp(`${MARKETING}/migration\\.sql: changed after it was applied`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('deleting an applied migration fails', () => {
  const root = freshTree();
  try {
    rmSync(join(root, 'prisma', 'migrations', MARKETING), { recursive: true });
    const r = run(root);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /pinned \(applied\) migration is missing/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const [label, sql, expected] of [
  ['a trailing blank line', `${CLEAN_SQL}\n`, /ends with a blank line/],
  ['trailing spaces', CLEAN_SQL.replace(';\n', '; \n'), /line 1 has trailing whitespace/],
  ['CRLF line endings', CLEAN_SQL.replace('\n', '\r\n'), /contains CR characters/],
  ['no final newline', CLEAN_SQL.trimEnd(), /does not end with a newline/],
]) {
  test(`a new migration with ${label} fails`, () => {
    const root = freshTree();
    try {
      addMigration(root, NEW, sql);
      const r = run(root);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, expected);
      // --pin-new must refuse to pin a dirty migration.
      const pinned = run(root, '--pin-new');
      assert.equal(pinned.code, 1, pinned.out);
      const pins = JSON.parse(
        readFileSync(join(root, 'prisma', 'migration-checksums.json'), 'utf8')
      );
      assert.equal(Object.hasOwn(pins.migrations, NEW), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('a clean new migration fails until pinned, and --pin-new only adds its pin', () => {
  const root = freshTree();
  try {
    addMigration(root, NEW, CLEAN_SQL);
    const before = JSON.parse(
      readFileSync(join(root, 'prisma', 'migration-checksums.json'), 'utf8')
    );
    const r = run(root);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /new migration is not pinned/);

    const pinned = run(root, '--pin-new');
    assert.equal(pinned.code, 0, pinned.out);
    const after = JSON.parse(
      readFileSync(join(root, 'prisma', 'migration-checksums.json'), 'utf8')
    );
    assert.equal(Object.keys(after.migrations).length, Object.keys(before.migrations).length + 1);
    for (const [name, hash] of Object.entries(before.migrations))
      assert.equal(after.migrations[name], hash);
    assert.equal(run(root).code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('configuration errors exit 2, never 0', () => {
  const noPins = freshTree({ withPins: false });
  const empty = mkdtempSync(join(tmpdir(), 'gp678-empty-'));
  try {
    assert.equal(run(noPins).code, 2);
    assert.equal(run(empty).code, 2);
  } finally {
    rmSync(noPins, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  }
});

test('whitespaceFindings accepts a clean file', () => {
  assert.deepEqual(whitespaceFindings(CLEAN_SQL), []);
});

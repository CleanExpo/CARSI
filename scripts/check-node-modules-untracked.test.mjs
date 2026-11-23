// node_modules must never be committed, not even as a symlink.
//
// beb27250 (#1303) committed `node_modules` as a symlink to the absolute path
// /home/user/CARSI/node_modules. `.gitignore` said `node_modules/`, and a trailing slash matches
// only a directory, so a symlink slipped past it. On a checkout at that same path the link points at
// itself ("Too many levels of symbolic links") and checking the commit out deletes an installed
// node_modules directory. On a checkout anywhere else it dangles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

test('git tracks nothing at or under node_modules', () => {
  const res = git(ROOT, 'ls-files', '--', 'node_modules');
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.stdout.trim(), '', `tracked: ${res.stdout.trim()}`);
});

test('.gitignore ignores node_modules when it is a symlink, not only a directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carsi-gitignore-'));
  try {
    assert.equal(git(dir, 'init', '-q').status, 0);
    copyFileSync(join(ROOT, '.gitignore'), join(dir, '.gitignore'));
    symlinkSync(join(dir, 'elsewhere'), join(dir, 'node_modules'));
    const res = git(dir, 'check-ignore', '-q', 'node_modules');
    assert.equal(res.status, 0, 'a node_modules symlink is not ignored by .gitignore');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Self-test for the main history rewrite detector (GP-780).
 *
 * Every case builds a throwaway git repository in the OS temp directory, so the real checkout
 * is never touched. The rewrite case replays the shape of the 22/11/2026 incident: main moves
 * on with squash-merged PRs, then is force-pushed back onto an older commit plus one new one.
 * The guard must flag that, list the dropped commits and their PRs, and exit 1; a plain
 * fast-forward must pass with exit 0. Both directions are asserted, so a detector that always
 * passes (or always fails) cannot satisfy this file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectRewrite, prNumbersFromSubject, prsOf, renderSummary } from './check-main-rewrite.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'check-main-rewrite.mjs');
const ZERO = '0'.repeat(40);

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'main-rewrite-'));
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
  };
  const g = (...args) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8' }).trim();
  g('init', '-q', '-b', 'main');
  let n = 0;
  const commit = (subject) => {
    n += 1;
    writeFileSync(join(dir, `f${n}.txt`), `${subject}\n`);
    g('add', '.');
    g('commit', '-q', '-m', subject);
    return g('rev-parse', 'HEAD');
  };
  return { dir, g, commit, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

function runCli(cwd, args) {
  const summary = join(cwd, '.summary.md');
  const env = { ...process.env, GITHUB_TOKEN: '', GITHUB_STEP_SUMMARY: '', GITHUB_REPOSITORY: '' };
  const r = spawnSync(process.execPath, [SCRIPT, ...args, '--summary', summary, '--repo', 'example/repo'], { cwd, env, encoding: 'utf8' });
  let text = '';
  try {
    text = readFileSync(summary, 'utf8');
  } catch {
    /* no summary written */
  }
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, summary: text };
}

test('prNumbersFromSubject reads squash and merge-commit subjects', () => {
  assert.deepEqual(prNumbersFromSubject('ci(deploy): live smoke (GP-779) (#1286)'), [1286]);
  assert.deepEqual(prNumbersFromSubject('Merge pull request #1180 from CleanExpo/fix-host'), [1180]);
  assert.deepEqual(prNumbersFromSubject('restore: re-merge 16 PRs (#1274)'), [1274]);
  assert.deepEqual(prNumbersFromSubject('Revert "feat: x (#12)" (#13)'), [12, 13]);
  assert.deepEqual(prNumbersFromSubject('fix: tweak copy (GP-700)'), []);
});

test('a planted force-push rewrite is flagged, with the lost commits and PRs listed (exit 1)', (t) => {
  const r = makeRepo();
  t.after(r.cleanup);
  const base = r.commit('chore: base (#1)');
  r.commit('feat: deploy gate (#1251)');
  r.commit('fix: host header (#1180)');
  const oldHead = r.commit('Merge pull request #1265 from CleanExpo/x');
  // The rewrite: main is reset onto an older commit and a different commit is pushed on top.
  r.g('reset', '-q', '--hard', base);
  const newHead = r.commit('feat: pushed straight to main');

  const result = detectRewrite({ cwd: r.dir, before: oldHead, after: newHead, forced: true });
  assert.equal(result.failed, true);
  assert.equal(result.status, 'rewrite');
  assert.equal(result.ancestor, false);
  assert.equal(result.lost.length, 3);
  assert.deepEqual(prsOf(result.lost), [1180, 1251, 1265]);

  const cli = runCli(r.dir, ['--before', oldHead, '--after', newHead, '--forced', 'true', '--pusher', 'someone']);
  assert.equal(cli.code, 1, cli.stderr);
  assert.match(cli.summary, /Main history rewrite detected/);
  assert.ok(cli.summary.includes(oldHead.slice(0, 12)) && cli.summary.includes(newHead.slice(0, 12)));
  assert.match(cli.summary, /\| Pusher \| someone \|/);
  assert.match(cli.summary, /3 commit\(s\) no longer reachable from main/);
  assert.match(cli.summary, /\[#1180\]\(https:\/\/github\.com\/example\/repo\/pull\/1180\), \[#1251\].*\[#1265\]/);
  assert.match(cli.stdout, /::error title=Main history rewrite::/);
});

test('a non-fast-forward is flagged even if GitHub did not mark it forced', (t) => {
  const r = makeRepo();
  t.after(r.cleanup);
  const base = r.commit('chore: base');
  const oldHead = r.commit('feat: a (#2)');
  r.g('reset', '-q', '--hard', base);
  const newHead = r.commit('feat: b');
  const result = detectRewrite({ cwd: r.dir, before: oldHead, after: newHead, forced: false });
  assert.equal(result.failed, true);
  assert.deepEqual(prsOf(result.lost), [2]);
});

test('a forced push that lost nothing still fails, saying no commits were lost', (t) => {
  const r = makeRepo();
  t.after(r.cleanup);
  const oldHead = r.commit('chore: base');
  const newHead = r.commit('feat: c (#3)');
  const cli = runCli(r.dir, ['--before', oldHead, '--after', newHead, '--forced', 'true']);
  assert.equal(cli.code, 1);
  assert.match(cli.summary, /None: every commit from the previous head is still on main/);
});

test('a previous head that cannot be found fails closed (exit 1, lost commits unlistable)', (t) => {
  const r = makeRepo();
  t.after(r.cleanup);
  r.commit('chore: base');
  const head = r.commit('feat: d (#4)');
  const missing = 'deadbeef'.repeat(5);
  const cli = runCli(r.dir, ['--before', missing, '--after', head, '--forced', 'false']);
  assert.equal(cli.code, 1);
  assert.match(cli.summary, /cannot be listed here/);
});

test('a fast-forward through a PR merge passes (exit 0, no warning)', (t) => {
  const r = makeRepo();
  t.after(r.cleanup);
  const oldHead = r.commit('chore: base (#1)');
  r.commit('feat: e (#5)');
  const newHead = r.commit('feat: f (#6)');
  const result = detectRewrite({ cwd: r.dir, before: oldHead, after: newHead, forced: false });
  assert.equal(result.failed, false);
  assert.equal(result.status, 'fast-forward');
  assert.deepEqual(result.lost, []);
  const cli = runCli(r.dir, ['--before', oldHead, '--after', newHead, '--forced', 'false']);
  assert.equal(cli.code, 0, cli.stderr);
  assert.match(cli.summary, /Main update is a fast-forward/);
  assert.doesNotMatch(cli.summary, /Warning: direct push/);
});

test('a fast-forward that did not come from a PR passes with a direct-push warning', (t) => {
  const r = makeRepo();
  t.after(r.cleanup);
  const oldHead = r.commit('chore: base (#1)');
  const newHead = r.commit('fix: pushed straight to main');
  const cli = runCli(r.dir, ['--before', oldHead, '--after', newHead, '--forced', 'false']);
  assert.equal(cli.code, 0);
  assert.match(cli.summary, /Warning: direct push to main/);
  assert.match(cli.stdout, /::warning title=Direct push to main::/);
});

test('branch creation passes and branch deletion fails', (t) => {
  const r = makeRepo();
  t.after(r.cleanup);
  const head = r.commit('chore: base (#1)');
  assert.equal(detectRewrite({ cwd: r.dir, before: ZERO, after: head }).failed, false);
  const del = detectRewrite({ cwd: r.dir, before: head, after: ZERO });
  assert.equal(del.failed, true);
  assert.equal(del.status, 'deleted');
  assert.match(renderSummary({ result: del, before: head, after: ZERO }), /main was deleted/);
});

test('malformed input is a usage error (exit 2), never a pass', (t) => {
  const r = makeRepo();
  t.after(r.cleanup);
  const head = r.commit('chore: base');
  assert.equal(runCli(r.dir, ['--before', 'abc', '--after', head]).code, 2);
  assert.equal(runCli(r.dir, ['--before', head]).code, 2);
  assert.equal(runCli(r.dir, ['--before', head, '--after', 'f'.repeat(40)]).code, 2);
});

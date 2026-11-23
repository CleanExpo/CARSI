/**
 * CARSI merges are Phill's only (Phill, 23/11/2026, by pop-up).
 *
 * A claude.ai/code cloud session readied and merged CARSI #1286 and #1287 within about a
 * minute of green CI. Cloud sessions load hooks from this checkout, not from ~/.claude, so
 * the refusal lives here. These tests run the real hook script as Claude Code runs it: a
 * JSON payload on stdin, exit 2 = blocked, exit 0 = allowed.
 */
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'founder-merge-only.mjs');
const RULE = "CARSI merges are Phill's only";

function run(command, script = HOOK, raw) {
  const input = raw ?? JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
  return spawnSync(process.execPath, [script], { input, encoding: 'utf8' });
}

const REFUSED = [
  'gh pr merge 1286',
  'gh pr merge 1286 --squash --delete-branch',
  'gh pr merge --auto --squash 1287',
  'gh pr merge',
  'gh pr ready 1286',
  'gh pr ready',
  'gh pr ready 1286 --undo=false',
  'gh pr ready 1286 --undo --undo=false',
  'gh -R CleanExpo/CARSI pr merge 5',
  'gh --repo=CleanExpo/CARSI pr ready 5',
  'GH_REPO=CleanExpo/CARSI gh pr merge 5',
  'env A=1 gh pr merge 5',
  'command gh pr merge 5',
  '/opt/homebrew/bin/gh pr merge 5',
  'gh.exe pr ready 5',
  'npm test && gh pr merge 5',
  'true; gh pr ready 5',
  'gh pr ready 4 --undo && gh pr ready 5',
  'gh pr checks 5 | gh pr merge 5',
  'gh pr view 5\ngh pr merge 5',
  "sh -c 'gh pr merge 5'",
  'bash -c "gh pr ready 5"',
  'eval "gh pr merge 5"',
  'echo $(gh pr merge 5)',
  'echo `gh pr ready 5`',
  "gh pr merge 5 # --undo",
  "gh api -X PUT repos/CleanExpo/CARSI/pulls/5/merge",
  "gh api graphql -f query='mutation { mergePullRequest(input: {pullRequestId: \"x\"}) { clientMutationId } }'",
  "gh api graphql -f query='mutation { markPullRequestReadyForReview(input: {pullRequestId: \"x\"}) { clientMutationId } }'",
  "gh api graphql -f query='mutation { enablePullRequestAutoMerge(input: {pullRequestId: \"x\"}) { clientMutationId } }'",
  'gh api -X PATCH repos/CleanExpo/CARSI/pulls/5 -F draft=false',
  "gh pr merge 5 'unbalanced",
];

test('every ordinary way to merge or ready a CARSI PR is refused, naming the rule', () => {
  for (const command of REFUSED) {
    const r = run(command);
    assert.equal(r.status, 2, `allowed: ${JSON.stringify(command)} ${r.stderr}`);
    assert.match(r.stderr, new RegExp(RULE), `refused for another reason: ${command}`);
  }
});

test('returning a PR to draft stays allowed', () => {
  for (const command of ['gh pr ready 1286 --undo', 'gh pr ready --undo 1286', 'gh pr ready 5 --undo=true']) {
    const r = run(command);
    assert.equal(r.status, 0, `${command}: ${r.stderr}`);
  }
});

test('other commands are untouched', () => {
  for (const command of [
    'gh pr view 1286',
    'gh pr checks 1286 --watch',
    'gh pr create --draft --fill',
    'gh pr list --state merged',
    'gh run list --workflow ci.yml',
    'git merge-base HEAD origin/main',
    'git log --merges -5',
    'npm run test:unit',
    'gh api repos/CleanExpo/CARSI/pulls/5',
    'grep -n "merge" README.md',
  ]) {
    const r = run(command);
    assert.equal(r.status, 0, `${command}: ${r.stderr}`);
  }
});

test('a payload the hook cannot read fails closed', () => {
  for (const raw of ['', 'not json', '[]', '{"tool_input": 5}']) {
    const r = run('', HOOK, raw);
    assert.equal(r.status, 2, `allowed malformed payload ${JSON.stringify(raw)}`);
  }
});

test('a payload with no Bash command is allowed (nothing to run)', () => {
  const r = run('', HOOK, JSON.stringify({ tool_name: 'Bash', tool_input: { command: '' } }));
  assert.equal(r.status, 0, r.stderr);
});

for (const [marker, cases] of [
  ['MERGE-CHECK', ['gh pr merge 1286', 'gh pr merge --auto 5']],
  ['READY-CHECK', ['gh pr ready 1286', 'gh pr ready 5 --undo=false']],
]) {
  test(`a mutant without the ${marker} line is killed`, () => {
    const source = readFileSync(HOOK, 'utf8');
    const lines = source.split('\n');
    const kept = lines.filter((l) => !l.includes(`// ${marker}`));
    assert.equal(lines.length - kept.length, 1, `${marker} line not found exactly once`);
    const dir = mkdtempSync(join(tmpdir(), 'founder-merge-mutant-'));
    try {
      const mutant = join(dir, 'founder-merge-only.mjs');
      writeFileSync(mutant, kept.join('\n'));
      for (const command of cases) {
        assert.equal(run(command).status, 2, `real hook allowed ${command}`);
        assert.equal(run(command, mutant).status, 0, `mutant still refused ${command}: the tests cannot see this check`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

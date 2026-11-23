#!/usr/bin/env node
/**
 * Main history rewrite detector (GP-780).
 *
 * WHY THIS EXISTS. At 2026-11-22T18:14:28Z CARSI main was force-pushed from f4df903e to
 * 5593ab7e and 16 merged PRs vanished from main, the production deploy gate (#1251) and a
 * Host-header security fix (#1180) among them. Nothing alerted; it was found and repaired by
 * hand in #1274. This script runs on every push to main (.github/workflows/main-rewrite-guard.yml)
 * and fails red when the update was not a fast-forward.
 *
 * It only reads. It never pushes, reverts, resets or changes a ref or a setting.
 *
 *   node scripts/ci/check-main-rewrite.mjs --before <sha> --after <sha> [--forced true|false]
 *        [--pusher <name>] [--repo owner/name] [--summary <file>]
 *
 * Exit codes: 0 = fast-forward (warnings, such as a direct push, do not fail),
 *             1 = rewrite (force push, non-fast-forward, or main deleted),
 *             2 = usage or environment error (bad SHA, not a git repository).
 *
 * A rewrite is flagged when EITHER signal fires: GitHub says the push was forced, or `before`
 * is not an ancestor of `after`. If `before` cannot be found locally after a full fetch, it is
 * not reachable from any ref, so it cannot be an ancestor of `after`: that is a rewrite too,
 * reported with the lost commits marked as unlistable (fail closed, never a silent pass).
 *
 * With GITHUB_TOKEN set (read-only `contents` + `pull-requests`), commits whose subject does
 * not name a PR are looked up with GET /repos/{repo}/commits/{sha}/pulls, and the new head is
 * checked for a merged PR so a direct push to main is reported as a warning.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { isEntryPoint } from '../lib/is-entry-point.mjs';

const SHA_RE = /^[0-9a-f]{40}$/;
const ZERO_SHA = '0'.repeat(40);

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function gitOk(cwd, args) {
  try {
    execFileSync('git', args, { cwd, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** True when `sha` names a commit object in the local repository. */
export function commitExists(cwd, sha) {
  return gitOk(cwd, ['cat-file', '-e', `${sha}^{commit}`]);
}

/** True when `ancestor` is reachable from `descendant` (git merge-base --is-ancestor). */
export function isAncestor(cwd, ancestor, descendant) {
  return gitOk(cwd, ['merge-base', '--is-ancestor', ancestor, descendant]);
}

/**
 * PR numbers named in a commit subject: squash merges end "(#123)", merge commits start
 * "Merge pull request #123 from". A revert's subject quotes the original, which is still the
 * PR the work came from.
 */
export function prNumbersFromSubject(subject) {
  const found = new Set();
  const merge = /^Merge pull request #(\d+)\b/.exec(subject);
  if (merge) found.add(Number(merge[1]));
  for (const m of subject.matchAll(/\(#(\d+)\)/g)) found.add(Number(m[1]));
  return [...found].sort((a, b) => a - b);
}

/** Commits reachable from `from` but not from `to`, newest first: `git log to..from`. */
export function commitsBetween(cwd, to, from) {
  const out = git(cwd, ['log', '--format=%H%x09%an%x09%s', `${to}..${from}`]).trim();
  if (!out) return [];
  return out.split('\n').map((line) => {
    const [sha, author, ...rest] = line.split('\t');
    const subject = rest.join('\t');
    return { sha, author, subject, prs: prNumbersFromSubject(subject) };
  });
}

/**
 * Classify one push to main. Pure apart from read-only git calls in `cwd`.
 *
 * @returns {{
 *   status: 'fast-forward'|'created'|'rewrite'|'deleted',
 *   failed: boolean, forced: boolean, beforeFound: boolean, ancestor: boolean|null,
 *   lost: Array<{sha:string,author:string,subject:string,prs:number[]}>|null,
 *   added: Array<{sha:string,author:string,subject:string,prs:number[]}>,
 *   reasons: string[]
 * }}
 */
export function detectRewrite({ cwd = process.cwd(), before, after, forced = false }) {
  for (const [name, sha] of [['before', before], ['after', after]]) {
    if (!SHA_RE.test(sha ?? '')) throw new Error(`--${name} must be a full 40-character SHA, got "${sha}"`);
  }
  const base = { forced, beforeFound: true, ancestor: null, lost: [], added: [], reasons: [] };

  if (after === ZERO_SHA) {
    return { ...base, status: 'deleted', failed: true, lost: null, reasons: ['main was deleted'] };
  }
  if (!commitExists(cwd, after)) {
    throw new Error(`after ${after} is not in the local repository; fetch it before running`);
  }
  if (before === ZERO_SHA) {
    return { ...base, status: 'created', failed: false, reasons: ['main was created'] };
  }

  const beforeFound = commitExists(cwd, before);
  const ancestor = beforeFound ? isAncestor(cwd, before, after) : false;
  const reasons = [];
  if (forced) reasons.push('GitHub reported the push as forced');
  if (!beforeFound) reasons.push(`the previous head ${before} is not reachable from any fetched ref`);
  else if (!ancestor) reasons.push(`the previous head ${before} is not an ancestor of ${after}`);

  const failed = forced || !ancestor;
  const lost = !beforeFound ? null : ancestor ? [] : commitsBetween(cwd, after, before);
  const added = beforeFound ? commitsBetween(cwd, before, after) : [];
  return {
    forced,
    beforeFound,
    ancestor,
    lost,
    added,
    reasons,
    status: failed ? 'rewrite' : 'fast-forward',
    failed,
  };
}

/** Distinct PR numbers across a list of commits, ascending. */
export function prsOf(commits) {
  return [...new Set((commits ?? []).flatMap((c) => c.prs))].sort((a, b) => a - b);
}

const short = (sha) => sha.slice(0, 12);

/** Markdown job summary. `directPush` is null when it could not be checked. */
export function renderSummary({ result, before, after, pusher, repo, directPush = null }) {
  const link = (sha) => (repo ? `[\`${short(sha)}\`](https://github.com/${repo}/commit/${sha})` : `\`${short(sha)}\``);
  const prLink = (n) => (repo ? `[#${n}](https://github.com/${repo}/pull/${n})` : `#${n}`);
  const lines = [];

  if (result.failed) {
    lines.push('## Main history rewrite detected', '');
    lines.push(`**${result.status === 'deleted' ? 'main was deleted' : 'This push to main was not a fast-forward.'}** Nothing has been changed or reverted by this check; repair is a human decision.`, '');
  } else {
    lines.push('## Main update is a fast-forward', '');
  }
  lines.push('| | |', '|---|---|');
  lines.push(`| Before | ${before === ZERO_SHA ? '(none)' : link(before)} |`);
  lines.push(`| After | ${after === ZERO_SHA ? '(deleted)' : link(after)} |`);
  lines.push(`| Pusher | ${pusher || '(unknown)'} |`);
  lines.push(`| GitHub \`forced\` flag | ${result.forced ? 'true' : 'false'} |`);
  lines.push(`| Before is an ancestor of after | ${result.ancestor === null ? 'n/a' : result.ancestor ? 'yes' : 'no'} |`);
  if (result.reasons.length) lines.push(`| Why | ${result.reasons.join('; ')} |`);
  lines.push('');

  if (result.failed && result.status === 'rewrite') {
    if (result.lost === null) {
      lines.push('### Commits no longer reachable from main', '');
      lines.push(`The previous head could not be fetched, so the lost commits cannot be listed here. Recover them from a clone that still has \`${before}\`, or from a backup ref.`, '');
    } else if (result.lost.length === 0) {
      lines.push('### Commits no longer reachable from main', '', 'None: every commit from the previous head is still on main, but the push was forced.', '');
    } else {
      const prs = prsOf(result.lost);
      lines.push(`### ${result.lost.length} commit(s) no longer reachable from main (\`git log ${short(after)}..${short(before)}\`)`, '');
      lines.push(`PRs these commits came from: ${prs.length ? prs.map(prLink).join(', ') : 'none could be derived'}`, '');
      lines.push('| Commit | Author | Subject | PR |', '|---|---|---|---|');
      for (const c of result.lost) {
        const subject = c.subject.replace(/\|/g, '\\|');
        lines.push(`| ${link(c.sha)} | ${c.author} | ${subject} | ${c.prs.length ? c.prs.map(prLink).join(', ') : '?'} |`);
      }
      lines.push('');
    }
    lines.push('### What to do', '');
    lines.push(`1. Do not push to main again until the lost work is accounted for.`);
    lines.push(`2. Keep a copy of the old head: \`git push origin ${before}:refs/backup/main-before-rewrite-${short(before)}\` (a new ref, not main).`);
    lines.push('3. Restore the dropped work through a reviewed PR (as #1274 did), never by force-pushing main back.');
    lines.push('4. See docs/governance/BRANCH-RULES-PROPOSAL.md for the branch rules that stop this happening.');
    lines.push('');
  }

  if (!result.failed && directPush) {
    lines.push('### Warning: direct push to main', '');
    lines.push(`${link(after)} is not the merge result of a merged pull request (${directPush.basis}). Changes to main should arrive through a reviewed PR. This is a warning only and does not fail the check.`, '');
  }
  if (!result.failed && result.added.length) {
    lines.push(`Commits added by this push: ${result.added.length}${prsOf(result.added).length ? ` (PRs ${prsOf(result.added).map(prLink).join(', ')})` : ''}.`, '');
  }
  return lines.join('\n');
}

async function githubGet(repo, path, token) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) throw new Error(`GET ${path}: HTTP ${res.status}`);
  return res.json();
}

/** Fill in PR numbers for lost commits whose subject named none (best effort). */
async function enrichPrsFromApi(commits, repo, token) {
  for (const c of commits) {
    if (c.prs.length) continue;
    try {
      const pulls = await githubGet(repo, `/commits/${c.sha}/pulls`, token);
      c.prs = pulls.map((p) => p.number).sort((a, b) => a - b);
    } catch {
      /* leave as unknown */
    }
  }
}

/**
 * Was `after` produced by merging a PR? With a token: ask GitHub for PRs associated with the
 * commit and require one merged into main whose merge commit is `after`. Without a token:
 * fall back to the subject naming a PR. Returns null when it looks like a PR merge.
 */
export async function directPushCheck({ after, repo, token, subjectPrs }) {
  if (token && repo) {
    try {
      const pulls = await githubGet(repo, `/commits/${after}/pulls`, token);
      const merged = pulls.some((p) => p.merged_at && p.base?.ref === 'main' && p.merge_commit_sha === after);
      return merged ? null : { basis: 'GitHub lists no merged PR whose merge commit is this head' };
    } catch (err) {
      return subjectPrs.length ? null : { basis: `PR lookup failed (${err.message}) and the subject names no PR` };
    }
  }
  return subjectPrs.length ? null : { basis: 'the head commit subject names no PR' };
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) throw new Error(`unexpected argument "${key}"`);
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`${key} needs a value`);
    opts[key.slice(2)] = value;
    i += 1;
  }
  return opts;
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`check-main-rewrite: ${err.message}`);
    return 2;
  }
  const before = (opts.before ?? '').toLowerCase();
  const after = (opts.after ?? '').toLowerCase();
  const forced = String(opts.forced ?? 'false').toLowerCase() === 'true';
  const repo = opts.repo ?? process.env.GITHUB_REPOSITORY ?? '';
  const summaryFile = opts.summary ?? process.env.GITHUB_STEP_SUMMARY ?? '';
  const token = process.env.GITHUB_TOKEN ?? '';

  let result;
  try {
    if (!gitOk(process.cwd(), ['rev-parse', '--git-dir'])) throw new Error('not inside a git repository');
    result = detectRewrite({ before, after, forced });
  } catch (err) {
    console.error(`check-main-rewrite: ${err.message}`);
    return 2;
  }

  if (token && repo && result.lost?.length) await enrichPrsFromApi(result.lost, repo, token);

  let directPush = null;
  if (!result.failed && result.status === 'fast-forward') {
    const headSubject = git(process.cwd(), ['log', '-1', '--format=%s', after]).trim();
    directPush = await directPushCheck({ after, repo, token, subjectPrs: prNumbersFromSubject(headSubject) });
  }

  const summary = renderSummary({ result, before, after, pusher: opts.pusher, repo, directPush });
  console.log(summary);
  if (summaryFile) appendFileSync(summaryFile, `${summary}\n`);

  if (result.failed) {
    const lostNote = result.lost === null ? 'lost commits unknown' : `${result.lost.length} commit(s) lost, PRs: ${prsOf(result.lost).join(', ') || 'none derived'}`;
    console.log(`::error title=Main history rewrite::${before} -> ${after} (${result.reasons.join('; ')}); ${lostNote}`);
    return 1;
  }
  if (directPush) console.log(`::warning title=Direct push to main::${after}: ${directPush.basis}`);
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  process.exitCode = await main();
}

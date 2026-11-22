#!/usr/bin/env node
/**
 * Production deploy gate for CARSI (Phill, 22/11/2026: "Wait for green").
 *
 * DigitalOcean App Platform auto-deploy (deploy_on_push) used to ship every merge to
 * main before GitHub CI finished. With auto-deploy off, .github/workflows/deploy-production.yml
 * is the only automatic path to production, and it uses this script to decide:
 *
 *   checks <sha>                    exit 0 only when main's own push CI run for <sha> succeeded
 *                                   and every required check in that run passed
 *   decide <sha> <phase> <commit>   print wait|cancel|live|failed for an in-flight deployment
 *   wait-health <sha> [secs]        exit 0 once HEALTH_URL reports build.commit === <sha>
 *
 * Fail closed: a missing, skipped, cancelled or still-running check is not a pass, and an
 * unreachable or unparseable health response is not a match.
 */
import { pathToFileURL } from 'node:url';

/** The required status checks on main that come from GitHub Actions (branch protection). */
export const REQUIRED_CHECKS = Object.freeze([
  'Secret Scan',
  'Dependency Verification',
  'Unit Tests',
  'Frontend Tests',
  'Build Check',
  'E2E Tests',
]);

const SHA_RE = /^[a-f0-9]{40}$/;

/**
 * Decide whether every required check passed on one commit.
 * A re-run creates a second check run with the same name; the newest one (highest id) wins.
 *
 * @param {Array<{id:number,name:string,status:string,conclusion:string|null}>} checkRuns
 * @param {readonly string[]} required
 */
export function evaluateRequiredChecks(checkRuns, required = REQUIRED_CHECKS) {
  const latest = new Map();
  for (const run of checkRuns) {
    const prev = latest.get(run.name);
    if (!prev || run.id > prev.id) latest.set(run.name, run);
  }
  const missing = [];
  const notPassed = [];
  for (const name of required) {
    const run = latest.get(name);
    if (!run) missing.push(name);
    else if (run.status !== 'completed' || run.conclusion !== 'success') {
      notPassed.push(`${name} (${run.status}/${run.conclusion ?? 'none'})`);
    }
  }
  return { ok: missing.length === 0 && notPassed.length === 0, missing, notPassed };
}

const FAILED_PHASES = new Set(['ERROR', 'CANCELED', 'SUPERSEDED']);

/**
 * What to do with an in-flight DigitalOcean deployment of the checked commit <sha>.
 * DigitalOcean builds the head of main when the deployment starts, so if main moved after
 * the checks ran, the deployment carries a different commit: it must be cancelled before it
 * goes live, never discovered afterwards.
 *
 *   wait    keep polling (commit not resolved yet, or it is <sha> and not yet ACTIVE)
 *   cancel  the deployment resolved a different commit and is not live yet: cancel it, fail
 *   live    ACTIVE with exactly <sha>
 *   failed  anything else (ended without going live, or went live with an unverified commit)
 *
 * @param {{phase?: string, commit?: string|null}} deployment
 * @param {string} sha
 */
export function deploymentDecision({ phase, commit }, sha) {
  const resolved = SHA_RE.test(commit ?? '') ? commit : null;
  if (FAILED_PHASES.has(phase)) return 'failed';
  if (resolved && resolved !== sha) return phase === 'ACTIVE' ? 'failed' : 'cancel';
  if (phase === 'ACTIVE') return resolved === sha ? 'live' : 'failed';
  return 'wait';
}

/** The commit a /api/health body reports, or null when it reports none or is malformed. */
export function healthCommit(body) {
  const commit = body && typeof body === 'object' ? body.build?.commit : null;
  return typeof commit === 'string' && SHA_RE.test(commit) ? commit : null;
}

/**
 * The CI run that counts for <sha>: the newest run of the CI workflow for a push to main at
 * exactly that commit. Check runs on the same SHA from a pull request, a branch push or a
 * manual dispatch are not evidence that main's own CI passed.
 *
 * @param {Array<{id:number,head_sha:string,event:string,head_branch:string,status:string,conclusion:string|null,check_suite_id:number}>} workflowRuns
 * @param {string} sha
 */
export function mainPushRunVerdict(workflowRuns, sha) {
  const run = workflowRuns
    .filter((r) => r.head_sha === sha && r.event === 'push' && r.head_branch === 'main')
    .sort((a, b) => b.id - a.id)[0];
  if (!run) return { ok: false, reason: 'no CI run for a push to main at this commit', run: null };
  if (run.status !== 'completed' || run.conclusion !== 'success') {
    return { ok: false, reason: `main push CI run ${run.id} is ${run.status}/${run.conclusion ?? 'none'}`, run };
  }
  return { ok: true, reason: `main push CI run ${run.id} succeeded`, run };
}

async function getJson(url, token) {
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API returned ${res.status} for ${new URL(url).pathname}`);
  return res.json();
}

async function listAll(url, key, token) {
  const items = [];
  for (let page = 1; page <= 10; page += 1) {
    const data = await getJson(`${url}&per_page=100&page=${page}`, token);
    items.push(...data[key]);
    if (items.length >= data.total_count || data[key].length === 0) return items;
  }
  throw new Error(`more than 1000 ${key}; refusing to guess`);
}

async function main([mode, sha, secs, ...rest]) {
  if (!SHA_RE.test(sha ?? '')) throw new Error(`expected a full 40-character commit SHA, got "${sha}"`);

  if (mode === 'decide') {
    const [phase, commit] = [secs, rest[0]];
    console.log(deploymentDecision({ phase, commit }, sha));
    return 0;
  }

  if (mode === 'checks') {
    const { GITHUB_REPOSITORY: repo, GH_TOKEN: token } = process.env;
    if (!repo || !token) throw new Error('GITHUB_REPOSITORY and GH_TOKEN must be set');
    const api = `https://api.github.com/repos/${repo}`;
    const runs = await listAll(
      `${api}/actions/workflows/ci.yml/runs?head_sha=${sha}&event=push&branch=main`,
      'workflow_runs',
      token,
    );
    const ci = mainPushRunVerdict(runs, sha);
    if (!ci.ok) {
      console.log(JSON.stringify({ sha, ok: false, reason: ci.reason }));
      return 1;
    }
    const checkRuns = await listAll(
      `${api}/check-suites/${ci.run.check_suite_id}/check-runs?filter=latest`,
      'check_runs',
      token,
    );
    const result = evaluateRequiredChecks(checkRuns);
    console.log(JSON.stringify({ sha, ci_run: ci.run.id, ...result }));
    return result.ok ? 0 : 1;
  }

  if (mode === 'wait-health') {
    const url = process.env.HEALTH_URL;
    if (!url) throw new Error('HEALTH_URL must be set');
    const deadline = Date.now() + Number(secs ?? 600) * 1000;
    let seen = null;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
        seen = res.ok ? healthCommit(await res.json()) : `HTTP ${res.status}`;
        if (seen === sha) {
          console.log(`health reports ${sha}`);
          return 0;
        }
      } catch (err) {
        seen = `error: ${err.message}`;
      }
      await new Promise((r) => setTimeout(r, 15_000));
    }
    console.error(`health never reported ${sha}; last seen: ${seen}`);
    return 1;
  }

  throw new Error(`unknown mode "${mode}"; use checks, decide or wait-health`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err.message);
      process.exit(2);
    },
  );
}

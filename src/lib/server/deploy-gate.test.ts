import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  REQUIRED_CHECKS,
  deploymentDecision,
  evaluateRequiredChecks,
  healthCommit,
} from '../../../scripts/ci/production-deploy-gate.mjs';

// Production deploy gate (Phill, 22/11/2026: "Wait for green"). DigitalOcean must not
// deploy on push; the deploy workflow ships main only after its required checks pass.

const root = join(__dirname, '../../..');
const readYaml = (rel: string) => parse(readFileSync(join(root, rel), 'utf8'));
const SHA = 'c3e767baa79c9a8e7cc9b86dfab29086a9974da8';
const pass = (name: string, id = 1) => ({ id, name, status: 'completed', conclusion: 'success' });
const allPass = () => REQUIRED_CHECKS.map((name, i) => pass(name, i + 1));

describe('app.yaml', () => {
  const service = readYaml('app.yaml').services.find((s: { name: string }) => s.name === 'carsi');

  it('does not deploy on push to main', () => {
    expect(service.github).toMatchObject({ branch: 'main', deploy_on_push: false });
  });

  it('binds CARSI_BUILD_SHA to the commit DigitalOcean built, at run time', () => {
    expect(service.envs).toContainEqual({
      key: 'CARSI_BUILD_SHA',
      value: '${_self.COMMIT_HASH}',
      scope: 'RUN_TIME',
    });
  });
});

describe('deploy-production workflow', () => {
  const wf = readYaml('.github/workflows/deploy-production.yml');
  const job = wf.jobs.deploy;
  const script = job.steps.map((s: { run?: string }) => s.run ?? '').join('\n');

  it('runs only after the CI workflow completes on main', () => {
    expect(wf.on.workflow_run).toEqual({ workflows: ['CI'], types: ['completed'], branches: ['main'] });
    expect(Object.keys(wf.on).sort()).toEqual(['workflow_dispatch', 'workflow_run']);
    expect(job.if).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(job.if).toContain("github.event.workflow_run.event == 'push'");
  });

  it('never runs two deploys at once', () => {
    expect(wf.concurrency).toEqual({ group: 'production-deploy', 'cancel-in-progress': false });
  });

  it('checks the required checks, deploys with doctl, then waits for /api/health to report the commit', () => {
    const checks = script.indexOf('production-deploy-gate.mjs checks');
    const deploy = script.indexOf('doctl apps create-deployment');
    const health = script.indexOf('production-deploy-gate.mjs wait-health');
    expect(checks).toBeGreaterThan(-1);
    expect(deploy).toBeGreaterThan(checks);
    expect(health).toBeGreaterThan(deploy);
    expect(script).toContain('source_commit_hash');
  });

  it('decides on the deployment before it goes live and can cancel it', () => {
    const deploy = script.indexOf('doctl apps create-deployment');
    const decide = script.indexOf('production-deploy-gate.mjs decide');
    const cancel = script.indexOf('/deployments/$dep/cancel');
    expect(decide).toBeGreaterThan(deploy);
    expect(cancel).toBeGreaterThan(decide);
    expect(script).not.toMatch(/create-deployment[^\n]*--wait/);
  });

  it('reads the DigitalOcean token only from the named secret, inside the main-only environment', () => {
    expect(job.environment).toBe('production-deploy');
    const text = readFileSync(join(root, '.github/workflows/deploy-production.yml'), 'utf8');
    expect(text).toContain('secrets.DIGITALOCEAN_ACCESS_TOKEN');
    expect(text.match(/secrets\.[A-Z_]+/g)?.every((s) => s === 'secrets.DIGITALOCEAN_ACCESS_TOKEN')).toBe(true);
  });

  it('requires exactly the check names the CI workflow produces', () => {
    const ciNames = Object.values(readYaml('.github/workflows/ci.yml').jobs).map(
      (j) => (j as { name?: string }).name,
    );
    for (const name of REQUIRED_CHECKS) expect(ciNames).toContain(name);
  });
});

describe('evaluateRequiredChecks', () => {
  it('passes when every required check succeeded', () => {
    expect(evaluateRequiredChecks(allPass())).toEqual({ ok: true, missing: [], notPassed: [] });
  });

  it('fails when a required check is missing', () => {
    const r = evaluateRequiredChecks(allPass().filter((c) => c.name !== 'E2E Tests'));
    expect(r).toMatchObject({ ok: false, missing: ['E2E Tests'] });
  });

  it.each([
    ['in_progress', null],
    ['completed', 'failure'],
    ['completed', 'skipped'],
    ['completed', 'cancelled'],
    ['completed', 'neutral'],
  ])('fails when E2E Tests is %s/%s', (status, conclusion) => {
    const runs = allPass().map((c) => (c.name === 'E2E Tests' ? { ...c, status, conclusion } : c));
    expect(evaluateRequiredChecks(runs).ok).toBe(false);
  });

  it('uses the newest run of a re-run check', () => {
    const failedThenPassed = [...allPass(), { id: 0, name: 'Unit Tests', status: 'completed', conclusion: 'failure' }];
    expect(evaluateRequiredChecks(failedThenPassed).ok).toBe(true);
    const passedThenFailed = [...allPass(), { id: 99, name: 'Unit Tests', status: 'completed', conclusion: 'failure' }];
    expect(evaluateRequiredChecks(passedThenFailed).ok).toBe(false);
  });
});

describe('deploymentDecision', () => {
  const OTHER = 'a'.repeat(40);

  it.each([
    ['PENDING_BUILD', '', 'wait'],
    ['BUILDING', '', 'wait'],
    ['BUILDING', SHA, 'wait'],
    ['DEPLOYING', SHA, 'wait'],
    ['ACTIVE', SHA, 'live'],
    ['PENDING_BUILD', OTHER, 'cancel'],
    ['BUILDING', OTHER, 'cancel'],
    ['DEPLOYING', OTHER, 'cancel'],
    ['ACTIVE', OTHER, 'failed'],
    ['ACTIVE', '', 'failed'],
    ['ERROR', SHA, 'failed'],
    ['CANCELED', '', 'failed'],
    ['SUPERSEDED', SHA, 'failed'],
  ])('%s with commit "%s" -> %s', (phase, commit, expected) => {
    expect(deploymentDecision({ phase, commit }, SHA)).toBe(expected);
  });
});

describe('healthCommit', () => {
  it('returns the reported commit', () => {
    expect(healthCommit({ build: { commit: SHA, source: 'CARSI_BUILD_SHA' } })).toBe(SHA);
  });

  it.each([null, {}, { build: { commit: null } }, { build: { commit: 'main' } }, 'text'])(
    'returns null for %j',
    (body) => {
      expect(healthCommit(body)).toBeNull();
    },
  );
});

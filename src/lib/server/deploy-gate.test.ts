import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  REQUIRED_CHECKS,
  deploymentDecision,
  evaluateRequiredChecks,
  healthCommit,
  mainPushRunVerdict,
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

  describe('live-smoke job (Phill, 23/11/2026: Playwright on the live site after every deploy)', () => {
    const smokeJob = wf.jobs['live-smoke'];
    type Step = {
      id?: string;
      name?: string;
      if?: string;
      run?: string;
      env?: Record<string, string>;
    };
    const steps: Step[] = smokeJob?.steps ?? [];
    const smokeStep = steps.find((s) => s.run?.includes('npm run test:smoke:live'));
    const rollbackStep = steps.find((s) => s.name?.startsWith('Print rollback steps'));

    it('runs after the deploy job, only when a deploy was chosen', () => {
      expect(smokeJob.needs).toBe('deploy');
      expect(smokeJob.if).toContain("needs.deploy.result == 'success'");
      expect(smokeJob.if).toContain("needs.deploy.outputs.deploy == 'true'");
      expect(job.outputs).toMatchObject({
        deploy: '${{ steps.target.outputs.deploy }}',
        sha: '${{ steps.target.outputs.sha }}',
      });
    });

    it('smokes the live site and requires /api/health to report the deployed commit', () => {
      expect(smokeStep?.id).toBe('smoke');
      expect(smokeStep?.env).toMatchObject({
        LIVE_SMOKE_BASE_URL: 'https://carsi.com.au',
        LIVE_SMOKE_EXPECT_COMMIT: '${{ needs.deploy.outputs.sha }}',
      });
    });

    it('holds no secrets and no deploy environment (read-only)', () => {
      expect(smokeJob.environment).toBeUndefined();
      expect(JSON.stringify(smokeJob)).not.toContain('secrets.');
    });

    it('prints rollback steps only when the smoke itself failed, and never rolls back', () => {
      expect(rollbackStep?.if).toBe("failure() && steps.smoke.outcome == 'failure'");
      const commands = (rollbackStep?.run ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('echo') && !line.startsWith('#'));
      expect(commands.join('\n')).not.toMatch(/curl|doctl/);
      for (const step of steps) expect(step.run ?? '').not.toMatch(/^\s*(curl|doctl)\b/m);
    });

    it('uploads the screenshots whatever the result', () => {
      const upload = steps.find((s) =>
        (s as { uses?: string }).uses?.startsWith('actions/upload-artifact')
      );
      expect(upload?.if).toBe('always()');
    });

    // Force-push review P2: a smoke that passed, followed by a failed screenshot upload, made the
    // job print "the live site was NOT checked" and go red. The job's result must follow the
    // smoke's result only. This walks the real steps with GitHub's step rules: a step runs when
    // its `if` holds (default `success()`), a failed step fails the job unless it has
    // `continue-on-error`, and a step skipped by its `if` has outcome `skipped`.
    type Outcome = 'success' | 'failure';
    function runJob(fail: (step: Step) => boolean) {
      let jobFailed = false;
      const outcomes: Record<string, string> = {};
      const ran: string[] = [];
      for (const step of steps as Array<Step & { 'continue-on-error'?: boolean }>) {
        const cond = (step.if ?? 'success()')
          .replace(/\bfailure\(\)/g, String(jobFailed))
          .replace(/\bsuccess\(\)/g, String(!jobFailed))
          .replace(/\balways\(\)/g, 'true')
          .replace(/steps\.(\w+)\.outcome/g, (_m, id: string) => JSON.stringify(outcomes[id] ?? 'skipped'))
          .replace(/==/g, '===')
          .replace(/!===/g, '!==');
        expect(cond, `unsupported expression in step "${step.name}"`).toMatch(
          /^[\s\w"'!=&|()]+$/
        );
        const runs = Function(`return (${cond});`)() as boolean;
        if (!runs) {
          if (step.id) outcomes[step.id] = 'skipped';
          continue;
        }
        ran.push(step.name ?? '');
        // A report step always ends in `exit 1`: running it fails the job.
        const outcome: Outcome =
          fail(step) || /^\s*exit 1\s*$/m.test(step.run ?? '') ? 'failure' : 'success';
        if (step.id) outcomes[step.id] = outcome;
        if (outcome === 'failure' && !step['continue-on-error']) jobFailed = true;
      }
      return { result: jobFailed ? 'failure' : 'success', ran };
    }
    const isUpload = (s: Step) =>
      Boolean((s as { uses?: string }).uses?.startsWith('actions/upload-artifact'));
    const notChecked = (ran: string[]) => ran.some((n) => n.startsWith('Report that the live site was not checked'));
    const rollback = (ran: string[]) => ran.some((n) => n.startsWith('Print rollback steps'));

    it('smoke passed but the screenshot upload failed: job is green and does not say "not checked"', () => {
      const { result, ran } = runJob(isUpload);
      expect(notChecked(ran)).toBe(false);
      expect(rollback(ran)).toBe(false);
      expect(result).toBe('success');
    });

    it('a setup step failed before the smoke: reports "not checked" and the job is red', () => {
      const { result, ran } = runJob((s) => s.run === 'npm ci');
      expect(notChecked(ran)).toBe(true);
      expect(rollback(ran)).toBe(false);
      expect(result).toBe('failure');
    });

    it('the smoke failed: prints rollback steps, not "not checked", and the job is red', () => {
      const { result, ran } = runJob((s) => s.id === 'smoke');
      expect(rollback(ran)).toBe(true);
      expect(notChecked(ran)).toBe(false);
      expect(result).toBe('failure');
    });

    it('everything passed: the job is green and no report step runs', () => {
      const { result, ran } = runJob(() => false);
      expect(notChecked(ran) || rollback(ran)).toBe(false);
      expect(result).toBe('success');
    });
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

describe('mainPushRunVerdict', () => {
  const run = (over: Record<string, unknown>) => ({
    id: 1,
    head_sha: SHA,
    event: 'push',
    head_branch: 'main',
    status: 'completed',
    conclusion: 'success',
    check_suite_id: 10,
    ...over,
  });

  it('accepts a successful CI run for a push to main at the commit', () => {
    expect(mainPushRunVerdict([run({})], SHA)).toMatchObject({ ok: true, run: { id: 1 } });
  });

  it('does not count successful pull-request, branch or dispatch runs on the same commit', () => {
    const others = [
      run({ id: 2, event: 'pull_request', head_branch: 'feature' }),
      run({ id: 3, event: 'push', head_branch: 'feature' }),
      run({ id: 4, event: 'workflow_dispatch' }),
    ];
    expect(mainPushRunVerdict(others, SHA).ok).toBe(false);
    expect(mainPushRunVerdict([...others, run({ id: 5, status: 'in_progress', conclusion: null })], SHA).ok).toBe(false);
    expect(mainPushRunVerdict([...others, run({ id: 5, conclusion: 'failure' })], SHA).ok).toBe(false);
  });

  it('does not count a run for another commit', () => {
    expect(mainPushRunVerdict([run({ head_sha: 'a'.repeat(40) })], SHA).ok).toBe(false);
  });

  it('uses the newest main push run', () => {
    expect(mainPushRunVerdict([run({ id: 1 }), run({ id: 2, conclusion: 'failure' })], SHA).ok).toBe(false);
    expect(mainPushRunVerdict([run({ id: 2 }), run({ id: 1, conclusion: 'failure' })], SHA).ok).toBe(true);
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

// @ts-expect-error -- production collector is dependency-free plain ESM.
import {
  REQUIRED_CI_JOBS,
  collectStabilityEvidence,
  lookupCiEvidence,
  runSmokeAttempt,
} from '../../scripts/collect-stability-evidence.mjs';

import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

const SHA = '61301c7891998fc267a4238eb2f381a1172d93f1';
const NOW = '2026-07-25T08:00:00.000Z';
const servers: Server[] = [];

async function fixtureServer(statusCode: number, body: Record<string, unknown>) {
  const server = createServer((_request, response) => {
    response.writeHead(statusCode, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve)))
  );
});

function validInput(baseUrl: string) {
  return {
    repository: 'CleanExpo/CARSI',
    gitSha: SHA,
    baseUrl,
    environment: 'fixture',
    providerDeploymentId: 'deploy-redacted',
    smokeAttempts: 1,
    evidenceDir: '/tmp/carsi-stability-evidence-test',
  };
}

function passingCi() {
  return {
    outcome: 'pass',
    requestedSha: SHA,
    matchedSha: SHA,
    workflow: 'ci.yml',
    runId: 30140878812,
    runUrl: 'https://github.com/CleanExpo/CARSI/actions/runs/30140878812',
    conclusion: 'success',
    requiredJobs: REQUIRED_CI_JOBS.map((name: string) => ({
      name,
      conclusion: 'success',
      url: `https://github.com/CleanExpo/CARSI/actions/jobs/${encodeURIComponent(name)}`,
    })),
    reasons: [],
  };
}

function smokeAttempt(attempt: number, outcome: 'pass' | 'fail' = 'pass') {
  const passed = outcome === 'pass' ? 12 : 11;
  return {
    attempt,
    startedAt: NOW,
    finishedAt: NOW,
    durationMs: 25,
    outcome,
    exitCode: outcome === 'pass' ? 0 : 1,
    tests: {
      expected: 12,
      total: 12,
      passed,
      failed: 12 - passed,
      skipped: 0,
    },
    reportLinks: [
      `/tmp/carsi-stability-evidence-test/smoke/attempt-${attempt}/playwright-results.json`,
      `/tmp/carsi-stability-evidence-test/smoke/attempt-${attempt}/playwright-report/index.html`,
    ],
    error: outcome === 'pass' ? null : 'One smoke check failed',
  };
}

describe('collectStabilityEvidence', () => {
  test('passes only when exact-SHA CI, healthy HTTP, and all 12 smoke checks pass', async () => {
    const baseUrl = await fixtureServer(200, {
      status: 'healthy',
      timestamp: NOW,
      version: '1.0.0',
      uptime: 123,
      environment: 'fixture',
    });

    const receipt = await collectStabilityEvidence(validInput(baseUrl), {
      lookupCiImpl: async () => passingCi(),
      runSmokeAttemptImpl: async ({ attempt }: { attempt: number }) => smokeAttempt(attempt),
      now: () => new Date(NOW),
    });

    expect(receipt.overall).toEqual({ result: 'pass', reasons: [] });
    expect(receipt.identifiers.gitSha).toBe(SHA);
    expect(receipt.health.outcome).toBe('pass');
    expect(receipt.health.httpStatus).toBe(200);
    expect(receipt.health.rawBody.status).toBe('healthy');
    expect(receipt.smoke.expectedTests).toBe(12);
    expect(receipt.smoke.firstAttemptOutcome).toBe('pass');
    expect(receipt.smoke.finalOutcome).toBe('pass');
    expect(receipt.thresholds).toEqual({
      healthLatencyMs: 'TBD-baseline',
      smokeDurationMs: 'TBD-baseline',
      recoveryTimeMs: 'TBD-baseline',
    });
  });

  test('fails closed when the health fixture is non-200 and unhealthy', async () => {
    const baseUrl = await fixtureServer(503, { status: 'unhealthy' });

    const receipt = await collectStabilityEvidence(validInput(baseUrl), {
      lookupCiImpl: async () => passingCi(),
      runSmokeAttemptImpl: async ({ attempt }: { attempt: number }) => smokeAttempt(attempt),
      now: () => new Date(NOW),
    });

    expect(receipt.health.outcome).toBe('fail');
    expect(receipt.health.httpStatus).toBe(503);
    expect(receipt.overall.result).toBe('fail');
  });

  test('emits unverified without touching CI, health, or smoke when an identifier is missing', async () => {
    let called = false;
    const receipt = await collectStabilityEvidence(
      { ...validInput('http://127.0.0.1:9'), providerDeploymentId: '' },
      {
        lookupCiImpl: async () => {
          called = true;
          return passingCi();
        },
        runSmokeAttemptImpl: async ({ attempt }: { attempt: number }) => smokeAttempt(attempt),
        now: () => new Date(NOW),
      }
    );

    expect(called).toBe(false);
    expect(receipt.overall.result).toBe('unverified');
    expect(receipt.overall.reasons).toContain('Missing required identifier: providerDeploymentId');
    expect(receipt.ci.outcome).toBe('unverified');
    expect(receipt.health.outcome).toBe('unverified');
    expect(receipt.smoke.outcome).toBe('unverified');
  });

  test('preserves an initial smoke failure and cannot turn the receipt green after a retry passes', async () => {
    const baseUrl = await fixtureServer(200, { status: 'healthy' });
    const input = { ...validInput(baseUrl), smokeAttempts: 2 };

    const receipt = await collectStabilityEvidence(input, {
      lookupCiImpl: async () => passingCi(),
      runSmokeAttemptImpl: async ({ attempt }: { attempt: number }) =>
        smokeAttempt(attempt, attempt === 1 ? 'fail' : 'pass'),
      now: () => new Date(NOW),
    });

    expect(receipt.smoke.attempts.map(({ outcome }: { outcome: string }) => outcome)).toEqual([
      'fail',
      'pass',
    ]);
    expect(receipt.smoke.firstAttemptOutcome).toBe('fail');
    expect(receipt.smoke.finalOutcome).toBe('pass');
    expect(receipt.smoke.outcome).toBe('fail');
    expect(receipt.overall.result).toBe('fail');
  });
});

describe('runSmokeAttempt', () => {
  test('does not label benign runner warnings as an error when all 12 checks pass', async () => {
    const evidenceDir = await mkdtemp(join(tmpdir(), 'carsi-smoke-attempt-'));
    let childEnv: Record<string, string> = {};
    const previousGithubToken = process.env.GITHUB_TOKEN;
    process.env.GITHUB_TOKEN = 'should-not-propagate';
    const runProcessImpl = async (
      _command: string,
      _args: string[],
      options: { env: Record<string, string> }
    ) => {
      childEnv = options.env;
      await writeFile(
        options.env.PLAYWRIGHT_JSON_OUTPUT_FILE,
        JSON.stringify({
          stats: { expected: 12, flaky: 0, unexpected: 0, skipped: 0 },
        })
      );
      return {
        exitCode: 0,
        stdout: '',
        stderr: 'npm warning that does not affect the test result',
        error: null,
      };
    };

    const attempt = await runSmokeAttempt({
      attempt: 1,
      baseUrl: 'http://127.0.0.1:3000',
      evidenceDir,
      runProcessImpl,
      now: () => new Date(NOW),
    });
    if (previousGithubToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previousGithubToken;

    expect(attempt.outcome).toBe('pass');
    expect(attempt.error).toBeNull();
    expect(childEnv.GITHUB_TOKEN).toBeUndefined();
  });
});

describe('lookupCiEvidence', () => {
  test('returns unverified when GitHub only returns a stale SHA run', async () => {
    const fetchImpl = async (url: string | URL) => {
      if (String(url).includes('/actions/workflows/ci.yml/runs')) {
        return new Response(
          JSON.stringify({
            workflow_runs: [
              {
                id: 99,
                head_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                conclusion: 'success',
                html_url: 'https://github.com/CleanExpo/CARSI/actions/runs/99',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const evidence = await lookupCiEvidence({
      repository: 'CleanExpo/CARSI',
      gitSha: SHA,
      fetchImpl,
    });

    expect(evidence.outcome).toBe('unverified');
    expect(evidence.matchedSha).toBeNull();
    expect(evidence.reasons.join(' ')).toMatch(/exact SHA/i);
  });

  test('requires every named CI job to conclude success for the exact SHA', async () => {
    const fetchImpl = async (url: string | URL) => {
      if (String(url).includes('/actions/workflows/ci.yml/runs')) {
        return new Response(
          JSON.stringify({
            workflow_runs: [
              {
                id: 101,
                head_sha: SHA,
                conclusion: 'success',
                html_url: 'https://github.com/CleanExpo/CARSI/actions/runs/101',
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (String(url).includes('/actions/runs/101/jobs')) {
        return new Response(
          JSON.stringify({
            jobs: REQUIRED_CI_JOBS.map((name: string) => ({
              name,
              conclusion: name === 'E2E Tests' ? 'skipped' : 'success',
              html_url: `https://github.com/CleanExpo/CARSI/actions/jobs/${encodeURIComponent(name)}`,
            })),
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const evidence = await lookupCiEvidence({
      repository: 'CleanExpo/CARSI',
      gitSha: SHA,
      fetchImpl,
    });

    expect(evidence.outcome).toBe('unverified');
    expect(
      evidence.requiredJobs.find(({ name }: { name: string }) => name === 'E2E Tests')
    ).toMatchObject({
      conclusion: 'skipped',
    });
  });
});

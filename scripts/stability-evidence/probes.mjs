import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { EXPECTED_SMOKE_TESTS, SMOKE_SUITE, iso } from './contract.mjs';

export async function probeHealthEvidence({
  baseUrl,
  fetchImpl = fetch,
  now = () => new Date(),
  monotonicNow = () => performance.now(),
}) {
  const url = new URL('/api/health', baseUrl).toString();
  const startedAt = iso(now);
  const started = monotonicNow();
  try {
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    const text = (await response.text()).slice(0, 65_536);
    let rawBody;
    try {
      rawBody = JSON.parse(text);
    } catch {
      rawBody = text;
    }
    const healthy =
      response.status === 200 &&
      rawBody !== null &&
      typeof rawBody === 'object' &&
      rawBody.status === 'healthy';
    return {
      outcome: healthy ? 'pass' : 'fail',
      url,
      startedAt,
      finishedAt: iso(now),
      durationMs: Math.max(0, monotonicNow() - started),
      httpStatus: response.status,
      rawBody,
      reasons: healthy
        ? []
        : [`Health probe required HTTP 200 and status=healthy; received HTTP ${response.status}`],
    };
  } catch (error) {
    return {
      outcome: 'fail',
      url,
      startedAt,
      finishedAt: iso(now),
      durationMs: Math.max(0, monotonicNow() - started),
      httpStatus: null,
      rawBody: null,
      reasons: [`Health probe failed: ${error.message}`],
    };
  }
}

function runProcess(command, args, options) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout = (stdout + chunk).slice(-65_536);
    });
    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk).slice(-65_536);
    });
    child.on('error', (error) => resolvePromise({ exitCode: null, stdout, stderr, error }));
    child.on('close', (exitCode) => resolvePromise({ exitCode, stdout, stderr, error: null }));
  });
}

function playwrightCounts(payload) {
  const stats = payload?.stats;
  if (!stats || typeof stats !== 'object') return null;
  const passed = Number(stats.expected ?? 0) + Number(stats.flaky ?? 0);
  const failed = Number(stats.unexpected ?? 0);
  const skipped = Number(stats.skipped ?? 0);
  return {
    expected: EXPECTED_SMOKE_TESTS,
    total: passed + failed + skipped,
    passed,
    failed,
    skipped,
  };
}

function smokeEnvironment({ baseUrl, jsonReport, htmlReportDir }) {
  const env = { ...process.env };
  const sensitiveName =
    /(TOKEN|SECRET|PASSWORD|DATABASE_URL|DSN|COOKIE|AUTH|API_KEY|PRIVATE_KEY|ACCESS_KEY|SESSION)/i;
  for (const name of Object.keys(env)) {
    if (sensitiveName.test(name)) delete env[name];
  }
  env.PLAYWRIGHT_BASE_URL = baseUrl;
  env.PLAYWRIGHT_JSON_OUTPUT_FILE = jsonReport;
  env.PLAYWRIGHT_HTML_OUTPUT_DIR = htmlReportDir;
  delete env.CI;
  return env;
}

export async function runSmokeAttempt({
  attempt,
  baseUrl,
  evidenceDir,
  cwd = process.cwd(),
  now = () => new Date(),
  monotonicNow = () => performance.now(),
  runProcessImpl = runProcess,
}) {
  const attemptDir = resolve(evidenceDir, 'smoke', `attempt-${attempt}`);
  const jsonReport = join(attemptDir, 'playwright-results.json');
  const htmlReportDir = join(attemptDir, 'playwright-report');
  const htmlReport = join(htmlReportDir, 'index.html');
  await mkdir(attemptDir, { recursive: true });
  const startedAt = iso(now);
  const started = monotonicNow();
  const env = smokeEnvironment({ baseUrl, jsonReport, htmlReportDir });

  const processResult = await runProcessImpl(
    'npx',
    [
      '--no-install',
      'playwright',
      'test',
      SMOKE_SUITE,
      '--project=desktop-chromium',
      '--reporter=json,html',
    ],
    { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  let payload = null;
  let reportError = null;
  try {
    payload = JSON.parse(await readFile(jsonReport, 'utf8'));
  } catch (error) {
    reportError = `Playwright JSON report unavailable: ${error.message}`;
  }

  const tests = playwrightCounts(payload) ?? {
    expected: EXPECTED_SMOKE_TESTS,
    total: null,
    passed: null,
    failed: null,
    skipped: null,
  };
  const completePass =
    processResult.exitCode === 0 &&
    tests.total === EXPECTED_SMOKE_TESTS &&
    tests.passed === EXPECTED_SMOKE_TESTS &&
    tests.failed === 0 &&
    tests.skipped === 0;
  const outcome = completePass
    ? 'pass'
    : reportError || tests.total === null
      ? 'unverified'
      : 'fail';
  const errors = [
    reportError,
    processResult.error?.message,
    processResult.exitCode !== 0
      ? `Playwright exited ${processResult.exitCode ?? 'without an exit code'}`
      : null,
    tests.total !== null && tests.total !== EXPECTED_SMOKE_TESTS
      ? `Expected exactly ${EXPECTED_SMOKE_TESTS} smoke tests; report contained ${tests.total}`
      : null,
    !completePass && processResult.stderr.trim() ? processResult.stderr.trim() : null,
  ].filter(Boolean);
  return {
    attempt,
    startedAt,
    finishedAt: iso(now),
    durationMs: Math.max(0, monotonicNow() - started),
    outcome,
    exitCode: processResult.exitCode,
    tests,
    reportLinks: [jsonReport, htmlReport],
    error: errors.length > 0 ? errors.join('\n').slice(0, 65_536) : null,
  };
}

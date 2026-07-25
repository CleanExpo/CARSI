import { mkdir, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  EXPECTED_SMOKE_TESTS,
  SMOKE_SUITE,
  emptySmoke,
  receiptShell,
  unverifiedSection,
  validateInputs,
} from './contract.mjs';
import { lookupCiEvidence } from './ci.mjs';
import { probeHealthEvidence, runSmokeAttempt } from './probes.mjs';

function aggregateOverall(ci, health, smoke) {
  const sections = [
    ['ci', ci],
    ['health', health],
    ['smoke', smoke],
  ];
  const result = sections.some(([, section]) => section.outcome === 'fail')
    ? 'fail'
    : sections.some(([, section]) => section.outcome !== 'pass')
      ? 'unverified'
      : 'pass';
  const reasons = sections.flatMap(([name, section]) =>
    section.outcome === 'pass'
      ? []
      : (section.reasons ?? [section.error ?? `${name} did not pass`]).map(
          (reason) => `${name}: ${reason}`
        )
  );
  return { result, reasons };
}

export async function collectStabilityEvidence(input, dependencies = {}) {
  const now = dependencies.now ?? (() => new Date());
  const receipt = receiptShell(input, now);
  const validationReasons = validateInputs(input);
  if (validationReasons.length > 0) {
    const reason = 'Collection skipped because required inputs were invalid';
    receipt.ci = unverifiedSection(reason);
    receipt.health = unverifiedSection(reason);
    receipt.smoke = emptySmoke(reason);
    receipt.overall = { result: 'unverified', reasons: validationReasons };
    return receipt;
  }

  const lookupCiImpl = dependencies.lookupCiImpl ?? lookupCiEvidence;
  const runSmokeAttemptImpl = dependencies.runSmokeAttemptImpl ?? runSmokeAttempt;
  receipt.ci = await lookupCiImpl({
    repository: input.repository,
    gitSha: input.gitSha.toLowerCase(),
    token: input.githubToken,
    fetchImpl: dependencies.githubFetchImpl ?? fetch,
  });
  receipt.health = await probeHealthEvidence({
    baseUrl: input.baseUrl,
    fetchImpl: dependencies.fetchImpl ?? fetch,
    now,
    monotonicNow: dependencies.monotonicNow ?? (() => performance.now()),
  });

  const attempts = [];
  for (let attempt = 1; attempt <= Number(input.smokeAttempts ?? 1); attempt += 1) {
    const result = await runSmokeAttemptImpl({
      attempt,
      baseUrl: input.baseUrl,
      evidenceDir: input.evidenceDir,
      cwd: input.cwd ?? process.cwd(),
      now,
      monotonicNow: dependencies.monotonicNow ?? (() => performance.now()),
    });
    attempts.push(result);
    if (result.outcome === 'pass') break;
  }
  const firstAttemptOutcome = attempts[0]?.outcome ?? 'unverified';
  const finalOutcome = attempts.at(-1)?.outcome ?? 'unverified';
  const smokeOutcome = attempts.some(({ outcome }) => outcome === 'fail')
    ? 'fail'
    : attempts.some(({ outcome }) => outcome !== 'pass')
      ? 'unverified'
      : 'pass';
  const smokeReasons = attempts
    .filter(({ outcome }) => outcome !== 'pass')
    .map(
      ({ attempt, outcome, error }) =>
        `Attempt ${attempt} was ${outcome}${error ? `: ${error}` : ''}`
    );
  receipt.smoke = {
    outcome: smokeOutcome,
    reasons: smokeReasons,
    suite: SMOKE_SUITE,
    expectedTests: EXPECTED_SMOKE_TESTS,
    attempts,
    firstAttemptOutcome,
    finalOutcome,
    reportLinks: attempts.flatMap(({ reportLinks }) => reportLinks),
  };
  receipt.overall = aggregateOverall(receipt.ci, receipt.health, receipt.smoke);
  return receipt;
}

export async function writeReceiptAtomic(outputPath, receipt) {
  const absolute = resolve(outputPath);
  await mkdir(dirname(absolute), { recursive: true });
  const temporary = join(dirname(absolute), `.${basename(absolute)}.${process.pid}.tmp`);
  await writeFile(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, absolute);
  return absolute;
}

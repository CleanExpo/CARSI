export const REQUIRED_CI_JOBS = Object.freeze([
  'Dependency Verification',
  'Frontend Tests',
  'Unit Tests',
  'Secret Scan',
  'Build Check',
  'E2E Tests',
]);

export const SCHEMA_VERSION = 'carsi.stability-evidence.v1';
export const SMOKE_SUITE = 'e2e/smoke.spec.ts';
export const EXPECTED_SMOKE_TESTS = 12;
export const TBD_THRESHOLDS = Object.freeze({
  healthLatencyMs: 'TBD-baseline',
  smokeDurationMs: 'TBD-baseline',
  recoveryTimeMs: 'TBD-baseline',
});

export function iso(now) {
  return now().toISOString();
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function unverifiedSection(reason) {
  return { outcome: 'unverified', reasons: [reason] };
}

export function emptySmoke(reason) {
  return {
    ...unverifiedSection(reason),
    suite: SMOKE_SUITE,
    expectedTests: EXPECTED_SMOKE_TESTS,
    attempts: [],
    firstAttemptOutcome: 'unverified',
    finalOutcome: 'unverified',
    reportLinks: [],
  };
}

export function receiptShell(input, now) {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: iso(now),
    identifiers: {
      repository: cleanString(input.repository) || null,
      gitSha: cleanString(input.gitSha).toLowerCase() || null,
      baseUrl: cleanString(input.baseUrl) || null,
      environment: cleanString(input.environment) || null,
      providerDeploymentId: cleanString(input.providerDeploymentId) || null,
    },
    thresholds: { ...TBD_THRESHOLDS },
    ci: unverifiedSection('CI evidence was not collected'),
    health: unverifiedSection('Health evidence was not collected'),
    smoke: emptySmoke('Smoke evidence was not collected'),
    overall: {
      result: 'unverified',
      reasons: ['Evidence collection did not complete'],
    },
  };
}

export function validateInputs(input) {
  const reasons = [];
  const required = [
    ['repository', input.repository],
    ['gitSha', input.gitSha],
    ['baseUrl', input.baseUrl],
    ['environment', input.environment],
    ['providerDeploymentId', input.providerDeploymentId],
  ];

  for (const [name, value] of required) {
    if (!cleanString(value)) reasons.push(`Missing required identifier: ${name}`);
  }

  const repository = cleanString(input.repository);
  if (repository && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    reasons.push('Invalid repository: expected owner/name');
  }

  const gitSha = cleanString(input.gitSha);
  if (gitSha && !/^[0-9a-f]{40}$/i.test(gitSha)) {
    reasons.push('Invalid gitSha: expected a full 40-character hexadecimal SHA');
  }

  const baseUrl = cleanString(input.baseUrl);
  if (baseUrl) {
    try {
      const parsed = new URL(baseUrl);
      const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname);
      if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) {
        reasons.push('Invalid baseUrl: HTTPS is required except for loopback fixtures');
      }
      if (parsed.username || parsed.password || parsed.search || parsed.hash) {
        reasons.push('Invalid baseUrl: credentials, query strings, and fragments are prohibited');
      }
    } catch {
      reasons.push('Invalid baseUrl: expected an absolute HTTP(S) URL');
    }
  }

  const attempts = Number(input.smokeAttempts ?? 1);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 3) {
    reasons.push('Invalid smokeAttempts: expected an integer from 1 to 3');
  }

  return reasons;
}

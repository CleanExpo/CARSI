import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const workflow = readFileSync(
  new URL('../.github/workflows/security.yml', import.meta.url),
  'utf8'
);
const job = workflow.split('\n  trivy-scan:\n')[1]?.split('\n  security-summary:\n')[0] ?? '';
const scanner =
  job.split(/\n {6}- /).find((step) => step.includes('uses: aquasecurity/trivy-action@')) ?? '';
const input = (name) =>
  scanner.match(new RegExp(`^ {10}${name}: ['"]?([^'"\\n#]+)`, 'm'))?.[1].trim();

// Exercise the real scanner with deterministic, non-credential canaries. Custom
// rules add test findings without disabling built-in rules or requiring a CVE DB.
const severities = ['MEDIUM', 'HIGH', 'CRITICAL'];
const trivy = process.env.TRIVY_BIN || 'trivy';

function scan(findingSeverity, severityControl) {
  const directory = mkdtempSync(join(tmpdir(), 'carsi-trivy-policy-'));
  try {
    const source = join(directory, 'source');
    mkdirSync(source);
    writeFileSync(
      join(source, 'canary.txt'),
      findingSeverity ? `CARSI_POLICY_CANARY_${findingSeverity}\n` : 'Harmless content\n'
    );
    const config = join(directory, 'secret-rules.yaml');
    writeFileSync(
      config,
      'rules:\n' +
        severities
          .map((severity) =>
            [
              `  - id: carsi-policy-${severity.toLowerCase()}`,
              '    category: test',
              `    title: Synthetic ${severity} policy canary`,
              `    severity: ${severity}`,
              `    regex: CARSI_POLICY_CANARY_${severity}`,
            ].join('\n')
          )
          .join('\n') +
        '\n'
    );
    const output = join(directory, 'report.sarif');
    // trivy-action's SARIF path clears the severity filter unless this input is
    // true. Pin that action input above and mirror it for this real-CLI control.
    const severity =
      severityControl ??
      (input('limit-severities-for-sarif') === 'true'
        ? input('severity')
        : 'UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL');
    const child = spawnSync(
      trivy,
      [
        'fs',
        source,
        '--scanners',
        'secret',
        '--secret-config',
        config,
        '--format',
        'sarif',
        '--output',
        output,
        '--severity',
        severity,
        '--exit-code',
        input('exit-code') ?? '0',
        '--quiet',
      ],
      { encoding: 'utf8', timeout: 30_000 }
    );
    assert.ifError(child.error);
    const report = JSON.parse(readFileSync(output, 'utf8'));
    return { status: child.status, results: report.runs.flatMap((run) => run.results ?? []) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('workflow enforces only HIGH/CRITICAL findings, including SARIF severity handling', () => {
  assert.equal(input('scan-type'), 'fs');
  assert.equal(input('scan-ref'), '.');
  assert.equal(input('format'), 'sarif');
  assert.deepEqual(input('severity')?.split(',').sort(), ['CRITICAL', 'HIGH']);
  assert.equal(input('exit-code'), '1');
  assert.equal(input('limit-severities-for-sarif'), 'true');
  assert.doesNotMatch(job, /continue-on-error:/);
  assert.match(job, /run: node --test scripts\/trivy-policy\.test\.mjs/);
});

for (const severity of ['HIGH', 'CRITICAL']) {
  test(`real Trivy exits nonzero for a synthetic ${severity} finding`, () => {
    const result = scan(severity);
    assert.equal(result.status, 1);
    assert.deepEqual(
      result.results.map((finding) => finding.ruleId),
      [`carsi-policy-${severity.toLowerCase()}`]
    );
  });
}

test('real Trivy keeps MEDIUM-only findings outside the existing blocking policy', () => {
  const control = scan('MEDIUM', 'MEDIUM');
  assert.equal(control.status, 1);
  assert.deepEqual(
    control.results.map((finding) => finding.ruleId),
    ['carsi-policy-medium']
  );
  const result = scan('MEDIUM');
  assert.equal(result.status, 0);
  assert.equal(result.results.length, 0);
});

test('real Trivy exits zero for a clean fixture', () => {
  const result = scan();
  assert.equal(result.status, 0);
  assert.equal(result.results.length, 0);
});

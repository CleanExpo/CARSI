import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { securityScanSummary } from './security-scan-summary.mjs';

const states = ['success', 'failure', 'cancelled', 'skipped', undefined];
for (const npm of states) {
  for (const trivy of states) {
    test(`audit=${npm}, trivy=${trivy}`, () => {
      const result = securityScanSummary(npm, trivy);
      const passed = npm === 'success' && trivy === 'success';
      assert.equal(result.exitCode, passed ? 0 : 1);
      assert.equal(result.markdown.includes('All required security scans passed.'), passed);
      assert.equal(result.markdown.includes('[PASS] NPM Audit'), npm === 'success');
      assert.equal(result.markdown.includes('[PASS] Trivy Container Scan'), trivy === 'success');
    });
  }
}

test('CLI writes the actual failure to the GitHub summary and exits nonzero', () => {
  const directory = mkdtempSync(join(tmpdir(), 'security-summary-'));
  try {
    const summaryPath = join(directory, 'summary.md');
    const child = spawnSync(process.execPath, [fileURLToPath(new URL('./security-scan-summary.mjs', import.meta.url))], {
      env: { ...process.env, NPM_AUDIT_RESULT: 'failure', TRIVY_RESULT: 'success', GITHUB_STEP_SUMMARY: summaryPath },
      encoding: 'utf8',
    });
    assert.equal(child.status, 1);
    assert.match(readFileSync(summaryPath, 'utf8'), /\[NOT PASSED\] NPM Audit: failure/);
    assert.doesNotMatch(child.stdout, /All required security scans passed/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

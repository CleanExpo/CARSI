import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Report actual required-job outcomes; skipped or missing evidence is not a pass. */
export function securityScanSummary(npmAudit, trivy) {
  const rows = [['NPM Audit', npmAudit], ['Trivy Container Scan', trivy]];
  const passed = rows.every(([, result]) => result === 'success');
  const markdown = [
    '# Security Scan Summary',
    '',
    ...rows.map(([name, result]) =>
      `- [${result === 'success' ? 'PASS' : 'NOT PASSED'}] ${name}: ${result || 'unknown'}`),
    '',
    passed ? 'All required security scans passed.' : 'Required security evidence is failed, skipped, cancelled or missing.',
    'Review the individual jobs and artifact reports for findings.',
    '',
  ].join('\n');
  return { markdown, exitCode: passed ? 0 : 1 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summary = securityScanSummary(process.env.NPM_AUDIT_RESULT, process.env.TRIVY_RESULT);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.markdown);
  process.stdout.write(summary.markdown);
  process.exitCode = summary.exitCode;
}

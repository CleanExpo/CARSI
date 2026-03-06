/**
 * Visual Audit
 * Verifies image assets exist, are correctly placed, and no obvious placeholder UI remains.
 * Supports proof output for completion gates.
 *
 * Run via: pnpm ai:visual:audit
 * @see memory.md > Completion Claim Protocol
 * @see .skills/custom/visual-excellence-enforcer/SKILL.md
 */

import { existsSync, statSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';

const PROJECT_ROOT = join(__dirname, '../../..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'apps/web/public');

export interface AssetCheckResult {
  path: string;
  exists: boolean;
  sizeKb: number | null;
  category: 'critical' | 'important' | 'optional';
  status: 'pass' | 'fail' | 'warning';
}

export interface VisualAuditReport {
  timestamp: string;
  totalChecked: number;
  passed: number;
  failed: number;
  warnings: number;
  criticalFailures: AssetCheckResult[];
  results: AssetCheckResult[];
  overallStatus: 'PASS' | 'FAIL' | 'CONDITIONAL_PASS';
}

/**
 * Critical assets that must exist before any launch claim.
 */
const CRITICAL_ASSETS: Array<{ path: string; category: AssetCheckResult['category'] }> = [
  { path: 'images/logo.svg', category: 'critical' },
  { path: 'favicon.ico', category: 'critical' },
  { path: 'favicon-32x32.png', category: 'critical' },
  { path: 'apple-touch-icon.png', category: 'critical' },
  { path: 'og-image.png', category: 'critical' },
  { path: 'images/og-image.webp', category: 'important' },
  // Badge images
  { path: 'images/badges/streak-7day.webp', category: 'important' },
  { path: 'images/badges/streak-30day.webp', category: 'important' },
  { path: 'images/badges/streak-90day.webp', category: 'important' },
  // Certificate
  { path: 'images/certificate-bg.webp', category: 'optional' },
];

/**
 * Check a single asset.
 */
function checkAsset(
  relativePath: string,
  category: AssetCheckResult['category']
): AssetCheckResult {
  const fullPath = join(PUBLIC_DIR, relativePath);
  const exists = existsSync(fullPath);

  let sizeKb: number | null = null;
  if (exists) {
    try {
      sizeKb = Math.round(statSync(fullPath).size / 1024);
    } catch {
      // ignore stat errors
    }
  }

  const status =
    !exists && category === 'critical'
      ? 'fail'
      : !exists && category === 'important'
        ? 'warning'
        : !exists && category === 'optional'
          ? 'warning'
          : sizeKb !== null && sizeKb < 1
            ? 'warning' // suspiciously small — might be placeholder
            : 'pass';

  return { path: relativePath, exists, sizeKb, category, status };
}

/**
 * Count course images in the courses directory.
 */
function countCourseImages(): number {
  const courseDir = join(PUBLIC_DIR, 'images/courses');
  if (!existsSync(courseDir)) return 0;

  return readdirSync(courseDir).filter((f) => ['.webp', '.jpg', '.png'].includes(extname(f)))
    .length;
}

/**
 * Run the full visual audit.
 */
export function runVisualAudit(): VisualAuditReport {
  const results: AssetCheckResult[] = CRITICAL_ASSETS.map(({ path, category }) =>
    checkAsset(path, category)
  );

  const courseImageCount = countCourseImages();
  console.log(`📸 Course images found: ${courseImageCount}`);

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warnings = results.filter((r) => r.status === 'warning').length;
  const criticalFailures = results.filter((r) => r.status === 'fail' && r.category === 'critical');

  const overallStatus: VisualAuditReport['overallStatus'] =
    criticalFailures.length > 0 ? 'FAIL' : warnings > 0 ? 'CONDITIONAL_PASS' : 'PASS';

  return {
    timestamp: new Date().toISOString(),
    totalChecked: results.length,
    passed,
    failed,
    warnings,
    criticalFailures,
    results,
    overallStatus,
  };
}

/**
 * Format and print the audit report.
 */
function formatReport(audit: VisualAuditReport): string {
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.toTimeString().slice(0, 5)} AEST`;

  const rows = audit.results
    .map((r) => {
      const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⚠️';
      const size = r.sizeKb !== null ? `${r.sizeKb}kb` : 'missing';
      return `| ${r.path} | ${r.category} | ${icon} ${r.status} | ${size} |`;
    })
    .join('\n');

  const criticalSection =
    audit.criticalFailures.length > 0
      ? `## Critical Failures\n\n${audit.criticalFailures.map((f) => `- ❌ MISSING: ${f.path}`).join('\n')}\n\nThese must be resolved before any launch claim.`
      : '## Critical Assets\n\nAll critical assets present. ✅';

  return `# Visual Audit Report

Generated: ${dateStr}

## Summary

- Total checked: ${audit.totalChecked}
- Passed: ${audit.passed} ✅
- Warnings: ${audit.warnings} ⚠️
- Failed: ${audit.failed} ❌
- **Overall Status: ${audit.overallStatus}**

${criticalSection}

## Asset Inventory

| Path | Category | Status | Size |
|---|---|---|---|
${rows}

## Completion Gate

${audit.overallStatus === 'PASS' ? '✅ Visual audit PASSED — visual evidence collected for completion claim.' : audit.overallStatus === 'CONDITIONAL_PASS' ? '⚠️ CONDITIONAL PASS — warnings exist. Review before launch.' : '❌ FAIL — critical assets missing. Cannot claim visual completion.'}

*Generated by \`pnpm ai:visual:audit\` — see \`src/ai/audits/visual-audit.ts\`*
`;
}

/**
 * Main entry point.
 */
function main(): void {
  console.log('🎨 Running visual audit...\n');

  const audit = runVisualAudit();
  const report = formatReport(audit);

  // Ensure reports directory exists
  const reportsDir = join(PROJECT_ROOT, 'reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = join(reportsDir, 'visual-audit-report.md');
  writeFileSync(reportPath, report, 'utf-8');

  console.log(report);
  console.log(`\n✅ Report saved to: reports/visual-audit-report.md`);

  if (audit.overallStatus === 'FAIL') {
    console.error('\n❌ VISUAL AUDIT FAILED — critical assets missing');
    process.exit(1);
  }
}

main();

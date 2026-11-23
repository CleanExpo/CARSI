#!/usr/bin/env node
/**
 * Phase 0 — fast automated subset before founder demos.
 * See docs/runbooks/product-excellence-smoke.md
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const STEPS = [
  {
    label: 'carsi product analytics',
    cmd: 'npx',
    args: [
      'vitest',
      'run',
      '--config',
      'config/vitest.config.ts',
      'src/lib/analytics/resolve-carsi-data-event-target.test.ts',
      'src/lib/analytics/carsi-link-path.test.ts',
      'src/components/analytics/CarsiProductEventCollector.test.tsx',
      'src/lib/analytics/consent.test.ts',
    ],
  },
  {
    label: 'role-guide conversion',
    cmd: 'npx',
    args: [
      'vitest',
      'run',
      '--config',
      'config/vitest.config.ts',
      'src/lib/marketing/role-guide-conversion.test.ts',
    ],
  },
  {
    label: 'coaching home month summary',
    cmd: 'npx',
    args: [
      'vitest',
      'run',
      '--config',
      'config/vitest.config.ts',
      'src/lib/coaching-portal/coaching-home-month-summary.test.ts',
      'src/lib/coaching-portal/coaching-home-month-summary.matrix.test.ts',
      'src/components/marketing/RoleGuidesHubPathfinder.test.tsx',
    ],
  },
  {
    label: 'coaching visual + marketing pack',
    cmd: 'npx',
    args: [
      'vitest',
      'run',
      '--config',
      'config/vitest.config.ts',
      'src/components/coaching-portal/visual',
      'src/lib/coaching-portal/marketing-pack/marketing-pack-view.test.ts',
      'src/components/coaching-portal/CoachingMarketingPackPage.test.tsx',
    ],
  },
  {
    label: 'free enrol + email verify',
    cmd: 'npx',
    args: [
      'vitest',
      'run',
      '--config',
      'config/vitest.config.ts',
      'src/lib/lms/confirm-free-enrolment.test.ts',
      'src/lib/auth/email-verify-token.test.ts',
      'src/lib/server/auth-verify-email-route.test.ts',
    ],
  },
  {
    label: 'live buy-path guard',
    cmd: 'npm',
    args: ['run', 'test:live-buy-path'],
  },
];

let failed = 0;
for (const step of STEPS) {
  process.stdout.write(`→ ${step.label}…\n`);
  const r = spawnSync(step.cmd, step.args, { cwd: root, stdio: 'inherit', env: process.env });
  if (r.status !== 0) {
    failed += 1;
    process.stderr.write(`✗ ${step.label} failed (exit ${r.status ?? 1})\n`);
  }
}

if (failed > 0) {
  process.stderr.write(
    `\n${failed} step(s) failed. See docs/runbooks/product-excellence-smoke.md\n`
  );
  process.exit(1);
}
process.stdout.write('\n✓ product-excellence automated smoke passed\n');

#!/usr/bin/env node
/**
 * Phase 5 — SDA-style evidence gate (orchestrates static + scripted checks).
 * Browser screenshots at 390/768/1440 remain a manual/Playwright follow-up when visuals change.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** @param {string} label @param {string} cmd @param {string[]} args */
function runStep(label, cmd, args) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${r.status ?? 1})`);
    return r.status ?? 1;
  }
  console.log(`✓ ${label}`);
  return 0;
}

const visualsConfig = join(ROOT, 'config/visuals.config.json');
let mode = 'report';
try {
  mode = JSON.parse(readFileSync(visualsConfig, 'utf8')).mode ?? 'report';
} catch {
  console.warn('visuals.config.json missing — check-visuals may exit 2');
}

const steps = [
  ['Legacy skill references', 'npm', ['run', 'audit:skill-references']],
  ['Dependency governance', 'npm', ['run', 'check:approved-dependencies']],
  ['Premium visuals scanner', 'node', ['scripts/premium-visuals/check-visuals.mjs', '--root', '.']],
  ['Product excellence smoke', 'npm', ['run', 'verify:product-excellence']],
];
if (process.env.SDA_FULL === '1') {
  steps.splice(3, 0, ['Prisma client', 'npm', ['run', 'prisma:generate']]);
  steps.splice(4, 0, ['Type check', 'npm', ['run', 'type-check']]);
  if (process.env.SDA_SKIP_A11Y !== '1') {
    steps.push(['Accessibility e2e', 'npm', ['run', 'test:a11y']]);
  }
}

let code = 0;
for (const [label, cmd, args] of steps) {
  const c = runStep(label, cmd, args);
  if (c !== 0) {
    code = c;
    if (label === 'Premium visuals scanner' && mode === 'report') {
      console.warn('Visuals mode is report-only — continuing (see config/visuals.config.json).');
      code = 0;
    } else {
      break;
    }
  }
}

console.log('\n--- SDA evidence reminders ---');
console.log('Capture Playwright screenshots at 390, 768, 1440 px for changed customer pages.');
console.log('Manifest gaps: npm run media:manifest:sync (see .agents/references/premium-visuals-triage.md).');
console.log('Verify prefers-reduced-motion and real media credits in media.manifest.json.');
console.log('Owner visual sign-off still required (.agents/skills/quality/carsi-visual-qa).');

process.exit(code);
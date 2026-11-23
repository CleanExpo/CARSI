#!/usr/bin/env node
/**
 * Phase 2 — runtime dependency governance for CARSI.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const approved = JSON.parse(
  readFileSync(join(ROOT, '.agents/references/approved-dependency-lock.json'), 'utf8')
);

const approvedSet = new Set(approved.approvedRuntime ?? []);
const runtime = Object.keys(pkg.dependencies ?? {});
const unlisted = runtime.filter((name) => !approvedSet.has(name));
const blocked = runtime.filter((name) => (approved.blocked ?? []).includes(name));

if (unlisted.length || blocked.length) {
  console.error('Dependency governance check failed.\n');
  if (unlisted.length) {
    console.error('Runtime packages not in approved-dependency-lock.json approvedRuntime:');
    for (const n of unlisted) console.error(`  - ${n}`);
    console.error('\nUpdate .agents/references/approved-dependency-lock.json after review.');
  }
  if (blocked.length) {
    console.error('Blocked packages present in dependencies:');
    for (const n of blocked) console.error(`  - ${n}`);
  }
  process.exit(1);
}

console.log(`Dependency governance OK (${runtime.length} approved runtime packages).`);
#!/usr/bin/env node
/**
 * Phase 1 — fail if legacy skills/*.skill.md paths are still referenced in active docs/code.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PATTERN = /skills\/[a-z0-9_-]+\/[a-z0-9_-]+\.skill\.md/gi;
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'coverage',
  '.agents/skills',
]);

/** @param {string} dir */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'docs' && dir === ROOT) {
        walk(full, out);
        continue;
      }
      if (full.includes(`${join('docs', 'ai-demonstration')}`)) continue;
      if (full.includes(join('docs', 'plans', 'archive'))) continue;
      if (full.includes(join('docs', 'session-handoffs'))) continue;
      walk(full, out);
    } else if (/\.(md|mjs|ts|tsx|json)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const hits = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, 'utf8');
  const matches = text.match(PATTERN);
  if (matches) {
    hits.push({ file: relative(ROOT, file), matches: [...new Set(matches)] });
  }
}

if (hits.length) {
  console.error('Legacy skill references found (use .agents/skills/ instead):\n');
  for (const h of hits) {
    console.error(`  ${h.file}`);
    for (const m of h.matches) console.error(`    - ${m}`);
  }
  process.exit(1);
}

console.log('No legacy skills/*.skill.md references in active tree.');
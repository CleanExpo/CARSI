#!/usr/bin/env node
/**
 * Report any remaining `[COMPANY TO CONFIRM …]` placeholders in the onboarding docs.
 *
 * Use it to confirm the pack is fully company-specific before issuing to staff:
 *   node scripts/check-company-placeholders.mjs
 * Exit code 0 = none outstanding; 1 = some remain (and they are listed).
 *
 * `HANDOFF.md` and `COMPANY-DETAILS.md` are skipped — they describe the markers rather than use them.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DOCS_DIR = join(ROOT, 'docs', 'onboarding');
const SKIP_FILES = new Set(['HANDOFF.md', 'COMPANY-DETAILS.md']);
const MARKER = /\[COMPANY TO CONFIRM[^\]]*\]/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

let total = 0;
const byFile = [];
for (const file of walk(DOCS_DIR)) {
  if (SKIP_FILES.has(relative(DOCS_DIR, file))) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    const matches = line.match(MARKER);
    if (matches) hits.push({ line: i + 1, count: matches.length, text: line.trim() });
  });
  if (hits.length) {
    byFile.push({ file: relative(ROOT, file), hits });
    total += hits.reduce((n, h) => n + h.count, 0);
  }
}

if (total === 0) {
  console.log('✓ No [COMPANY TO CONFIRM] placeholders outstanding in docs/onboarding.');
  process.exit(0);
}

console.log(`✗ ${total} [COMPANY TO CONFIRM] placeholder(s) still to fill (see COMPANY-DETAILS.md):\n`);
for (const { file, hits } of byFile) {
  console.log(`  ${file} — ${hits.reduce((n, h) => n + h.count, 0)}`);
  for (const h of hits) console.log(`    L${h.line}: ${h.text.slice(0, 100)}`);
}
process.exit(1);

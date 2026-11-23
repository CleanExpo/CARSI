#!/usr/bin/env node
/**
 * Mirrors .agents/skills into .cursor/skills so Cursor discovers project skills.
 * Uses directory symlinks (safe to re-run).
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, '.agents', 'skills');
const TARGET = join(ROOT, '.cursor', 'skills');

function linkTree(srcRel, destRel) {
  const srcAbs = join(ROOT, srcRel);
  const destAbs = join(ROOT, destRel);
  mkdirSync(dirname(destAbs), { recursive: true });
  if (existsSync(destAbs)) {
    const st = lstatSync(destAbs);
    if (st.isSymbolicLink()) rmSync(destAbs);
    else if (st.isDirectory()) {
      console.warn(`Skip ${destRel} (real directory exists)`);
      return;
    } else rmSync(destAbs);
  }
  const relTarget = relative(dirname(destAbs), srcAbs);
  symlinkSync(relTarget, destAbs);
}

try {
  mkdirSync(join(ROOT, '.cursor'), { recursive: true });
} catch (e) {
  console.error(
    `Cannot create .cursor/ (${e instanceof Error ? e.message : e}). Skills remain at .agents/skills/.`
  );
  process.exit(e && typeof e === 'object' && 'code' in e && e.code === 'EPERM' ? 0 : 1);
}

for (const name of readdirSync(SOURCE)) {
  const src = join(SOURCE, name);
  if (!existsSync(src)) continue;
  linkTree(`.agents/skills/${name}`, `.cursor/skills/${name}`);
}

console.log(`Cursor skills mirror updated: ${relative(ROOT, TARGET)} → .agents/skills`);
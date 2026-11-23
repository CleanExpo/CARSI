#!/usr/bin/env node
/**
 * Verifies the CARSI Product Engineering Skill System is complete on disk.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SKILLS = join(ROOT, '.agents', 'skills');
const REFS = join(ROOT, '.agents', 'references');
const BOOT = join(ROOT, 'scripts/bootstrap-carsi-agent-skills.mjs');

const REQUIRED_REFS = [
  'engineering-principle.md',
  'authoritative-docs.md',
  'approved-libraries.md',
  'approved-dependency-lock.json',
  'quality-gates.md',
  'visual-surfaces.md',
  'interactive-learning-patterns.md',
  'premium-visuals-triage.md',
];

const errors = [];

function walkSkills(dir, prefix = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...walkSkills(p, prefix ? `${prefix}/${name}` : name));
    } else if (name === 'SKILL.md') {
      out.push(prefix ? `${prefix}/${name}` : name);
    }
  }
  return out;
}

const manifestIds = [];
const boot = readFileSync(BOOT, 'utf8');
for (const m of boot.matchAll(/id:\s*'([^']+)'/g)) manifestIds.push(m[1]);

const skillFiles = walkSkills(SKILLS).filter((p) => p.endsWith('SKILL.md'));
const idsOnDisk = skillFiles
  .map((p) => p.replace(/\/SKILL\.md$/, ''))
  .map((p) => p.split('/').pop());

if (idsOnDisk.length !== manifestIds.length) {
  errors.push(`skill count: manifest ${manifestIds.length}, disk ${idsOnDisk.length}`);
}
for (const id of manifestIds) {
  if (!idsOnDisk.includes(id)) errors.push(`missing skill on disk: ${id}`);
}
for (const id of idsOnDisk) {
  if (!manifestIds.includes(id)) errors.push(`extra skill on disk not in manifest: ${id}`);
}

for (const rel of skillFiles) {
  const text = readFileSync(join(SKILLS, rel), 'utf8');
  if (!/^---\nname:\s/m.test(text)) errors.push(`${rel}: missing name in frontmatter`);
  if (!/^---[\s\S]*?description:\s/m.test(text)) errors.push(`${rel}: missing description in frontmatter`);
}

for (const f of REQUIRED_REFS) {
  if (!existsSync(join(REFS, f))) errors.push(`missing reference: .agents/references/${f}`);
}

for (const entry of ['AGENTS.md', '.claude/CLAUDE.md']) {
  const p = join(ROOT, entry);
  if (!existsSync(p)) {
    errors.push(`missing entrypoint: ${entry}`);
    continue;
  }
  const t = readFileSync(p, 'utf8');
  if (!t.includes('.agents/skills')) errors.push(`${entry} does not reference .agents/skills`);
}

const sdaMjs = join(ROOT, 'scripts/quality/sda-evidence-gate.mjs');
const sdaPy = join(ROOT, 'scripts/quality/sda_evidence_gate.py');
if (!existsSync(sdaMjs)) errors.push('missing scripts/quality/sda-evidence-gate.mjs');
if (!existsSync(sdaPy)) errors.push('missing scripts/quality/sda_evidence_gate.py');

if (errors.length) {
  console.error('Agent skill system verification failed:\n');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `Agent skill system OK (${manifestIds.length} skills, ${REQUIRED_REFS.length} references, entrypoints wired).`
);
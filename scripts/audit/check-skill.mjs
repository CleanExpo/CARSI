#!/usr/bin/env node
/** GP-567 c7 verifier — course-truth skill exists, valid frontmatter, within the 200-line cap. */
import fs from 'node:fs';

const FILE = '.claude/skills/course-truth/SKILL.md';
const fail = (m) => {
  console.error(`FAIL c7: ${m}`);
  process.exit(1);
};

if (!fs.existsSync(FILE)) fail(`missing ${FILE}`);
const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n').length;

const fm = src.match(/^---\n([\s\S]*?)\n---\n/);
if (!fm) fail('no YAML frontmatter block');
if (!/^name:\s*course-truth\s*$/m.test(fm[1])) fail('frontmatter has no name: course-truth');
if (!/^description:\s*\S/m.test(fm[1])) fail('frontmatter has no description');
if (lines > 200) fail(`SKILL.md is ${lines} lines, over the 200-line soft cap`);

// The skill must not claim wiring that does not exist.
if (/wired into the Course Builder|is wired as a mandatory/i.test(src) && !/does not exist yet/i.test(src)) {
  fail('skill claims Course Builder wiring without recording that the Course Builder does not exist');
}

console.log(`OK c7: skill present, frontmatter valid, ${lines}/200 lines`);

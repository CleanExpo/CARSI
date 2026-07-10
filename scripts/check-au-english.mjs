#!/usr/bin/env node
/**
 * Australian-English course-content guard.
 *
 * CARSI courses are Australian-produced (see CLAUDE.md § "Course production").
 * The IICRC-CEC terminology guard only scans .tsx/.mdx source copy — it never
 * reads the JSON course catalogue, where the lesson content actually lives. So
 * US spellings and US power specs could ship in course data undetected. This
 * guard closes that gap: it scans the course-DATA JSON for high-confidence US
 * forms (color/odor/behavior/mold/fiber/centre/defence/…) and US mains specs
 * (115 V, NEMA, "15 A circuit"), stripping embedded HTML/CSS first so Elementor
 * `color:` rules aren't mistaken for prose.
 *
 * Deliberately conservative: plural-aware, AU forms never match, and US voltages
 * explicitly labelled as US ("US-120 V → AU-240 V") are teaching contrasts, not
 * defects, so they're exempt. Verified false positive? Commit with --no-verify.
 *
 *   node scripts/check-au-english.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Course-content data files (AU-produced copy lives here).
const COURSE_DATA = [
  'data/seed/courses-catalog.json',
  '.curation/rollout-courses.json',
  'data/wordpress-export/courses.json',
];

// allowBefore: if the ~8 chars before a match satisfy it, the match is exempt.
const RULES = [
  { re: /\bcolors?\b/i, msg: 'US spelling — use "colour".' },
  { re: /\bodors?\b/i, msg: 'US spelling — use "odour".' },
  { re: /\bbehaviors?\b/i, msg: 'US spelling — use "behaviour".' },
  { re: /\bmolds?\b/i, msg: 'US spelling — use "mould".' },
  { re: /\bmicrofibers?\b/i, msg: 'US spelling — use "microfibre".' },
  { re: /\bfiberglass\b/i, msg: 'US spelling — use "fibreglass".' },
  { re: /\bfibers?\b/i, msg: 'US spelling — use "fibre".' },
  { re: /\bcenters?\b/i, allowAfter: /^\s+for\s+(Disease\s+Control|Medicare|Medicaid)/i, msg: 'US spelling — use "centre".' },
  { re: /\bdefenses?\b/i, msg: 'US spelling — use "defence".' },
  { re: /\baluminum\b/i, msg: 'US spelling — use "aluminium".' },
  { re: /\bliters?\b/i, msg: 'US spelling — use "litre".' },
  { re: /\b1(?:10|15|20)\s?V(?:olts?)?\b/i, allowBefore: /US[\s-]?$/i, msg: 'US mains voltage — CARSI is 230 V / 50 Hz (label US specs "US-…" if contrasting).' },
  { re: /\bNEMA\b/, msg: 'US plug standard — use AS/NZS 3112 / 10 A GPO.' },
  { re: /\b(?:15|20)\s?A(?:mp)?\s+circuit\b/i, msg: 'US circuit framing — redo at 230 V (10 A / 16 A / 20 A AU circuits).' },
];

function normalize(s) {
  return s
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ');
}

const findings = [];
function walk(node, file, path) {
  if (node == null) return;
  if (typeof node === 'string') {
    const text = normalize(node);
    for (const rule of RULES) {
      const m = text.match(rule.re);
      if (!m) continue;
      const i = m.index ?? 0;
      if (rule.allowBefore && rule.allowBefore.test(text.slice(Math.max(0, i - 8), i))) continue;
      if (rule.allowAfter && rule.allowAfter.test(text.slice(i + m[0].length, i + m[0].length + 30))) continue;
      const ev = text.slice(Math.max(0, i - 30), i + m[0].length + 30).trim();
      findings.push(`  ${file} → ${path}: matched "${m[0]}" — ${rule.msg}\n    → …${ev}…`);
    }
    return;
  }
  if (Array.isArray(node)) { node.forEach((v, idx) => walk(v, file, `${path}[${idx}]`)); return; }
  if (typeof node === 'object') { for (const [k, v] of Object.entries(node)) walk(v, file, path ? `${path}.${k}` : k); }
}

const tracked = new Set(execSync('git ls-files', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n'));
for (const file of COURSE_DATA) {
  if (!tracked.has(file)) continue;
  let json;
  try { json = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { console.error(`check-au-english: cannot parse ${file}: ${e.message}`); process.exit(1); }
  walk(json, file, '');
}

if (findings.length > 0) {
  console.error('\n✖ Australian-English course-content guard failed\n');
  console.error('CARSI courses are Australian-produced. Fix these US forms in course data:\n');
  console.error(findings.join('\n'));
  console.error('\nSee CLAUDE.md § "Course production". Verified false positive? git commit --no-verify\n');
  process.exit(1);
}
console.log('✓ Australian-English course-content guard passed.');
process.exit(0);

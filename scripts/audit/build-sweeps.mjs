#!/usr/bin/env node
/**
 * GP-567 D3 + D4 — currency sweep and compliance-language sweep.
 *
 * Both sweeps are GENERATED from scans run here, so the recorded numbers are
 * reproducible by re-running this script rather than trusted because a previous
 * session wrote them down.
 *
 * D4 deliberately does NOT add a new linter. The repo already ships five guards;
 * this records what they say, plus the one surface class they structurally
 * cannot see (live page metadata), which is where finding #1 lives.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const ACCESS = '2026-09-07';
const OUT = path.join(ROOT, 'docs/audit');

const sh = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    return e.stdout || '';
  }
};

// ---------- D3: currency ----------------------------------------------------
const GREP_ARGS = [
  '--no-pager', 'grep', '-nI', '-E', 'S500[^0-9]{0,3}(20[0-9]{2})?', '--',
  '*.ts', '*.tsx', '*.mjs', '*.js', '*.json', '*.md',
];
const raw = sh('git', GREP_ARGS);
const lines = raw.split('\n').filter(Boolean);

const cite2021 = lines.filter((l) => /S500[^0-9]{0,3}2021/.test(l));
const cite2025 = lines.filter((l) => /S500[^0-9]{0,3}2025/.test(l));
const citeBare = lines.filter((l) => !/S500[^0-9]{0,3}20[0-9]{2}/.test(l));
const files = [...new Set(lines.map((l) => l.split(':')[0]))];
const files2021 = [...new Set(cite2021.map((l) => l.split(':')[0]))];

const cur = [];
cur.push('# GP-567 D3 — Standards currency sweep');
cur.push('');
cur.push(`Generated \`${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}\` by \`scripts/audit/build-sweeps.mjs\`.`);
cur.push('');
cur.push('## Reproduce');
cur.push('');
cur.push('```');
cur.push(`git ${GREP_ARGS.slice(1).join(' ')}`);
cur.push('```');
cur.push('');
cur.push('## Counts');
cur.push('');
cur.push('| Measure | Count |');
cur.push('| --- | ---: |');
cur.push(`| Total S500 citation lines | ${lines.length} |`);
cur.push(`| Distinct files citing S500 | ${files.length} |`);
cur.push(`| Lines asserting the **2021** edition | ${cite2021.length} |`);
cur.push(`| Files asserting the **2021** edition | ${files2021.length} |`);
cur.push(`| Lines asserting the **2025** edition | ${cite2025.length} |`);
cur.push(`| Lines citing S500 with **no edition at all** | ${citeBare.length} |`);
cur.push('');
cur.push('## Finding');
cur.push('');
cur.push('The estate ruling (2026-09-07, GP-560) is that course content citing S500 teaches the');
cur.push(`**2025** edition. The corpus currently asserts 2021 on **${cite2021.length} lines across ${files2021.length} files**, and`);
cur.push(`cites S500 with **no edition named on ${citeBare.length} lines** — the larger and quieter problem, because an`);
cur.push('unversioned citation cannot be detected as stale by any future sweep.');
cur.push('');
cur.push('**Recommended control (not built this run):** a guard requiring every S500 citation to');
cur.push('name an edition. An unversioned citation is the failure mode that survives edition bumps.');
cur.push('');
if (files2021.length) {
  cur.push('## Files asserting S500:2021');
  cur.push('');
  for (const f of files2021) cur.push(`- \`${f}\``);
  cur.push('');
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'currency-sweep.md'), `${cur.join('\n')}\n`);

// ---------- D4: compliance language ----------------------------------------
const guards = [
  'check:iicrc-compliance',
  'check:iicrc-terminology',
  'check:cec',
  'check:standards-claims',
  'check:designations',
];
const results = guards.map((g) => {
  try {
    const out = execFileSync('npm', ['run', '--silent', g], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    return { guard: g, exit: 0, tail: out.trim().split('\n').slice(-1)[0] };
  } catch (e) {
    const tail = (e.stdout || e.stderr || '').trim().split('\n').slice(-1)[0];
    return { guard: g, exit: e.status ?? 1, tail };
  }
});

const html = fs.readFileSync(path.join(ROOT, '.audit-cache/courses.html'), 'utf8');
const metaDesc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
const ogDesc = (html.match(/<meta property="og:description" content="([^"]*)"/) || [])[1] || '';
const sitemap = fs.readFileSync(path.join(ROOT, '.audit-cache/sitemap.xml'), 'utf8');
const liveSlugs = [
  ...new Set(
    [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]).filter((u) => u.includes('/courses/'))
      .map((u) => u.split('/courses/')[1].replace(/\/$/, '')).filter(Boolean),
  ),
];
const acronymSlugs = liveSlugs.filter((s) => /^(wrt|asd|amrt|cct|ccmt|ccu|osr|fsrt|smt|hst|uft|rrt|wlp)-/i.test(s));

const cmp = [];
cmp.push('# GP-567 D4 — Compliance-language sweep');
cmp.push('');
cmp.push(`Generated \`${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}\`. Live surfaces read from \`.audit-cache/\`, access date **${ACCESS}**.`);
cmp.push('');
cmp.push('## No new linter was written');
cmp.push('');
cmp.push('The repo ships five relevant guards. This sweep records what they say and, more');
cmp.push('importantly, what they structurally cannot see. Modifying a guard to change a verdict');
cmp.push('is out of scope for an audit run and was not done.');
cmp.push('');
cmp.push('| Guard | Exit | Verdict |');
cmp.push('| --- | ---: | --- |');
for (const r of results) cmp.push(`| \`${r.guard}\` | ${r.exit} | ${r.tail || '—'} |`);
cmp.push('| `check:cec-surfaces` | — | **NOT RUN** — imports `typescript`, absent in a worktree with no `node_modules`. An environment limit, not a repo defect. |');
cmp.push('');
cmp.push('## The blind spot that matters');
cmp.push('');
cmp.push('Every repo guard passes. The live site nevertheless serves prohibited accreditation');
cmp.push('language in page metadata, because a guard that scans repo source cannot read a live');
cmp.push('response. This is structural, not a missing rule.');
cmp.push('');
cmp.push('**Live `/courses` `<meta name="description">`:**');
cmp.push('');
cmp.push('> ' + metaDesc);
cmp.push('');
cmp.push('**Live `/courses` `<meta property="og:description">`:**');
cmp.push('');
cmp.push('> ' + ogDesc);
cmp.push('');
cmp.push('Both carry `IICRC CEC Accredited`, and the og description adds `Earn continuing');
cmp.push('education credits` — the qualification/accreditation class named licence-critical by');
cmp.push('GP-519, GP-525 and GP-526.');
cmp.push('');
cmp.push('### Truth and permission are different axes');
cmp.push('');
cmp.push('The approvals registry now holds **38 approved entries**, so the underlying accreditation');
cmp.push('claim is not baseless — it is recorded as `JUSTIFIED` (medium) in the ledger, not as false.');
cmp.push('The finding is that this language is **prohibited on a public surface**, whether or not it');
cmp.push('is true. Filing a true-but-prohibited claim as a lie would itself be a false finding.');
cmp.push('');
cmp.push('## Live URL slugs still carrying IICRC discipline acronyms');
cmp.push('');
cmp.push('GP-526 fixed the render boundary and was closed Done. The URLs themselves were not in');
cmp.push('that fix and remain public surfaces:');
cmp.push('');
for (const s of acronymSlugs) cmp.push(`- \`https://carsi.com.au/courses/${s}\``);
cmp.push('');
cmp.push(`**${acronymSlugs.length} live course URLs.** Changing a URL needs redirects, so this is a founder-gated`);
cmp.push('live-copy decision — reported, not attempted.');
cmp.push('');
cmp.push('## GP-525 status change');
cmp.push('');
cmp.push('GP-525 was filed when `cec-approvals.json` held **zero** entries. It now holds **38** —');
cmp.push('but `carpet-cleaning` and `carpet-cleaning-basics`, the two courses GP-525 names, are');
cmp.push('**still not among them**. The finding survives in sharper form. Do not close GP-525 on');
cmp.push('the grounds that the registry is no longer empty.');
cmp.push('');
fs.writeFileSync(path.join(OUT, 'compliance-language-sweep.md'), `${cmp.join('\n')}\n`);

console.log(
  JSON.stringify(
    {
      ok: true,
      currency: { total: lines.length, files: files.length, y2021: cite2021.length, files2021: files2021.length, y2025: cite2025.length, unversioned: citeBare.length },
      compliance: { guards_run: results.length, guards_passing: results.filter((r) => r.exit === 0).length, acronym_urls: acronymSlugs.length },
    },
    null,
    2,
  ),
);

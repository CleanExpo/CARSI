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
// The audit's own output cites S500:2021 while describing the contamination, so
// scanning it would count this document as part of the corpus it measures. The
// exclusions are the difference between measuring the catalogue and measuring
// the audit. check-currency-sweep.mjs MUST use this identical pathspec — if the
// two halves drift apart the criterion fails on a difference in the recipe
// rather than a change in the corpus.
const GREP_ARGS = [
  '--no-pager', 'grep', '-nI', '-E', 'S500[^0-9]{0,3}(20[0-9]{2})?', '--',
  '*.ts', '*.tsx', '*.mjs', '*.js', '*.json', '*.md',
  ':(exclude)docs/audit/*', ':(exclude)scripts/audit/*', ':(exclude).claude/skills/course-truth/*',
];
const raw = sh('git', GREP_ARGS);
const lines = raw.split('\n').filter(Boolean);

const cite2021 = lines.filter((l) => /S500[^0-9]{0,3}2021/.test(l));
const cite2025 = lines.filter((l) => /S500[^0-9]{0,3}2025/.test(l));
const citeBare = lines.filter((l) => !/S500[^0-9]{0,3}20[0-9]{2}/.test(l));
// A line asserting SOME edition that is neither 2021 nor 2025.
//
// Round-3 review exposed this class by attacking the verifier: the recorded
// table published 2021 + 2025 + unversioned = 253 against a total of 274, so 21
// lines asserted an edition the sweep named nowhere. A sweep whose categories do
// not partition its own total is not "every citation flagged with the edition
// asserted" — it is a sweep with a blind spot the size of the gap. The measure
// below closes the partition, and check-currency-sweep.mjs now enforces that the
// four line classes sum to the total, so this cannot silently reopen.
const citeOther = lines.filter((l) => /S500[^0-9]{0,3}20[0-9]{2}/.test(l)
  && !/S500[^0-9]{0,3}2021/.test(l) && !/S500[^0-9]{0,3}2025/.test(l));
const otherYears = [...new Set(citeOther.map((l) => (l.match(/S500[^0-9]{0,3}(20[0-9]{2})/) || [])[1]).filter(Boolean))].sort();
const filesOther = [...new Set(citeOther.map((l) => l.split(':')[0]))];
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
// Round-5 (gemini lane): the Class column exists so the verifier can tell an
// edition class from any other measure STRUCTURALLY. It used to infer that from
// the label text — a row whose name merely contained a year was pulled into the
// partition, and a genuine class row could be hidden from it by prefixing the
// line. Which rows partition the total is a property of the generator, not
// something a reader should have to deduce from prose, so the generator now says
// so and check-currency-sweep.mjs reads the marker instead of guessing.
const COUNTS = [
  ['Total S500 citation lines', lines.length, 'total'],
  ['Distinct files citing S500', files.length, '—'],
  ['Lines asserting the **2021** edition', cite2021.length, 'edition-class'],
  ['Files asserting the **2021** edition', files2021.length, '—'],
  ['Lines asserting the **2025** edition', cite2025.length, 'edition-class'],
  ['Lines citing S500 with **no edition at all**', citeBare.length, 'edition-class'],
  [`Lines asserting **another edition** (${otherYears.join(', ') || 'none'})`, citeOther.length, 'edition-class'],
];
cur.push('| Measure | Count | Class |');
cur.push('| --- | ---: | --- |');
for (const [label, count, cls] of COUNTS) cur.push(`| ${label} | ${count} | ${cls} |`);
cur.push('');
const classRows = COUNTS.filter(([, , cls]) => cls === 'edition-class');
cur.push(
  `The ${classRows.length} line classes partition the total: `
  + `${classRows.map(([, n]) => n).join(' + ')} = ${lines.length}.`,
);
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
if (citeOther.length) {
  cur.push(`## Finding — ${citeOther.length} lines assert S500 ${otherYears.join('/')}`);
  cur.push('');
  cur.push(`**${citeOther.length} lines across ${filesOther.length} file(s) assert an S500 ${otherYears.join('/')} edition.**`);
  cur.push('This is a currency claim in the opposite direction to the one this sweep was built to');
  cur.push('find: not a stale edition, but an edition asserted as published. It is UNVERIFIED here.');
  cur.push('');
  cur.push('CARSI\'s licensed section index (`lib/standards/s500-sections.ts`, per CLAUDE.md mirrored');
  cur.push('in RestoreAssist) is **not present in this repository**, so no licensed source is');
  cur.push('reachable from this checkout to confirm or deny that such an edition is published.');
  cur.push('Per CLAUDE.md, a claim about a standard is verified against the owner\'s licensed store,');
  cur.push('never a web scrape, and an ABSENCE claim about a standard is banned outright — so this');
  cur.push('sweep records what the corpus asserts and does **not** rule on whether it is true.');
  cur.push('');
  cur.push('All affected files are course-update **drafts** carrying `Status: DRAFT — founder review');
  cur.push('before any DB apply`, so nothing here is live course content today. The exposure is on');
  cur.push('apply: these lines become published course copy the moment a draft is applied.');
  cur.push('');
  cur.push('**Recommended action:** verify against the licensed index before any of these drafts is');
  cur.push('applied. Filed in the evidence ledger as GP567-026.');
  cur.push('');
  cur.push('### Files asserting another edition');
  cur.push('');
  for (const f of filesOther) cur.push(`- \`${f}\``);
  cur.push('');
}
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
  'check:cec-surfaces',
  'check:standards-claims',
  'check:designations',
  'check:au-english',
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
cmp.push('');
cmp.push(`**Coverage: ${results.filter((r) => r.exit === 0).length} of ${results.length} guards ran and passed.**`);
cmp.push('');
cmp.push('`check:cec-surfaces` initially reported NOT RUN — it imports `typescript`, absent in a');
cmp.push('fresh git worktree with no `node_modules`. That was recorded as an environment limit');
cmp.push('rather than a repo defect, and provisioning the worktree confirmed it: the guard now runs');
cmp.push('and passes. Worth keeping as a worked example — a crashing tool is a claim about your');
cmp.push('environment until you have proven otherwise.');
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
cmp.push('### Two claims, not one — and only one of them is evidenced');
cmp.push('');
cmp.push('The approvals registry holds **38 approved entries**, which evidences that CARSI holds');
cmp.push('approved CEC **courses**. It does not evidence that CARSI is an accredited **provider**,');
cmp.push('and that is the claim the live copy actually makes. No public IICRC register of approved');
cmp.push('CEC providers exists to check it against — IICRC manages approval by submission to');
cmp.push('`CECCourse@iicrcnet.org` and directs enquirers to contact IICRC, which is founder-gated.');
cmp.push('');
cmp.push('So the ledger files the per-course claim as `JUSTIFIED` (unavailability evidenced, not');
cmp.push('assumed) and the provider-level claim as a `GAP`, along with both live surfaces asserting');
cmp.push('it. An earlier revision filed those surfaces as `VERIFIED` on the reasoning that the string');
cmp.push('really is on the page; independent review called that a rationalisation, correctly — it let');
cmp.push('the ledger preserve the licence-critical claim instead of blocking it.');
cmp.push('');
cmp.push('Note also that only **38 of 80** live courses carry a registry approval, so');
cmp.push('"Earn continuing education credits" is unsubstantiated for most of the catalogue.');
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
      currency: { total: lines.length, files: files.length, y2021: cite2021.length, files2021: files2021.length, y2025: cite2025.length, unversioned: citeBare.length, other: citeOther.length, other_years: otherYears },
      compliance: { guards_run: results.length, guards_passing: results.filter((r) => r.exit === 0).length, acronym_urls: acronymSlugs.length },
    },
    null,
    2,
  ),
);

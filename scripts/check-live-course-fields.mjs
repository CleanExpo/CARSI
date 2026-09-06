#!/usr/bin/env node
/**
 * Licence guard for the live course DATA FIELDS — the half `check-live-catalogue.mjs` cannot see.
 *
 * That guard fetches each course PAGE and judges the rendered `<title>` and the slug. This one
 * fetches the course API record and judges the stored fields. The distinction is not academic:
 * measured 2026-09-06, the page guard reported 4 violations while the API held 35, because
 * `iicrc_discipline` is a column the page title never contains. A guard that reads one
 * projection of a record cannot make a claim about the record.
 *
 * WHAT IT CHECKS, and why each is licence-relevant (CLAUDE.md, founder ruling 2026-07-10):
 *
 *  1. `iicrc_discipline` must be null. CARSI courses are never branded with IICRC
 *     Registered-Training-School discipline acronyms. This field is not internal bookkeeping —
 *     it is rendered as an "IICRC <acronym>" badge to signed-in students at
 *     app/(dashboard)/dashboard/courses/[slug]/page.tsx:76.
 *  2. No "[discipline]-aligned" phrasing in title, description or short_description.
 *  3. No banned discipline acronym as a standalone word in those same fields.
 *  4. Every `cec_hours` claim must be backed by an approved entry in the CEC approvals
 *     registry with MATCHING hours. Absence of an approval yields no CEC, never a derived one.
 *
 * THREE TRAPS THIS IS BUILT AROUND, all of which have produced a false green in this repo:
 *
 *  - REACHING NOTHING IS NOT PASSING. Zero courses scanned exits 2, never 0. A network guard
 *    whose green means "I fetched nothing" is a defect this repo has already shipped once.
 *  - AN EMPTY REGISTRY IS NOT "NOTHING APPROVED". If the approvals file parses to zero entries
 *    the guard exits 2 rather than reporting every live CEC claim as unapproved. Measured
 *    2026-09-06: one local checkout held a 510-byte stub with 0 approvals while origin/main
 *    held 38. Reading the stub would have manufactured 27 false licence violations.
 *  - THE VERDICT LOGIC IS PURE AND SEPARATELY TESTABLE. `evaluateCourse` and `evaluateRun` take
 *    plain objects, so the self-test can plant a defect and watch the guard go red without
 *    needing production to be broken. A control only observed green has been tested for its
 *    ability to agree with you.
 *
 * Usage:
 *   node scripts/check-live-course-fields.mjs
 *   node scripts/check-live-course-fields.mjs --json
 *   CARSI_SITE=https://staging.example node scripts/check-live-course-fields.mjs
 *
 * Exit 0 = clean and non-vacuous. 1 = violations found. 2 = could not audit.
 *
 * EXPECTED RED until migration 20260907010000_strip_iicrc_discipline_branding reaches
 * production. Do not add a baseline to make it green — the whole point is that it is currently
 * telling the truth about 35 live courses.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SITE = (process.env.CARSI_SITE || 'https://www.carsi.com.au').replace(/\/$/, '');

/** IICRC Registered-Training-School discipline designations. Mirrors check-live-catalogue.mjs. */
export const BANNED_ACRONYMS = ['WRT', 'ASD', 'AMRT', 'FSRT', 'CCT', 'TCST', 'OCT', 'RRT'];

/** Fields whose prose is judged. */
export const TEXT_FIELDS = ['title', 'description', 'short_description'];

/**
 * Judge one course record. Pure — no network, no filesystem.
 *
 * @param {object} course  API record: { slug, title, description, short_description,
 *                         iicrc_discipline, cec_hours }
 * @param {Map<string, {status: string, hours: number|undefined}>} approvals  CEC registry
 * @returns {string[]} violation strings; empty means clean
 */
export function evaluateCourse(course, approvals) {
  const v = [];
  if (!course || typeof course !== 'object') return ['record is not an object'];

  if (course.iicrc_discipline) {
    v.push(`iicrc_discipline is "${course.iicrc_discipline}" — must be null (CARSI courses carry no IICRC discipline designation)`);
  }

  for (const field of TEXT_FIELDS) {
    const value = course[field];
    if (typeof value !== 'string') continue;
    if (/\b[A-Z]{2,6}-aligned\b/.test(value)) {
      v.push(`${field} contains "[discipline]-aligned" phrasing`);
    }
    for (const a of BANNED_ACRONYMS) {
      if (new RegExp(`\\b${a}\\b`).test(value)) {
        v.push(`${field} contains banned discipline acronym ${a}`);
        break;
      }
    }
  }

  const claimed = course.cec_hours;
  if (claimed !== null && claimed !== undefined && Number(claimed) > 0) {
    const a = approvals.get(course.slug);
    if (!a) {
      v.push(`claims cec_hours=${claimed} with NO entry in the CEC approvals registry`);
    } else if (a.status !== 'approved') {
      v.push(`claims cec_hours=${claimed} but registry status is "${a.status}"`);
    } else if (a.hours !== undefined && Number(a.hours) !== Number(claimed)) {
      v.push(`claims cec_hours=${claimed} but the approved figure is ${a.hours}`);
    }
  }

  return v;
}

/**
 * Decide the run's verdict from what was actually collected. Pure.
 *
 * Separated from evaluateCourse so the non-vacuity rules are testable on their own: they are
 * the rules most likely to be silently wrong, because their failure mode is a clean pass.
 *
 * @returns {{ code: 0|1|2, reason: string }}
 */
export function evaluateRun({ scanned, unreachable, total, approvalsCount, findings }) {
  if (approvalsCount === 0) {
    return { code: 2, reason: 'CEC approvals registry parsed to ZERO entries — refusing to judge CEC claims against an empty registry (this would report every live claim as unapproved)' };
  }
  if (scanned === 0) {
    return { code: 2, reason: `scanned 0 of ${total} courses — reaching nothing is not a pass` };
  }
  if (unreachable > 0) {
    return { code: 2, reason: `${unreachable} of ${total} courses were unreachable — an incomplete scan cannot support a clean verdict` };
  }
  if (findings.length > 0) {
    return { code: 1, reason: `${findings.length} live course(s) carry IICRC branding or an unbacked CEC claim` };
  }
  return { code: 0, reason: `${scanned} live course(s) checked, all clean` };
}

/** Parse the CEC approvals registry into a slug -> {status, hours} map. */
export function parseApprovals(raw) {
  const reg = JSON.parse(raw);
  const entries = Array.isArray(reg) ? reg : (reg.approvals || reg.entries || []);
  const map = new Map();
  for (const e of entries) {
    const slug = e.slug || e.courseSlug;
    if (!slug) continue;
    map.set(slug, { status: e.status || 'approved', hours: e.approvedHours ?? e.hours ?? e.cecHours });
  }
  return map;
}

async function main() {
  const asJson = process.argv.includes('--json');

  let approvals;
  try {
    approvals = parseApprovals(readFileSync(new URL('../data/seed/cec-approvals.json', import.meta.url), 'utf8'));
  } catch (e) {
    console.error(`Could not read the CEC approvals registry: ${e.message}`);
    process.exit(2);
  }

  let slugs;
  try {
    const res = await fetch(`${SITE}/sitemap.xml`, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
    const xml = await res.text();
    slugs = [...xml.matchAll(/<loc>([^<]*\/courses\/[^<]+)<\/loc>/g)]
      .map((m) => m[1].split('/courses/')[1])
      .filter(Boolean);
    slugs = [...new Set(slugs)];
  } catch (e) {
    console.error(`Could not fetch the sitemap: ${e.message}`);
    process.exit(2);
  }

  const findings = [];
  let scanned = 0;
  let unreachable = 0;

  for (const slug of slugs) {
    let record;
    try {
      const res = await fetch(`${SITE}/api/lms/courses/${slug}`, { signal: AbortSignal.timeout(25000) });
      if (!res.ok) { unreachable++; continue; }
      record = await res.json();
    } catch { unreachable++; continue; }
    scanned++;
    const v = evaluateCourse(record, approvals);
    if (v.length) findings.push({ slug, title: record.title, violations: v });
  }

  const verdict = evaluateRun({
    scanned, unreachable, total: slugs.length, approvalsCount: approvals.size, findings,
  });

  if (asJson) {
    console.log(JSON.stringify({ site: SITE, scanned, unreachable, total: slugs.length, approvals: approvals.size, findings, verdict }, null, 2));
    process.exit(verdict.code);
  }

  console.log(`Live course field audit — ${SITE}`);
  console.log(`  sitemap course URLs: ${slugs.length}`);
  console.log(`  API records read:    ${scanned}`);
  console.log(`  unreachable:         ${unreachable}`);
  console.log(`  CEC approvals:       ${approvals.size}`);
  for (const f of findings) {
    console.log(`\n  ${f.slug}`);
    console.log(`    title: ${f.title}`);
    for (const v of f.violations) console.log(`    - ${v}`);
  }
  console.log(`\n${verdict.code === 0 ? 'OK' : 'FAIL'}: ${verdict.reason}`);
  process.exit(verdict.code);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

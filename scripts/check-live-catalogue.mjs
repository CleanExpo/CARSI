#!/usr/bin/env node
/**
 * Licence guard for the LIVE catalogue — the surface every repo-scanning guard is blind to.
 *
 * Measured 2026-08-18: the sitemap lists 80 live courses; `data/seed/courses-catalog.json`
 * holds 37; only 24 appear in both. So 56 live courses — 70% — have no repo representation at
 * all, and `check-iicrc-terminology` / `check-iicrc-compliance` scan repo paths. Their ceiling
 * is 24 of 80. Three live course TITLES carry "(ASD-aligned)", "(CCT-aligned)" and
 * "(FSRT-aligned)" — banned by the CARSI designation rule — and all three are in the 56, so no
 * amount of tightening the repo guards can ever reach them. This one reads production instead.
 *
 * Two traps this guard is built around, both measured on the real site:
 *
 * 1. THE ROUTE SOFT-404s. `/courses/<nonsense>` returns HTTP **200** with
 *    `<title>Course Not Found | CARSI</title>`. Status is useless for existence; invented slugs
 *    look identical to real ones. Existence is decided on the title, never the status code.
 * 2. A NETWORK GUARD CAN PASS BY REACHING NOTHING. Zero courses checked is an ERROR, not a
 *    clean run — a guard whose green means "I fetched nothing" is the failure this repo has
 *    already shipped once, in a guard whose CLI check was always false.
 *
 * Usage:
 *   node scripts/check-live-catalogue.mjs                 # audit the live site
 *   node scripts/check-live-catalogue.mjs --json          # machine-readable
 *   CARSI_SITE=https://staging.example node scripts/...   # point elsewhere
 *
 * Exit 0 = clean and non-vacuous. Exit 1 = violations found. Exit 2 = could not audit
 * (network/sitemap failure) — deliberately NOT 0, because "I could not look" must never read
 * as "nothing is wrong".
 */
import { pathToFileURL } from 'node:url';

const SITE = (process.env.CARSI_SITE || 'https://www.carsi.com.au').replace(/\/$/, '');

/**
 * IICRC Registered-Training-School discipline designations. CLAUDE.md (founder 2026-07-10, MUST):
 * CARSI courses are NEVER branded with these acronyms and NEVER described as "[discipline]-aligned".
 * OCT and RRT are included because `public/llms.txt` shipped both while the acronym rule listed
 * neither — the banned set in prose was wider than the set any guard enforced.
 */
export const BANNED_ACRONYMS = ['WRT', 'ASD', 'AMRT', 'FSRT', 'CCT', 'TCST', 'OCT', 'RRT'];

/**
 * Acronyms that collide with an ordinary lowercase word or abbreviation, where a
 * case-insensitive TITLE match would fire on innocent prose. `OCT` is the designation for
 * Odour Control Technician; "oct" is also how October is abbreviated, and a course title
 * reading "… oct 2026" is not branding. For these, and ONLY these, the title match stays
 * case-sensitive so the designation must be written as the designation.
 *
 * Every other banned acronym is matched case-insensitively in titles: `Water Damage wrt
 * Essentials` and `Water Damage WrT Essentials` both shipped past a case-sensitive rule.
 * This set is a licence-risk trade-off, so keep it as small as the evidence demands and
 * record why each member is here.
 */
export const CASE_SENSITIVE_TITLE_ACRONYMS = new Set(['OCT']);

const NOT_FOUND_MARKER = 'Course Not Found';

/**
 * Exported so the test can prove every rule FIRES without a banned phrase existing on the live
 * site. A guard whose non-vacuity is only ever demonstrated by hand is one refactor away from
 * being decorative — which is exactly how `check-iicrc-terminology` spent an unknown period
 * exiting 0 on every input.
 */
export function scanCourse({ slug, title }) {
  const hits = [];
  for (const a of BANNED_ACRONYMS) {
    // Title: whole-word only, so "Restoration" never trips on "ASD" and a topic name that
    // merely contains the letters is not a violation. Case-insensitive except for the
    // ambiguous set above — a case-sensitive rule let `wrt` and `WrT` through in titles.
    const titleFlags = CASE_SENSITIVE_TITLE_ACRONYMS.has(a) ? '' : 'i';
    if (new RegExp(`\\b${a}\\b`, titleFlags).test(title)) hits.push({ rule: 'title-acronym', detail: a });
    // Slug: any hyphen-delimited SEGMENT, not just the leading one, and case-insensitively.
    // Leading-only let `water-damage-wrt-essentials` through; case-sensitive matching then let
    // `water-damage-WRT-essentials` through, because URLs may carry uppercase. Segment-bounded,
    // so a slug merely containing the letters mid-word stays clean.
    //
    // The TITLE rule above stays case-SENSITIVE on purpose: these are acronyms, and lowercasing
    // it would make the banned token `OCT` match the ordinary month abbreviation "oct" in prose.
    if (new RegExp(`(?:^|-)${a.toLowerCase()}(?:-|$)`, 'i').test(slug)) hits.push({ rule: 'slug-acronym', detail: a });
  }
  if (/-aligned\b/i.test(title)) hits.push({ rule: 'title-aligned', detail: '"-aligned"' });
  return hits;
}

/** A live course is one whose title is not the soft-404 marker. Status is never consulted. */
export function isLiveCourse(title) {
  return Boolean(title) && !title.includes(NOT_FOUND_MARKER);
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'carsi-live-catalogue-guard' } });
  // A non-2xx body is not a course page. Without this, a 500 rendering "Server Error | CARSI"
  // satisfied isLiveCourse() and was counted as a clean live course — the guard reporting
  // "clean" about a page it never really read. The soft-404 case is untouched: that is a real 200.
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function titleOf(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return '';
  return m[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

async function main() {
  const asJson = process.argv.includes('--json');
  let courseUrls;
  try {
    const sitemap = await fetchText(`${SITE}/sitemap.xml`);
    courseUrls = [...new Set(sitemap.match(/https?:\/\/[^<\s]*?\/courses\/[^<\s]+/g) || [])];
  } catch (err) {
    console.error(`cannot audit: sitemap fetch failed for ${SITE} — ${err.message}`);
    process.exit(2);
  }

  if (courseUrls.length === 0) {
    console.error(`cannot audit: sitemap at ${SITE} listed no course URLs.`);
    console.error('Refusing to exit 0 — a guard that reached nothing has not checked anything.');
    process.exit(2);
  }

  const results = [];
  for (const url of courseUrls) {
    const slug = url.replace(/\/$/, '').split('/').pop();
    try {
      results.push({ slug, url, title: titleOf(await fetchText(url)) });
    } catch (err) {
      results.push({ slug, url, title: '', error: err.message });
    }
  }

  const failed = results.filter((r) => r.error);
  const live = results.filter((r) => isLiveCourse(r.title));
  // A sitemap URL that is neither a live course nor the exact soft-404 marker used to be dropped
  // silently: not scanned, not counted as a failure. That is unaudited surface reported as clean.
  const unaccounted = results.filter(
    (r) => !r.error && !isLiveCourse(r.title) && !(r.title || '').includes(NOT_FOUND_MARKER),
  );

  // Scan every successfully fetched URL, not only the live ones: the slug rules do not depend on
  // the title, so a banned slug must still be caught when the title is missing or is a soft-404.
  const violations = results
    .filter((r) => !r.error)
    .map((c) => ({ ...c, hits: scanCourse(c) }))
    .filter((c) => c.hits.length > 0);

  if (asJson) {
    console.log(JSON.stringify({ site: SITE, checked: live.length, violations }, null, 2));
  } else {
    console.log(`Live catalogue licence audit — ${SITE}`);
    console.log(`  sitemap course URLs: ${courseUrls.length}`);
    console.log(`  live (title is not "${NOT_FOUND_MARKER}"): ${live.length}`);
    if (failed.length) console.log(`  fetch failures: ${failed.length}`);
    for (const v of violations) {
      console.log(`\n✗ ${v.slug}`);
      console.log(`    title: ${v.title}`);
      for (const h of v.hits) console.log(`    ${h.rule}: ${h.detail}`);
      console.log(`    ${v.url}`);
    }
  }

  // A banned slug is readable from the URL, so report it even when coverage is incomplete —
  // refusing to audit must not swallow a breach already in hand.
  if (violations.length) {
    console.error(
      `\n${violations.length} live course(s) carry banned IICRC discipline branding. ` +
        'Course data is edited through the admin session, not this repo — see DECISIONS #19.',
    );
    process.exit(1);
  }

  if (live.length === 0) {
    console.error(`cannot audit: fetched ${results.length} course URLs, none returned a usable title.`);
    process.exit(2);
  }

  // Non-vacuity is part of the pass, so the count is always stated. "Clean" without a number is
  // indistinguishable from "checked nothing".
  console.log(`\n✓ ${live.length} live courses clean.`);
  if (failed.length || unaccounted.length) {
    for (const u of unaccounted) console.error(`  unaudited (no usable title): ${u.url}`);
    console.error(
      `but ${failed.length} URL(s) could not be fetched and ${unaccounted.length} returned no ` +
        'usable title — coverage is incomplete.',
    );
    process.exit(2);
  }
}

// pathToFileURL, never `file://` + the raw path: an unencoded space makes the comparison false
// and silently disables the whole script. That defect shipped in three guards in this repo.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`cannot audit: ${err.message}`);
    process.exit(2);
  });
}

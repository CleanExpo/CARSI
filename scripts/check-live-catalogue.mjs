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
 * Acronyms that collide with an ordinary lowercase word or abbreviation. `OCT` is the
 * designation for Odour Control Technician; "oct" is also how October is abbreviated.
 *
 * TITLES: matched case-SENSITIVELY, so the designation must be written as the designation.
 * Case is the disambiguator, and it works — "OCT" fires, "oct 2026" does not.
 * SLUGS: skipped entirely. A slug carries no case signal (they are lowercase by convention),
 * so there is nothing to disambiguate with, and matching produced a false positive on
 * `seasonal-cleaning-oct-2026`.
 *
 * Every other banned acronym is matched case-insensitively in titles and always in slugs.
 * This set is a deliberate licence-risk trade-off: keep it as small as the evidence demands,
 * and record why each member is here.
 */
export const AMBIGUOUS_ACRONYMS = new Set(['OCT']);

/**
 * The IICRC discipline designations written out in full. Every rule above keys on the ACRONYM,
 * so `Water Restoration Technician | CARSI` — the designation spelled out, with no acronym
 * anywhere — passed clean through eight rounds of review. That is the plainest possible form
 * of the thing CLAUDE.md bans: branding a CARSI course with an IICRC discipline designation.
 *
 * Matched as whole phrases, case-insensitively, on the folded title and the hyphenated slug.
 * Deliberately NOT including bare topic words ("water damage", "structural drying"), which are
 * ordinary subject matter CARSI must be free to teach and name.
 */
export const DESIGNATION_PHRASES = {
  WRT: ['water damage restoration technician', 'water restoration technician'],
  ASD: ['applied structural drying technician'],
  AMRT: ['applied microbial remediation technician'],
  FSRT: ['fire and smoke restoration technician'],
  CCT: ['carpet cleaning technician'],
  // TCST is Trauma and Crime Scene Technician. An earlier revision of this map guessed
  // "tile stone and concrete cleaning technician" from memory with no licensed source, and
  // independent review caught it. Both are listed: the wrong one costs nothing to keep, and
  // dropping it silently would hide that the map was once wrong.
  TCST: ['trauma and crime scene technician', 'tile stone and concrete cleaning technician'],
  OCT: ['odour control technician', 'odor control technician'],
  RRT: ['carpet repair and reinstallation technician'],
};

/**
 * AUDIENCE USAGE IS NOT BRANDING — but classifying it must never SUPPRESS a match.
 *
 * Earlier revisions dropped the hit when this returned true. Independent review then found, in
 * three consecutive rounds, that the decision rested on hand-written English word lists: a
 * course noun missing from the list (`Webinar for …`, `Seminar for …`, `Lesson for …`) hid a
 * real violation, while a modifier the list did not expect (`for Every …`, `for New …`) raised
 * a false one. Every round produced another missing word. That is a ratchet, not a fix.
 *
 * So the classification no longer suppresses anything. A designation match is ALWAYS reported;
 * this function only decides whether it counts as BRANDING (drives exit 1) or is listed as an
 * audience NOTE for a human to judge. A word missing from the list now costs a line of noise
 * in a report, not a hidden licence breach — the failure mode is the safe one.
 */
const COURSE_NOUNS =
  /^(a|an|the)?[\s-]*(course|courses|programme|programmes|program|programs|training|certification|qualification|class|classes|workshop|workshops|module|modules|webinar|webinars|seminar|seminars|lesson|lessons|unit|units|masterclass|bootcamp|intensive)$/i;

function isAudienceUsage(haystack, phrase, index) {
  const before = haystack.slice(0, index);
  // Any 0-2 modifier words are allowed after "for": "for the", "for every", "for new",
  // "for all trainee". A closed article list read "for Every <designation>" as branding.
  const m = before.match(/(^|[\s-])for([\s-]+[a-z]+){0,2}[\s-]+$/);
  if (!m) return false;
  const subject = before.slice(0, m.index).replace(/[-\s]+/g, ' ').trim();
  if (!subject) return false;
  // WHOLE-subject match only. Testing the last word too meant `PPE Training for …` and
  // `Respiratory Protection Module for …` were read as branding: a real subject that merely
  // ends in a course noun is still a real subject.
  return !COURSE_NOUNS.test(subject);
}

/**
 * Industry phrases that legitimately produce a banned acronym's letters. `RRT` is the IICRC
 * Carpet Repair and Reinstallation Technician designation, but "Rapid Response Team (RRT)" is
 * ordinary Australian storm-response wording and case cannot tell them apart.
 *
 * Whitelisted as EXACT PHRASES rather than by a general "acronym is defined by the preceding
 * words" rule, deliberately: a general rule would also suppress `Water Restoration Technician
 * (WRT)`, which IS the designation spelled out and IS banned as course branding. Each entry
 * here is a specific claim that this phrase is not IICRC branding — keep the list short and
 * justify every addition.
 */
const BENIGN_EXPANSIONS = {
  RRT: ['rapid response team'],
  // Correlated Colour Temperature is the lighting measure used when specifying inspection
  // lamps — genuine restoration subject matter, and nothing to do with Carpet Cleaning
  // Technician. Both spellings, because source copy is not always Australian even though
  // CARSI's published copy must be.
  CCT: ['correlated colour temperature', 'correlated color temperature'],
};

/** True when the copy carries a whitelisted benign expansion of this acronym. */
function hasBenignExpansion(a, fTitle, fSlug) {
  const phrases = BENIGN_EXPANSIONS[a];
  if (!phrases) return false;
  // Normalise "&" to "and" before phrase matching. `Trauma & Crime Scene Technician` escaped
  // while the "and" spelling was caught; enumerating both variants per designation is the kind
  // of list that silently goes stale, so normalise once instead.
  const lowerTitle = fTitle.toLowerCase().replace(/\s*[&/+]\s*/g, ' and ');
  return phrases.some((ph) => lowerTitle.includes(ph) || fSlug.includes(ph.replace(/ /g, '-')));
}

/**
 * Cyrillic / Greek / digit lookalikes for the ASCII letters used by BANNED_ACRONYMS
 * (A C D F M O R S T W). `Water Damage WΡT Essentials` — Greek capital rho U+03A1 — read as
 * clean until this existed. Scoped deliberately to those letters rather than a general
 * confusables table: a narrow map is auditable, and nothing else in this guard needs one.
 *
 * DIGITS ARE DELIBERATELY EXCLUDED. Mapping 0->O and 5->S corrupted the metric and electrical
 * text that CARSI's Australian-production standard requires on nearly every course — `50 m²
 * @ 230 V` folded to `SO m2 @ 23O V` — and opened a false-positive path where `0ct` becomes
 * `OCT`. Digits are not a plausible staff-authored lookalike; metric units are everywhere.
 */
/**
 * Latin small-capital and related phonetic letters, U+1D00-U+1D2B. NFKC does NOT fold these,
 * so `ᴡRT` (U+1D21) read as clean. Mapped as a BLOCK rather than one character at a time:
 * enumerating single lookalikes as each is reported is an infinite ratchet, and a block is
 * both bounded and auditable.
 */
const SMALL_CAPS = {
  '\u1D00': 'A', '\u1D01': 'A', '\u1D03': 'B', '\u1D04': 'C', '\u1D05': 'D',
  '\u1D07': 'E', '\u1D0A': 'J', '\u1D0B': 'K', '\u1D0C': 'L', '\u1D0D': 'M',
  '\u1D0E': 'N', '\u1D0F': 'O', '\u1D18': 'P', '\u1D19': 'R', '\u1D1A': 'R',
  '\u1D1B': 'T', '\u1D1C': 'U', '\u1D20': 'V', '\u1D21': 'W', '\u1D22': 'Z',
};

const HOMOGLYPHS = {
  ...SMALL_CAPS,
  '\u0410': 'A', '\u0391': 'A',              // Cyrillic А, Greek Α
  '\u0421': 'C', '\u03F9': 'C',              // Cyrillic С, Greek Ϲ
  '\u041C': 'M', '\u039C': 'M',              // Cyrillic М, Greek Μ
  '\u041E': 'O', '\u039F': 'O',              // Cyrillic О, Greek Ο
  '\u0420': 'R', '\u03A1': 'R',              // Cyrillic Р, Greek Ρ
  '\u0405': 'S',                              // Cyrillic Ѕ
  '\u0422': 'T', '\u03A4': 'T',              // Cyrillic Т, Greek Τ
  '\u051C': 'W',                              // Cyrillic Ԝ
  '\u0414': 'D', '\u03DC': 'F',              // Cyrillic Д, Greek Ϝ
};

/**
 * Fold a string to a comparable ASCII form: NFKC first (handles fullwidth and compatibility
 * forms), then the lookalike map. Matching runs against the folded text while the ORIGINAL is
 * always what gets reported, so an operator sees the real title, not a normalised one.
 */
export function fold(text) {
  return (text || '')
    .normalize('NFKC')
    .split('')
    .map((ch) => HOMOGLYPHS[ch] ?? HOMOGLYPHS[ch.toUpperCase()] ?? ch)
    .join('');
}

const NOT_FOUND_MARKER = 'Course Not Found';

/**
 * Exported so the test can prove every rule FIRES without a banned phrase existing on the live
 * site. A guard whose non-vacuity is only ever demonstrated by hand is one refactor away from
 * being decorative — which is exactly how `check-iicrc-terminology` spent an unknown period
 * exiting 0 on every input.
 */
export function scanCourse({ slug, title }) {
  const hits = [];
  // Match against folded text; report the originals untouched.
  const fTitle = fold(title);
  const fSlug = fold(slug).toLowerCase();
  for (const a of BANNED_ACRONYMS) {
    // A whitelisted industry phrase is not IICRC branding. Skipping the acronym entirely (both
    // surfaces) is correct: `Rapid Response Team (RRT) Mobilisation` at
    // `rapid-response-team-rrt-mobilisation` is one course, and flagging either half of it
    // would be the same false positive.
    if (hasBenignExpansion(a, fTitle, fSlug)) continue;
    // Title: whole-word only, so "Restoration" never trips on "ASD" and a topic name that
    // merely contains the letters is not a violation. Case-insensitive except for the
    // ambiguous set above — a case-sensitive rule let `wrt` and `WrT` through in titles.
    // `s` / `'s` accepted: "WRTs Essentials" is the same branding claim as "WRT Essentials",
    // and a human writing a course title reaches for the plural without thinking about it.
    const titleFlags = AMBIGUOUS_ACRONYMS.has(a) ? '' : 'i';
    if (new RegExp(`\\b${a}(?:'?s)?\\b`, titleFlags).test(fTitle)) hits.push({ rule: 'title-acronym', detail: a });
    // Slug: any hyphen-delimited SEGMENT, not just the leading one, and case-insensitively.
    // Leading-only let `water-damage-wrt-essentials` through; case-sensitive matching then let
    // `water-damage-WRT-essentials` through, because URLs may carry uppercase. Segment-bounded,
    // so a slug merely containing the letters mid-word stays clean.
    //
    // The TITLE rule above stays case-SENSITIVE on purpose: these are acronyms, and lowercasing
    // it would make the banned token `OCT` match the ordinary month abbreviation "oct" in prose.
    // No `i` flag: fSlug is already lowercased above, so the flag would be unreachable — a
    // mutation run proved no test could tell it apart from its absence. The lowercasing is the
    // load-bearing part, because fold() emits uppercase ASCII for lookalike characters.
    //
    // Ambiguous acronyms are skipped for SLUGS. A title has case to disambiguate ("OCT" the
    // designation vs "oct" the month); a slug does not, because slugs are lowercase by
    // convention. Without this, `seasonal-cleaning-oct-2026` was reported as a licence
    // violation. A guard that cries wolf on a legitimate October course is worse than one that
    // misses a slug — staff stop believing it. The title rule still catches the designation
    // written as a designation, and check-iicrc-compliance remains the backstop.
    //
    // `'?s?` accepts the possessive slug form as well as the plural: `wrt's-water-damage`
    // passed while the commit claimed otherwise.
    if (
      !AMBIGUOUS_ACRONYMS.has(a) &&
      new RegExp(`(?:^|-)${a.toLowerCase()}'?s?(?:-|$)`).test(fSlug)
    ) {
      hits.push({ rule: 'slug-acronym', detail: a });
    }
  }
  // The designation NAMES, independent of any acronym. A benign expansion still suppresses:
  // "Correlated Colour Temperature" does not make "carpet cleaning technician" acceptable, but
  // the two never co-occur, and skipping is consistent with how the acronym rules behave.
  // Normalise "&" to "and" before phrase matching. `Trauma & Crime Scene Technician` escaped
  // while the "and" spelling was caught; enumerating both variants per designation is a list
  // that goes stale silently, so normalise once instead.
  const lowerTitle = fTitle.toLowerCase().replace(/\s*[&/+]\s*/g, ' and ');
  for (const phrases of Object.values(DESIGNATION_PHRASES)) {
    // NO benign-expansion skip here. The whitelist exists because an ACRONYM's letters collide
    // with an industry term (CCT / correlated colour temperature, RRT / rapid response team).
    // A spelled-out designation has no such collision — `Carpet Cleaning Technician` is the
    // designation whatever else the title mentions. Skipping it here hid the phrase entirely,
    // which independent review rated P0 against the never-silent invariant.
    for (const ph of phrases) {
      const slugPh = ph.replace(/[ &]+/g, '-');
      // Slugs drop "and" as often as they keep it: trauma-crime-scene-technician and
      // trauma-and-crime-scene-technician are the same branding.
      const slugPhNoAnd = ph.replace(/ and /g, ' ').replace(/[ &]+/g, '-');
      const ti = lowerTitle.indexOf(ph);
      const si = fSlug.indexOf(slugPh) !== -1 ? fSlug.indexOf(slugPh) : fSlug.indexOf(slugPhNoAnd);
      if (ti === -1 && si === -1) continue;
      const titleAudience = ti === -1 || isAudienceUsage(lowerTitle, ph, ti);
      const slugAudience =
        si === -1 ||
        isAudienceUsage(fSlug, fSlug.slice(si).startsWith(slugPh) ? slugPh : slugPhNoAnd, si);
      // Branding on EITHER surface is a violation. Audience on BOTH is a note, never silence.
      hits.push({
        rule: titleAudience && slugAudience ? 'designation-phrase-audience' : 'designation-phrase',
        detail: ph,
      });
      break;
    }
  }

  // "-aligned" is banned ONLY when what precedes it is an IICRC discipline designation. A bare
  // /-aligned/ flagged `AS/NZS-aligned Electrical Safety …`, which is not merely legitimate —
  // CLAUDE.md REQUIRES AS/NZS framing on Australian course content, so the guard was flagging
  // the house style it exists to protect. ANSI-, ISO- and AS/NZS-aligned are all correct
  // nominative usage; only the designations are branding.
  // Up to two intervening tokens, so `IICRC CEC-aligned` and `IICRC CEC aligned` are caught as
  // well as `IICRC-aligned`. Bounded at two on purpose: an unbounded gap would make
  // "IICRC CEC Accredited courses, AS/NZS aligned" — the phrasing CLAUDE.md REQUIRES — match.
  const alignedRe = new RegExp(
    `\\b(?:${[...BANNED_ACRONYMS, 'IICRC'].join('|')})(?:[-\\s][A-Za-z]{2,12}){0,2}[-\\s]?aligned\\b`,
    'i',
  );
  const alignedHit = fTitle.match(alignedRe);
  if (alignedHit) hits.push({ rule: 'title-aligned', detail: `"${alignedHit[0]}"` });
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

  /**
   * Exit without an audit. In --json mode this still emits a parseable object on stdout: a
   * consumer that cannot parse the failure cannot tell a broken run from a clean one, which is
   * the same "silence reads as success" defect this whole guard exists to prevent.
   */
  const cannotAudit = (reason, extra = []) => {
    if (asJson) {
      console.log(JSON.stringify({ site: SITE, error: reason, checked: 0, violations: [], notes: [] }, null, 2));
    } else {
      console.error(`cannot audit: ${reason}`);
      for (const line of extra) console.error(line);
    }
    process.exit(2);
  };
  let courseUrls;
  try {
    const sitemap = await fetchText(`${SITE}/sitemap.xml`);
    courseUrls = [...new Set(sitemap.match(/https?:\/\/[^<\s]*?\/courses\/[^<\s]+/g) || [])];
  } catch (err) {
    cannotAudit(`sitemap fetch failed for ${SITE} — ${err.message}`);
  }

  if (courseUrls.length === 0) {
    cannotAudit(`sitemap at ${SITE} listed no course URLs.`, [
      'Refusing to exit 0 — a guard that reached nothing has not checked anything.',
    ]);
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
  const scanned = results.filter((r) => !r.error).map((c) => ({ ...c, hits: scanCourse(c) }));
  const isNote = (h) => h.rule === 'designation-phrase-audience';
  // A course whose ONLY hits are audience notes does not block; it is listed for a human.
  const violations = scanned.filter((c) => c.hits.some((h) => !isNote(h)));
  const notes = scanned.filter((c) => c.hits.length > 0 && c.hits.every(isNote));

  // Computed BEFORE any output so it can ride in the single JSON object. Emitting it as a
  // second document was the round-14 P1: one unparseable path traded for another.
  const coverageShortfall = failed.length || unaccounted.length
    ? `${failed.length} URL(s) could not be fetched and ${unaccounted.length} returned no usable title — coverage is incomplete.`
    : null;
  const auditError =
    live.length === 0
      ? `fetched ${results.length} course URLs, none returned a usable title.`
      : coverageShortfall;

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          site: SITE,
          checked: live.length,
          violations,
          notes,
          ...(auditError ? { error: auditError } : {}),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Live catalogue licence audit — ${SITE}`);
    console.log(`  sitemap course URLs: ${courseUrls.length}`);
    console.log(`  live (title is not "${NOT_FOUND_MARKER}"): ${live.length}`);
    if (failed.length) console.log(`  fetch failures: ${failed.length}`);
    for (const n of notes) {
      console.log(`\n· ${n.slug}  (audience wording — review, does not block)`);
      console.log(`    title: ${n.title}`);
      for (const h of n.hits) console.log(`    ${h.rule}: ${h.detail}`);
      console.log(`    ${n.url}`);
    }
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


  if (auditError && !coverageShortfall) {
    if (!asJson) console.error(`cannot audit: ${auditError}`);
    process.exit(2);
  }

  // Non-vacuity is part of the pass, so the count is always stated. "Clean" without a number is
  // indistinguishable from "checked nothing".
  // Only in text mode: a trailing human line after the JSON object made --json output
  // unparseable for any clean or note-only audit.
  if (!asJson) console.log(`\n✓ ${live.length} live courses clean.`);
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

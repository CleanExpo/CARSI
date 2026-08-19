import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * GP-523 regression — page-scoped guard for the exact surfaces the compliance ticket names.
 *
 *   https://carsi.com.au/courses/cct-commercial-carpet-core
 *   https://carsi.com.au/courses/carpet-cleaning-basics-b66757ce
 *   https://carsi.com.au/courses/introduction-to-basic-carpet-cleaning-and-drying
 *   https://carsi.com.au/courses
 *
 * This is ADDITIVE. It does not touch, widen or narrow `npm run check:iicrc-terminology`
 * or `npm run check:iicrc-compliance` — both stay exactly as they were, and both were green
 * before and after this change. Those guards are estate-wide and deliberately narrow; this
 * one is deliberately absolute but scoped to the repo sources that render the four URLs
 * above, which is why it can forbid the acronyms outright without reddening the ~18
 * industries pages that legitimately discuss IICRC certifications in the third person.
 *
 * Every assertion of ABSENCE is preceded by a positive control proving the check can fire.
 */

const REPO_ROOT = join(__dirname, '..', '..', '..');

// Case-INSENSITIVE by design. Without the `i` flag these matched `CCT` but not
// `cct-commercial-carpet-core`, so this guard read the seed catalogue — which carries five
// lowercase acronym slugs — and reported clean. A branding guard blind to the banned token in
// the file it audits is the defect class this branch exists to close, so the flag is load-bearing:
// do not remove it. Proven both ways in the positive-control block below.
const ACRONYM_RE = /\b(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT|TCST)\b/i;
const ACRONYM_RE_G = /\b(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT|TCST)\b/gi;
const ALIGNED_RE = /\b[A-Za-z]{2,6}-aligned\b/i;

/**
 * Deferred by DECISIONS.md GP-523-D1: the course URL slugs still carry a lowercase discipline
 * prefix (`cct-commercial-carpet-core`). Renaming them breaks live URLs, sitemap entries and
 * indexed SEO, so it is deferred to a follow-up that ships redirects with the rename.
 *
 * Keyed to the five REAL slugs by literal VALUE, never by slug SHAPE.
 *
 * The original shape-keyed form — /\b(wrt|crt|asd|oct|cct|fsrt|amrt|tcst)-[a-z0-9-]+/g — was a
 * content amnesty, not a path exemption: it erased ANY lowercase acronym-hyphen-word token from
 * ANY string literal before the acronym check ran. Mutation on 2026-08-18 put
 * `cct-certified` in a real `title:` field — rendered copy, not a URL — and this guard stayed
 * green, with no other check catching it (check-iicrc-terminology's acronym rules both return
 * false on a bare single acronym in a title). Value-keying closes that.
 *
 * The boundary is `(?<![\w-]) … (?![\w-])`, not `\b`. With `\b`, the enumeration matched a
 * PREFIX of a longer token, so `cct-commercial-carpet-core-advanced` still stripped silently —
 * a narrower recurrence of the same over-claim, caught on re-review the same day. Excluding the
 * hyphen from the boundary makes it an exact-token match.
 *
 * Scope, stated precisely so this comment cannot drift from behaviour again: a token escapes iff
 * it IS one of the five slugs exactly. It escapes anywhere in the file, not only in a `slug:`
 * field — the same string in prose is exempt too. That residue is accepted: it is the identical
 * exposure to the live URL that DECISIONS #15 already defers, and it disappears entirely when the
 * rename ships. Add an entry here only when the slug genuinely exists.
 */
const DEFERRED_SLUGS = [
  'wrt-water-damage-essentials',
  'asd-structural-drying-core',
  'amrt-microbial-remediation-core',
  'fsrt-fire-smoke-restoration-core',
  'cct-commercial-carpet-core',
] as const;

const DEFERRED_SLUG_RE = new RegExp(
  `(?<![\\w-])(?:${DEFERRED_SLUGS.join('|')})(?![\\w-])`,
  'g'
);

/** Strip only the five deferred URL slugs, so the guard still fires on everything else. */
function withoutDeferredSlugs(value: string): string {
  return value.replace(DEFERRED_SLUG_RE, '');
}

function read(relative: string): string {
  return readFileSync(join(REPO_ROOT, relative), 'utf8');
}

/**
 * Quoted string literals only — comments and colour-map keys are not rendered copy.
 *
 * Comments are stripped FIRST. Without that, this check counts its own explanatory comments
 * (which necessarily quote the acronyms they forbid) as violations, and the guard can never
 * be satisfied — the self-counting-invariant failure mode.
 */
function stringLiterals(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  // Backtick literals are included deliberately. Scanning only ' and " left a hole a release
  // guard must not have: a title written as a template literal bypassed the acronym check
  // entirely. Found on review 2026-08-18; the seed catalogue happens to contain no acronym in a
  // template literal today, so this closes a latent gap rather than a live defect.
  return (
    withoutComments.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g) ?? []
  );
}

/**
 * Banned strings are ASSEMBLED, never pasted. Writing the live defect verbatim here would
 * make this file — which lives under `src/` and is therefore scanned by
 * `npm run check:iicrc-terminology` once tracked — a violation of the very rule it defends.
 */
const aligned = (code: string) => `${code}-aligned`;

describe('positive control — the checks below can fail', () => {
  it('detects an acronym and an "-aligned" title in the exact live pre-fix strings', () => {
    // Live <title> on /courses/cct-commercial-carpet-core, 17/08/2026.
    const liveTitle = `Commercial Carpet Care — Core Methods (${aligned('CCT')})`;
    expect(ACRONYM_RE.test(liveTitle)).toBe(true);
    expect(ALIGNED_RE.test(liveTitle)).toBe(true);
    // Live schema description for /courses/wrt-water-damage-essentials, 17/08/2026.
    expect(ALIGNED_RE.test(`${aligned('WRT')} essentials of water damage restoration.`)).toBe(
      true
    );
    // The pre-fix seed field this branch nulls.
    expect(ACRONYM_RE.test(`iicrc_discipline: '${'CCT'}',`)).toBe(true);
  });

  it('matches a LOWERCASE acronym — the blindness that let the seed catalogue read clean', () => {
    // Regression guard for the missing `i` flag. Before the fix these were false, so this
    // suite reported the seed catalogue clean while it carried five acronym slugs.
    expect(ACRONYM_RE.test('cct-commercial-carpet-core')).toBe(true);
    expect(ACRONYM_RE.test('wrt-water-damage-essentials')).toBe(true);
    // Mixed case must not slip through either.
    expect(ACRONYM_RE.test('Cct-commercial')).toBe(true);
  });

  it('exempts ONLY deferred URL slugs, never rendered copy', () => {
    // In scope of the deferral: the slug disappears, so the guard stays quiet.
    expect(ACRONYM_RE.test(withoutDeferredSlugs('cct-commercial-carpet-core'))).toBe(false);
    // Out of scope: a bare lowercase acronym is not a slug and must still fail.
    expect(ACRONYM_RE.test(withoutDeferredSlugs('cct'))).toBe(true);
    // Out of scope: uppercase branding in a title must still fail.
    expect(ACRONYM_RE.test(withoutDeferredSlugs(`Carpet Care (${'CCT'})`))).toBe(true);
    // Out of scope: an "-aligned" claim is untouched by the slug exemption.
    expect(ALIGNED_RE.test(withoutDeferredSlugs(aligned('CCT')))).toBe(true);
  });

  it('exempts by slug VALUE, not by slug SHAPE — the amnesty this guard shipped with', () => {
    // Regression for the 2026-08-18 review. The shape-keyed exemption erased any lowercase
    // acronym-hyphen-word token, so a banned acronym in RENDERED copy read clean. Each case
    // below is slug-SHAPED but is not a deferred slug, so each must still fail.
    //
    // Asserted lowercase deliberately: the shape-keyed regex carried no `i` flag, so the
    // pre-existing uppercase assertions above passed against a branch it never matched. They
    // could not fail, and so proved nothing about the case that actually leaked.
    expect(ACRONYM_RE.test(withoutDeferredSlugs('cct-certified'))).toBe(true);
    expect(ACRONYM_RE.test(withoutDeferredSlugs('cct-certified Commercial Carpet Care'))).toBe(
      true
    );
    expect(ALIGNED_RE.test(withoutDeferredSlugs(aligned('cct')))).toBe(true);
    expect(ACRONYM_RE.test(withoutDeferredSlugs('wrt-restoration-training'))).toBe(true);

    // ...while every genuinely deferred slug still passes, including inside a URL path.
    for (const slug of DEFERRED_SLUGS) {
      expect(ACRONYM_RE.test(withoutDeferredSlugs(slug))).toBe(false);
      expect(ACRONYM_RE.test(withoutDeferredSlugs(`/courses/${slug}`))).toBe(false);
    }
  });

  it('matches a deferred slug as a whole token, never as the prefix of a longer one', () => {
    // Second-round regression. The first fix used `\b`, which matches before a trailing hyphen,
    // so the enumeration still matched a PREFIX: `cct-commercial-carpet-core-advanced` stripped
    // to `-advanced` and read clean. A future slug variant would have re-opened the amnesty.
    for (const suffix of ['-advanced', '-2026', '-part-2']) {
      expect(ACRONYM_RE.test(withoutDeferredSlugs(`cct-commercial-carpet-core${suffix}`))).toBe(
        true
      );
      expect(ACRONYM_RE.test(withoutDeferredSlugs(`wrt-water-damage-essentials${suffix}`))).toBe(
        true
      );
    }
    // A leading token must not be swallowed either.
    expect(ACRONYM_RE.test(withoutDeferredSlugs('legacy-cct-commercial-carpet-core'))).toBe(true);
    // The exact slug is still exempt at a real boundary — trailing punctuation is not a token char.
    expect(ACRONYM_RE.test(withoutDeferredSlugs('/courses/cct-commercial-carpet-core.'))).toBe(
      false
    );
  });

  it('stringLiterals ignores comments but still catches a real string literal', () => {
    const banned = `'Commercial Carpet Care (${aligned('CCT')})'`;
    const sample = [
      `// a comment naming '${'CCT'}' must not count as branding`,
      `/* nor a block comment naming '${'WRT'}' */`,
      `const title = ${banned};`,
    ].join('\n');
    const offenders = stringLiterals(sample).filter((s) => ACRONYM_RE.test(s));
    expect(offenders).toEqual([banned]);
  });

  it('catches an acronym inside a TEMPLATE literal, not only quoted strings', () => {
    // Review finding 2026-08-18: scanning only ' and " meant a title written with backticks
    // bypassed the acronym check entirely. Asserted both ways so the extraction cannot silently
    // regress to quote-only.
    const backticked = '`Commercial Carpet Care (' + 'CCT' + ')`';
    const found = stringLiterals('const title = ' + backticked + ';').filter((s) =>
      ACRONYM_RE.test(s)
    );
    expect(found).toEqual([backticked]);

    // The quote-only extraction this replaced returns nothing for the same input — proving the
    // assertion above discriminates rather than passing for an unrelated reason.
    const quoteOnly =
      ('const title = ' + backticked + ';').match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g) ?? [];
    expect(quoteOnly.filter((s) => ACRONYM_RE.test(s))).toEqual([]);

    // A comment written with backticks still must not count as branding.
    const commented = stringLiterals('// naming `' + 'WRT' + '` in a comment\n').filter((s) =>
      ACRONYM_RE.test(s)
    );
    expect(commented).toEqual([]);
  });

  it('reads the real files, not empty strings', () => {
    expect(read('app/(public)/courses/page.tsx').length).toBeGreaterThan(1000);
    expect(read('src/lib/lms-seed-catalog.ts').length).toBeGreaterThan(1000);
    expect(read('data/wordpress-export/courses.json').length).toBeGreaterThan(1000);
  });
});

describe('/courses — the catalogue page named in GP-523', () => {
  const source = read('app/(public)/courses/page.tsx');

  it('contains no IICRC discipline acronym anywhere', () => {
    expect(source.match(ACRONYM_RE_G)).toBeNull();
  });

  it('contains no "[discipline]-aligned" claim', () => {
    expect(ALIGNED_RE.test(source)).toBe(false);
  });

  it('still carries the CARSI designation disclaimer', () => {
    expect(source).toContain('CARSI Southern Hemisphere Restoration Designations');
  });
});

describe('src/lib/lms-seed-catalog.ts — source of /courses/cct-commercial-carpet-core', () => {
  const source = read('src/lib/lms-seed-catalog.ts');

  it('sets every seeded iicrc_discipline to null', () => {
    const assignments = source.match(/^\s*iicrc_discipline: .*$/gm) ?? [];
    expect(assignments.length).toBeGreaterThan(0);
    for (const line of assignments) {
      expect(line.trim()).toBe('iicrc_discipline: null,');
    }
  });

  it('uses no discipline acronym in any course, module or lesson string', () => {
    // URL slugs are exempt per DECISIONS.md GP-523-D1 (rename needs redirects). Rendered copy
    // is not exempt: strip only the deferred slugs, then the acronym check applies in full.
    const offenders = stringLiterals(source)
      .map(withoutDeferredSlugs)
      .filter((s) => ACRONYM_RE.test(s));
    expect(offenders).toEqual([]);
  });

  it('still fails on an acronym in rendered copy, slug deferral notwithstanding', () => {
    // The deferral must not become a blanket amnesty. A title is not a slug.
    const rendered = `'Commercial Carpet Care (${'CCT'})'`;
    expect(ACRONYM_RE.test(withoutDeferredSlugs(rendered))).toBe(true);
  });

  it('brands no seeded course "[discipline]-aligned"', () => {
    expect(ALIGNED_RE.test(source)).toBe(false);
  });
});

describe('data/wordpress-export/courses.json — source of the two carpet course URLs', () => {
  const records = JSON.parse(read('data/wordpress-export/courses.json')) as Array<{
    slug: string;
    title: string;
    category: string | null;
    short_description: string | null;
    description: string | null;
    tags: string[] | null;
    iicrc_discipline: string | null;
  }>;

  /** Every field of a record that reaches a learner's screen. */
  const renderedFields = (r: (typeof records)[number]): string[] =>
    [r.title, r.category, r.short_description, r.description, ...(r.tags ?? [])].filter(
      (v): v is string => typeof v === 'string'
    );

  // `carpet-cleaning` renders at /courses/introduction-to-basic-carpet-cleaning-and-drying and
  // `carpet-cleaning-basics` at /courses/carpet-cleaning-basics-b66757ce (see
  // data/seed/cec-professional-assignments.json for the live-slug mapping).
  const TICKET_SLUGS = ['carpet-cleaning', 'carpet-cleaning-basics'];

  it('finds both carpet records (positive control on the fixture)', () => {
    for (const slug of TICKET_SLUGS) {
      expect(records.find((r) => r.slug === slug)).toBeDefined();
    }
  });

  it('carries no IICRC discipline code on either carpet course', () => {
    for (const slug of TICKET_SLUGS) {
      expect(records.find((r) => r.slug === slug)?.iicrc_discipline ?? null).toBeNull();
    }
  });

  it('brands neither carpet course title with an acronym or "-aligned"', () => {
    for (const slug of TICKET_SLUGS) {
      const title = records.find((r) => r.slug === slug)!.title;
      expect(ACRONYM_RE.test(title)).toBe(false);
      expect(ALIGNED_RE.test(title)).toBe(false);
    }
  });

  it('positive control — the whole-file sweep below can actually fail', () => {
    // The sweep asserts an ABSENCE across 95 records. Without this, a typo in the predicate
    // would yield the same empty result as a clean catalogue and read as proof.
    const decoy = { title: `Water Damage (${'WRT'}) Essentials`, category: null,
      short_description: null, description: null, tags: null, slug: 'x',
      iicrc_discipline: null };
    expect(renderedFields(decoy).some((v) => ACRONYM_RE.test(v))).toBe(true);
    const decoyAligned = { ...decoy, title: aligned('CCT') };
    expect(renderedFields(decoyAligned).some((v) => ALIGNED_RE.test(v))).toBe(true);
    // ...and a clean record must not trip it.
    const clean = { ...decoy, title: 'Commercial Carpet Care — Core Methods' };
    expect(renderedFields(clean).some((v) => ACRONYM_RE.test(v))).toBe(false);
  });

  it('brands NO record with an acronym in any rendered field, not just the ticket pair', () => {
    // Drain for a 2026-08-18 review finding: the assertions above inspect only TICKET_SLUGS, so
    // a third course acquiring acronym branding would pass unnoticed.
    //
    // Deliberately NOT asserting `iicrc_discipline === null` across the file. 42 of 95 records
    // still carry a code (ASD/WRT/AMRT/OCT); that field drives accent colour and a plain-English
    // label and is not itself branding. The invariant that matters is that no field a learner
    // SEES carries the acronym — which is what this asserts, over every record.
    const offenders = records
      .flatMap((r) => renderedFields(r).map((value) => ({ slug: r.slug, value })))
      .filter(({ value }) => ACRONYM_RE.test(value) || ALIGNED_RE.test(value));
    expect(offenders).toEqual([]);
  });
});

describe('card rendering path carries no fail-open discipline inference', () => {
  it('CourseCard does not re-derive a discipline from the category string', () => {
    const source = read('src/components/lms/CourseCard.tsx');
    expect(source).not.toMatch(/course\.category\?\.match\(\s*\/\^\(WRT/);
  });
});

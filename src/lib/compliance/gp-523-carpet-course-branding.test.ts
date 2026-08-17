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

const ACRONYM_RE = /\b(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT|TCST)\b/;
const ACRONYM_RE_G = /\b(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT|TCST)\b/g;
const ALIGNED_RE = /\b[A-Za-z]{2,6}-aligned\b/i;

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
  return withoutComments.match(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g) ?? [];
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
    const offenders = stringLiterals(source).filter((s) => ACRONYM_RE.test(s));
    expect(offenders).toEqual([]);
  });

  it('brands no seeded course "[discipline]-aligned"', () => {
    expect(ALIGNED_RE.test(source)).toBe(false);
  });
});

describe('data/wordpress-export/courses.json — source of the two carpet course URLs', () => {
  const records = JSON.parse(read('data/wordpress-export/courses.json')) as Array<{
    slug: string;
    title: string;
    iicrc_discipline: string | null;
  }>;

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
});

describe('card rendering path carries no fail-open discipline inference', () => {
  it('CourseCard does not re-derive a discipline from the category string', () => {
    const source = read('src/components/lms/CourseCard.tsx');
    expect(source).not.toMatch(/course\.category\?\.match\(\s*\/\^\(WRT/);
  });
});

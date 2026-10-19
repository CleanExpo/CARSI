/**
 * Guard: public copy must not make superlative or recognition claims CARSI cannot substantiate
 * (Australian Consumer Law - a claim needs evidence). Rewrite a hit to a fact CARSI can prove;
 * never weaken a pattern to make a hit pass. "IICRC CEC Accredited" is required wording and is
 * not matched by any pattern here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', '..', '..');
const APOS = "(?:'|’|&apos;|&rsquo;|&#39;)";

const CLAIM_PATTERNS: { label: string; pattern: RegExp }[] = [
  {
    label: "Australia's leading/best/premier",
    pattern: new RegExp(
      `\\baustralia${APOS}s\\s+(leading|best|premier|top|foremost|number one|largest|most trusted)\\b`,
      'i'
    ),
  },
  {
    label: 'industry/training leader',
    pattern: /\b(industry|training|market)\s+(training\s+)?leader\b/i,
  },
  { label: 'industry-leading', pattern: /\bindustry[- ]leading\b/i },
  { label: 'world-class', pattern: /\bworld[- ]class\b/i },
  {
    // Superlative "#1" (the/our #1, #1 choice), not an ordinal such as "Client #1".
    label: 'number one',
    pattern:
      /\bnumber one\b|\bno\.\s?1\b|\b(the|our|australia\S*)\s+#1\b|#1\s+(choice|provider|platform|training|rated|in)\b/i,
  },
  { label: 'best value / best-known', pattern: /\bbest[- ](value|known)\b/i },
  {
    label: 'the best <directory>',
    pattern: /\bthe best (podcasts|youtube channels|courses|training|online)\b/i,
  },
  {
    label: 'recognised by major/leading',
    pattern: /\brecogni[sz]ed by (major|leading|all|most|every|top)\b/i,
  },
  {
    label: 'specified/endorsed/accredited by leading',
    pattern:
      /\b(specified|endorsed|approved|accredited|preferred) by (leading|major|all|most|top)\b/i,
  },
  { label: 'NRPG-accredited', pattern: /\bNRPG[- ]accredited\b/i },
  {
    label: 'leading <provider noun>',
    pattern:
      /\bleading (online )?(training|platform|provider|trade publications?|insurers?|experts?|brands?|educators?)\b/i,
  },
  {
    label: 'the leading cause/source/driver',
    pattern: /\bthe leading (non-[\w-]+ )?(cause|source|drivers?)\b/i,
  },
  {
    label: 'premier provider',
    pattern: /\bpremier (training|provider|platform|online|destination|educator)\b/i,
  },
  {
    // Authorship CARSI cannot show: a group or credential named as the author of public content.
    label: 'group authorship claim',
    pattern:
      /\b(written|authored)\s+by\s+(the\s+)?(NRPG|IICRC|industry|accredited|certified|expert|qualified|professional|leading)\b/i,
  },
];

/**
 * "IICRC CEC training/courses" (anything but the required "IICRC CEC Accredited"). Ratchet: no
 * public copy file may gain one. These existing uses (page titles, SEO keywords, FAQ questions)
 * are frozen until the founder decides on a site-wide rewrite; remove one and lower its count here.
 */
const IICRC_CEC_NON_ACCREDITED =
  /IICRC\s+CEC\s+(?!Accredited)(training|courses?|programs?|learning)\b/gi;
const IICRC_CEC_NON_ACCREDITED_BASELINE: Record<string, number> = {
  'app/(public)/industries/caravan-parks/page.tsx': 2,
  'app/(public)/industries/childcare/page.tsx': 4,
  'app/(public)/industries/commercial-cleaning/page.tsx': 5,
  'app/(public)/industries/construction/page.tsx': 2,
  'app/(public)/industries/data-centres/page.tsx': 4,
  'app/(public)/industries/education/page.tsx': 4,
  'app/(public)/industries/emergency-management/page.tsx': 5,
  'app/(public)/industries/food-processing/page.tsx': 6,
  'app/(public)/industries/government-defence/page.tsx': 5,
  'app/(public)/industries/gyms-fitness/page.tsx': 3,
  'app/(public)/industries/hospitality/page.tsx': 1,
  'app/(public)/industries/insurance/page.tsx': 5,
  'app/(public)/industries/mining/page.tsx': 2,
  'app/(public)/industries/museums-cultural/page.tsx': 6,
  'app/(public)/industries/ndis-disability/page.tsx': 4,
  'app/(public)/industries/plumbing-trades/page.tsx': 5,
  'app/(public)/industries/property-management/page.tsx': 2,
  'app/(public)/industries/real-estate/page.tsx': 3,
  'app/(public)/industries/retail/page.tsx': 3,
  'app/(public)/industries/strata/page.tsx': 3,
  'app/(public)/industries/transport-logistics/page.tsx': 4,
  'app/(public)/pricing/page.tsx': 1,
  'app/(public)/testimonials/page.tsx': 1,
  'src/components/landing/GrowthPathInfographic.tsx': 1,
};

function countIicrcCecNonAccredited(text: string): number {
  return (text.match(IICRC_CEC_NON_ACCREDITED) ?? []).length;
}

/** Every file whose text is rendered or served publicly as CARSI copy. */
const SCOPES = [
  'app/(public)',
  'app/layout.tsx',
  'app/page.tsx',
  'src/components/landing',
  'src/components/marketing',
  'src/components/seo',
  'src/components/contact',
  'src/components/layout',
  'src/lib/schema',
  'src/lib/marketing',
];
const COPY_EXT = /\.(tsx?|mdx?|txt)$/;

function walk(path: string): string[] {
  let stat;
  try {
    stat = statSync(path);
  } catch {
    return [];
  }
  if (stat.isFile()) return [path];
  return readdirSync(path).flatMap((name) => walk(join(path, name)));
}

function publicCopyFiles(): string[] {
  const scoped = SCOPES.flatMap((scope) => walk(join(ROOT, scope)));
  const publicText = readdirSync(join(ROOT, 'public'))
    .filter((name) => /\.(txt|md)$/.test(name))
    .map((name) => join(ROOT, 'public', name));
  return [...scoped, ...publicText].filter(
    (file) => COPY_EXT.test(file) && !/\.test\.tsx?$/.test(file)
  );
}

function findClaims(text: string): { label: string; line: number; excerpt: string }[] {
  const hits: { label: string; line: number; excerpt: string }[] = [];
  text.split('\n').forEach((line, index) => {
    for (const { label, pattern } of CLAIM_PATTERNS) {
      const match = pattern.exec(line);
      if (match) hits.push({ label, line: index + 1, excerpt: line.trim().slice(0, 160) });
    }
  });
  return hits;
}

describe('public claims guard', () => {
  const files = publicCopyFiles();

  it('scans the real public copy, not an empty set', () => {
    const rel = files.map((file) => relative(ROOT, file));
    expect(files.length).toBeGreaterThan(100);
    expect(rel).toContain('src/components/landing/PublicFooter.tsx');
    expect(rel).toContain('src/lib/schema/organization.ts');
    expect(rel).toContain('src/components/seo/JsonLd.tsx');
    expect(rel).toContain('app/(public)/about/page.tsx');
    expect(rel).toContain('public/carsi-ai-citation-pack.md');
  });

  it.each([
    "CARSI is Australia's leading online training platform.",
    'Australia&apos;s industry training leader.',
    'Restoration training that is world-class.',
    'The #1 choice for technicians.',
    'Best value',
    'one of Australia&rsquo;s best-known suppliers',
    'The best podcasts for Australian restoration',
    'Our training is recognised by major Australian insurers.',
    'IICRC credentials are specified by leading insurers.',
    'Expert content from NRPG-accredited professionals.',
    'Sourced from leading trade publications.',
    'Water is the leading cause of outages.',
    'industry-leading pressure capability',
    'Written by NRPG network contractors.',
    'authored by IICRC-certified technicians',
  ])('flags a planted claim: %s', (planted) => {
    expect(findClaims(planted)).not.toHaveLength(0);
  });

  it('flags a claim planted into the real footer source (JSX entities included)', () => {
    const footer = readFileSync(join(ROOT, 'src/components/landing/PublicFooter.tsx'), 'utf8');
    const planted = footer.replace(
      '24/7 online.',
      'Australia&apos;s industry training leader.\n24/7 online.'
    );
    expect(planted).not.toBe(footer);
    expect(findClaims(planted).length).toBeGreaterThan(findClaims(footer).length);
  });

  it('leaves the required IICRC CEC Accredited wording and plain usage alone', () => {
    expect(
      findClaims(
        'IICRC CEC Accredited courses. Moisture leading to mould. Best for small teams. Client #1. ' +
          'CARSI is not affiliated with, endorsed by or partnered with any publisher.'
      )
    ).toHaveLength(0);
  });

  it('lets no public copy file gain an "IICRC CEC training/courses" phrase (ratchet)', () => {
    const counts = Object.fromEntries(
      files
        .map(
          (file) =>
            [relative(ROOT, file), countIicrcCecNonAccredited(readFileSync(file, 'utf8'))] as const
        )
        .filter(([, count]) => count > 0)
    );
    expect(counts).toEqual(IICRC_CEC_NON_ACCREDITED_BASELINE);
  });

  it('catches a planted extra "IICRC CEC training" in a real page and leaves "IICRC CEC Accredited" alone', () => {
    const path = 'app/(public)/industries/commercial-cleaning/page.tsx';
    const source = readFileSync(join(ROOT, path), 'utf8');
    const planted = `${source}\nconst planted = 'Documented IICRC CEC training shows clients what was studied.';\n`;
    expect(countIicrcCecNonAccredited(planted)).toBe(IICRC_CEC_NON_ACCREDITED_BASELINE[path] + 1);
    expect(countIicrcCecNonAccredited('IICRC CEC Accredited courses')).toBe(0);
  });

  it('keeps the value sentences this branch rewrote free of any IICRC mention', () => {
    const lines = [
      [
        'app/(public)/industries/commercial-cleaning/page.tsx',
        'Documented CARSI training shows clients and insurers',
      ],
      [
        'app/(public)/industries/plumbing-trades/page.tsx',
        'Documented CARSI training shows clients and insurers',
      ],
      ['app/(public)/industries/gyms-fitness/page.tsx', 'Documented CARSI training shows members'],
    ] as const;
    for (const [path, opening] of lines) {
      const line = readFileSync(join(ROOT, path), 'utf8')
        .split('\n')
        .find((l) => l.includes(opening));
      expect(line, `${path} should contain "${opening}"`).toBeDefined();
      expect(line).not.toMatch(/IICRC/);
    }
  });

  it('finds no unbacked claim in any public copy file', () => {
    const hits = files.flatMap((file) =>
      findClaims(readFileSync(file, 'utf8')).map(
        (hit) => `${relative(ROOT, file)}:${hit.line} [${hit.label}] ${hit.excerpt}`
      )
    );
    expect(hits).toEqual([]);
  });
});


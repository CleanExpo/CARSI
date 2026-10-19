/**
 * Guard: public copy must not make superlative or recognition claims CARSI cannot substantiate
 * (Australian Consumer Law - a claim needs evidence). Rewrite a hit to a fact CARSI can prove;
 * never weaken a pattern to make a hit pass. "IICRC CEC Accredited" is required wording and is
 * not matched by any pattern here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

import { IICRC_CODE_ALT } from '../iicrc-codes';

const ROOT = join(__dirname, '..', '..', '..');
const APOS = "(?:'|’|&apos;|&rsquo;|&#39;)";

const CLAIM_PATTERNS: { label: string; pattern: RegExp; unless?: RegExp }[] = [
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
  // Outcome claims training cannot show: it records what someone studied and when, not that a
  // business met a legal duty, won a dispute or cut its premiums. "Due diligence" as a buyer's
  // activity (Start Smart) is fine; claiming training demonstrates or evidences it is not.
  {
    label: 'demonstrates due diligence/compliance',
    pattern: /\bdemonstrat\w*\s+(\w+\s+){0,2}(due[- ]diligence|compliance)\b/i,
  },
  { label: 'evidence of due diligence', pattern: /\bevidence of (\w+\s+)?due[- ]diligence\b/i },
  { label: 'defensible record/documentation', pattern: /\bdefensib(le|ility)\b/i },
  {
    label: 'reduces liability/premiums',
    pattern: /\b(reduc\w*|lower\w*|cut\w*)\s+(\w+\s+){0,2}(liability|premiums?)\b/i,
  },
  {
    label: 'protects from / minimises / avoids liability',
    pattern: /\b(protect\w*|minimi[sz]\w*|avoid\w*|shield\w*)\b[^.]{0,40}\bliability\b/i,
  },
  // Outcome guarantees and pre-qualification claims: training records what was studied; it does
  // not ensure an outcome, satisfy a tender or pre-qualify anyone for a panel.
  { label: 'ensures (outcome guarantee)', pattern: /\bensur(e|es|ing)\b/i },
  {
    label: 'satisfies/meets pre-qualification',
    pattern: /\b(satisf\w*|meets?|meeting)\b[^.]{0,60}\bpre-?qualif/i,
  },
  { label: 'pre-qualify (verb)', pattern: /\bpre-?qualif(y|ies|ied|ying)\b/i },
  {
    // Named third parties as panels or builders CARSI training would get someone onto.
    label: 'named panel or builder',
    pattern:
      /\b(Scentre|Vicinity Centres|GPT (Group|contractor)|CIMIC|Lendlease|John Holland|Multiplex)\b/,
  },
  {
    label: 'AusTender pre-qualification claim',
    pattern:
      /\b(satisf\w*|meets?|pre-?qualif\w*)\b[^.]{0,40}\bAusTender\b|\bAusTender\s+pre-?qualif/i,
  },
  { label: 'Protect Your/Guest CTA', pattern: /\bProtect (Your|Guest|Our)\b/ },
  {
    // "WRT certification", "ASD certification" ... from the one shared IICRC code list.
    label: '<IICRC code> certification',
    pattern: new RegExp(`\\b(?:${IICRC_CODE_ALT})\\s+certification\\b`),
  },
  {
    // A process claim with no standard named. The only allowed form is a nominative citation on
    // the same line, e.g. "aligned to ANSI/IICRC S500".
    label: 'standards-based (no named standard)',
    pattern: /\bstandards?[- ]based\b/i,
    unless: /\baligned to ANSI\/IICRC S\d{3}\b/i,
  },
  { label: 'aligned to AICCM guidelines', pattern: /\baligned (to|with) (the )?AICCM\b/i },
];

/**
 * "IICRC CEC training/courses" (anything but the required "IICRC CEC Accredited"). Ratchet: no
 * public copy file may gain one. These existing uses (page titles, SEO keywords, FAQ questions)
 * are frozen until the founder decides on a site-wide rewrite; remove one and lower its count here.
 */
const IICRC_CEC_NON_ACCREDITED =
  /IICRC\s+CEC\s+(?!Accredited)(training|courses?|programs?|learning)\b/gi;
const IICRC_CEC_NON_ACCREDITED_BASELINE: Record<string, number> = {
  'app/(public)/pricing/page.tsx': 1,
  'app/(public)/testimonials/page.tsx': 1,
  'src/components/landing/GrowthPathInfographic.tsx': 1,
  // Two references to the /iicrc-cec-courses page by name (#916); naming that page is allowed.
  'src/lib/seo/answer-engine.ts': 2,
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
  'src/lib/seo',
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

/**
 * Exact policy sentences where CARSI states its own obligation, not a training outcome. Each is
 * allowed only in its own file and is stripped from that line before the "ensures" rule runs, so
 * any other "ensure" in the same line, file or legal page is still flagged. Add an entry only for
 * a real sentence that exists; never exempt a whole file or folder.
 */
const ENSURES_POLICY_SENTENCES: { file: string; sentence: string }[] = [
  {
    file: 'app/(public)/privacy/page.tsx',
    sentence: 'We ensure appropriate safeguards are in place to protect',
  },
];

function withoutPolicySentences(line: string, file: string): string {
  return ENSURES_POLICY_SENTENCES.filter((entry) => entry.file === file).reduce(
    (text, entry) => text.split(entry.sentence).join(''),
    line
  );
}

function findClaims(text: string, file = ''): { label: string; line: number; excerpt: string }[] {
  const hits: { label: string; line: number; excerpt: string }[] = [];
  text.split('\n').forEach((line, index) => {
    for (const { label, pattern, unless } of CLAIM_PATTERNS) {
      const scanned =
        label === 'ensures (outcome guarantee)' ? withoutPolicySentences(line, file) : line;
      if (unless?.test(scanned)) continue;
      const match = pattern.exec(scanned);
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
    expect(rel).toContain('src/lib/seo/carsi-entity.ts');
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
    'Documented training demonstrates due diligence for hazard identification.',
    'IICRC-certified staff demonstrate compliance with the Act.',
    'Training provides documented evidence of due diligence for staff safety.',
    'Supports a defensible inspection record.',
    'Defensible, standards-based documentation for insurance claims.',
    'Reducing organisational liability under the NDIS Act.',
    'Can reduce insurance premiums for premises liability coverage.',
    'protecting them from non-disclosure liability',
    'Trained managers avoid regulatory breaches and landlord liability.',
    'Restoration training ensures rapid, standards-based response.',
    'IICRC credentials satisfy AusTender pre-qualification and Commonwealth audit requirements.',
    'Pre-qualify for major landlord panels.',
    'Pre-qualify for Scentre Group, Vicinity Centres, and GPT contractor panels.',
    'Verifiable credentials for panels at tier-1 builders like CIMIC, Lendlease, John Holland, and Multiplex.',
    'Protect Your Infrastructure',
    'WRT certification ensures your team can triage and protect high-value items.',
    'ASD certification for every technician',
    'Staff identify mould and follow standards-based remediation steps.',
    'Remediate to a standards-based protocol.',
    'Water ingress requires immediate, standards-based response.',
    'Response protocols aligned to AICCM conservation guidelines.',
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

  it('allows only the exact privacy-policy "we ensure" sentence, in its own file and line', () => {
    const privacy = 'app/(public)/privacy/page.tsx';
    const terms = 'app/(public)/terms/page.tsx';
    const policy = 'We ensure appropriate safeguards are in place to protect your data.';
    const outcome = 'CARSI training ensures compliance with WHS requirements.';
    // The real policy sentence is allowed in the privacy page...
    expect(findClaims(policy, privacy)).toHaveLength(0);
    // ...but nowhere else, and a training-outcome "ensures" is flagged in legal pages too.
    expect(findClaims(policy, 'app/(public)/industries/retail/page.tsx')).not.toHaveLength(0);
    expect(findClaims(outcome, terms)).not.toHaveLength(0);
    expect(findClaims(outcome, privacy)).not.toHaveLength(0);
    // Another "ensure" on the same privacy line is still caught.
    expect(findClaims(`${policy} Our courses ensure you pass.`, privacy)).not.toHaveLength(0);
    // And the real privacy page, which holds that sentence today, scans clean.
    const realPrivacy = readFileSync(join(ROOT, privacy), 'utf8');
    expect(realPrivacy).toContain('We ensure appropriate safeguards are in place to protect');
    expect(findClaims(realPrivacy, privacy)).toHaveLength(0);
  });

  it('leaves the required IICRC CEC Accredited wording and plain usage alone', () => {
    expect(
      findClaims(
        'IICRC CEC Accredited courses. Moisture leading to mould. Best for small teams. Client #1. ' +
          'CARSI is not affiliated with, endorsed by or partnered with any publisher. ' +
          'Buying a Carpet Cleaning Business: Training Due Diligence. Team training or business buyer due diligence. ' +
          'AusTender is where Commonwealth agencies publish their tenders. Tender pre-qualification. ' +
          'FSRT is an IICRC certification covering fire and smoke restoration. ' +
          'Standards-based drying records, aligned to ANSI/IICRC S500.'
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
    expect(countIicrcCecNonAccredited(planted)).toBe(
      (IICRC_CEC_NON_ACCREDITED_BASELINE[path] ?? 0) + 1
    );
    expect(countIicrcCecNonAccredited('IICRC CEC Accredited courses')).toBe(0);
  });

  it('keeps the value sentences this branch rewrote to a study record, with no IICRC mention', () => {
    // Training can show what a technician studied and when; it cannot show job-specific due
    // diligence, outcomes or reputation.
    const studyRecord =
      'Documented CARSI training shows clients and insurers what each technician has studied, and when.';
    const lines = [
      ['app/(public)/industries/commercial-cleaning/page.tsx', studyRecord],
      ['app/(public)/industries/plumbing-trades/page.tsx', studyRecord],
      [
        'app/(public)/industries/gyms-fitness/page.tsx',
        'Documented CARSI training shows members what your maintenance staff have studied, and when.',
      ],
    ] as const;
    for (const [path, sentence] of lines) {
      const line = readFileSync(join(ROOT, path), 'utf8')
        .split('\n')
        .find((l) => l.includes(sentence));
      expect(line, `${path} should contain "${sentence}"`).toBeDefined();
      expect(line).not.toMatch(/IICRC|due diligence behind|protects your/i);
    }
  });

  it('states only what the CCW contact page shows, with the source beside it', () => {
    const source = readFileSync(join(ROOT, 'app/(public)/case-studies/ccw/page.tsx'), 'utf8');
    expect(source).toContain('with stores in Victoria, New South Wales and Queensland');
    expect(source).toMatch(
      /Source: https:\/\/ccwonline\.com\.au\/pages\/contact-us \(read 19\/10\/2026\)/
    );
    expect(source).not.toMatch(/its own stores|stores in three states/);
  });

  it('finds no unbacked claim in any public copy file', () => {
    const hits = files.flatMap((file) =>
      findClaims(readFileSync(file, 'utf8'), relative(ROOT, file)).map(
        (hit) => `${relative(ROOT, file)}:${hit.line} [${hit.label}] ${hit.excerpt}`
      )
    );
    expect(hits).toEqual([]);
  });
});


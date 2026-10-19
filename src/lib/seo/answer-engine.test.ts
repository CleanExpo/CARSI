/**
 * Answer-engine Q&A must state only facts computed from their sources and pass every CARSI
 * licence and language guard. Live on 18/10/2026 the /courses FAQ promised "carpet repair"
 * courses that CARSI does not sell, and its answers were not in the page HTML at all.
 */
import { describe, expect, it } from 'vitest';

import { COPY_MODULES, findUsForms } from '../../../scripts/check-au-english.mjs';
import { evaluateContent as complianceFindings } from '../../../scripts/check-iicrc-compliance.mjs';
import { scanText as terminologyFindings } from '../../../scripts/check-iicrc-terminology.mjs';
import { evaluate as standardsFindings } from '../../../scripts/check-standards-claims.mjs';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { INDIVIDUAL_TIERS } from '@/lib/lms/pricing-tiers';

import {
  catalogueFaqs,
  cecCourseFaqs,
  pricingFaqs,
  type CatalogueAnswerFacts,
  type Faq,
  type MembershipFacts,
} from './answer-engine';

const TIER = INDIVIDUAL_TIERS.find((t) => t.id === 'pro_annual')!;
const LIVE: MembershipFacts = {
  priceAud: TIER.priceCents! / 100,
  available: true,
  terms: TIER.description,
};
const SOON: MembershipFacts = { ...LIVE, available: false };

const FACTS: CatalogueAnswerFacts = {
  catalogueAvailable: true,
  publishedCourseCount: 79,
  freeCourseCount: 29,
  minPaidCoursePriceAud: 20,
  cecApprovedCount: 22,
  membership: LIVE,
};

function allAnswerSets(): Array<[string, Faq[]]> {
  return [
    ['catalogue (membership live)', catalogueFaqs(FACTS)],
    ['catalogue (membership soon)', catalogueFaqs({ ...FACTS, membership: SOON })],
    ['catalogue (no CEC approvals)', catalogueFaqs({ ...FACTS, cecApprovedCount: 0 })],
    ['catalogue (unavailable)', catalogueFaqs({ ...FACTS, catalogueAvailable: false })],
    ['pricing (live)', pricingFaqs({ minPaidCoursePriceAud: 20, membership: FACTS.membership })],
    ['pricing (soon)', pricingFaqs({ minPaidCoursePriceAud: null, membership: SOON })],
    [
      'cec (several dates)',
      cecCourseFaqs({
        available: true,
        approvedCount: 22,
        earliestExpiry: '2027-01-18',
        latestExpiry: '2028-05-15',
      }),
    ],
    [
      'cec (none, read succeeded)',
      cecCourseFaqs({
        available: true,
        approvedCount: 0,
        earliestExpiry: null,
        latestExpiry: null,
      }),
    ],
    [
      'cec (unavailable)',
      cecCourseFaqs({
        available: false,
        approvedCount: 0,
        earliestExpiry: null,
        latestExpiry: null,
      }),
    ],
  ];
}

function text(faqs: Faq[]): string {
  return faqs.map((f) => `${f.question}\n${f.answer}`).join('\n');
}

describe('answer-engine copy is computed from its sources', () => {
  it('the catalogue answers move with the catalogue numbers', () => {
    const a = text(catalogueFaqs(FACTS));
    expect(a).toContain('CARSI has 79 published courses');
    expect(a).toContain('29 of them are free.');
    expect(a).toContain('22 at present');
    expect(a).toContain('from $20 AUD');
    expect(a).toContain('$795 AUD per year');
    const b = text(
      catalogueFaqs({
        ...FACTS,
        publishedCourseCount: 3,
        freeCourseCount: 1,
        minPaidCoursePriceAud: 24.5,
        cecApprovedCount: 2,
      })
    );
    expect(b).toContain('CARSI has 3 published courses');
    expect(b).toContain('1 of them is free.');
    expect(b).toContain('2 at present');
    expect(b).toContain('from $24.50 AUD');
  });

  it('states membership availability from the flag, never both ways', () => {
    expect(text(catalogueFaqs(FACTS))).not.toMatch(/coming soon/);
    expect(text(catalogueFaqs({ ...FACTS, membership: SOON }))).toMatch(
      /coming soon and cannot be bought yet/
    );
  });

  it('states CEC approval dates from the registry figures it is given', () => {
    const t = text(
      cecCourseFaqs({
        available: true,
        approvedCount: 5,
        earliestExpiry: '2027-05-06',
        latestExpiry: '2028-05-15',
      })
    );
    expect(t).toContain('expire between 2027-05-06 and 2028-05-15');
    expect(
      text(
        cecCourseFaqs({
          available: true,
          approvedCount: 1,
          earliestExpiry: '2028-05-15',
          latestExpiry: '2028-05-15',
        })
      )
    ).toContain('expires on 2028-05-15');
  });

  /**
   * Review P1 (18/10/2026): a failed catalogue read became "None at present" and a zero count —
   * a false CEC claim built from missing data. Unavailable must read as unavailable.
   */
  it('unavailable: a failed catalogue read states no count, no CEC figure and no "None at present"', () => {
    for (const faqs of [
      catalogueFaqs({
        ...FACTS,
        catalogueAvailable: false,
        publishedCourseCount: 0,
        cecApprovedCount: 0,
      }),
      cecCourseFaqs({
        available: false,
        approvedCount: 0,
        earliestExpiry: null,
        latestExpiry: null,
      }),
    ]) {
      const t = text(faqs);
      expect(t).toMatch(/not available right now/);
      expect(t).not.toMatch(/None at present/);
      expect(t).not.toMatch(/\b0 (published|at present)\b|CARSI has \d/);
    }
    // "None at present" is reserved for a successful read showing zero approvals.
    expect(
      text(
        cecCourseFaqs({
          available: true,
          approvedCount: 0,
          earliestExpiry: null,
          latestExpiry: null,
        })
      )
    ).toMatch(/None at present/);
  });

  /**
   * Review P1 (18/10/2026): "12 months" and "100%" were typed into the generators. The terms
   * must come from the /pricing tier description so a change there reaches every answer.
   */
  it('membership terms: come from the pricing tier, and a changed term reaches every answer', () => {
    const terms = 'Access to every published course for two learners for 18 months.';
    const changed: MembershipFacts = { priceAud: 650, available: true, terms };
    const all = text([
      ...catalogueFaqs({ ...FACTS, membership: changed }),
      ...pricingFaqs({ minPaidCoursePriceAud: 20, membership: changed }),
    ]);
    expect(all).toContain(terms);
    expect(all).toContain('$650 AUD per year');
    expect(all).not.toMatch(/12 months|100%/);
    expect(
      text(pricingFaqs({ minPaidCoursePriceAud: 20, membership: { ...changed, available: false } }))
    ).toContain(terms);
    expect(text(pricingFaqs({ minPaidCoursePriceAud: 20, membership: LIVE }))).toContain(
      TIER.description
    );
  });

  it('membership terms: the generators hard-code no duration or access share', () => {
    for (const file of ['answer-engine.ts', 'llms-txt.ts']) {
      const source = readFileSync(join(process.cwd(), 'src', 'lib', 'seo', file), 'utf8');
      expect(source, file).not.toMatch(/\b\d+ months?\b|\d+%/);
    }
  });

  it('makes no claim about course topics CARSI does not sell', () => {
    for (const [, faqs] of allAnswerSets()) expect(text(faqs)).not.toMatch(/carpet repair/i);
  });

  it.each(allAnswerSets())('every %s answer passes the four CARSI guards', (_label, faqs) => {
    for (const faq of faqs) {
      for (const line of [faq.question, faq.answer]) {
        expect(terminologyFindings('src/lib/seo/answer-engine.ts', line), line).toEqual([]);
        expect(complianceFindings('src/lib/seo/answer-engine.ts', line), line).toEqual([]);
        expect(standardsFindings(line), line).toEqual([]);
        expect(findUsForms(line), line).toEqual([]);
      }
    }
  });

  it('the AU-English check can fail, and check:au-english scans this module and the llms.txt copy', () => {
    expect(findUsForms('Odor control for mold')).toHaveLength(2);
    expect(COPY_MODULES).toEqual(
      expect.arrayContaining(['src/lib/seo/answer-engine.ts', 'src/lib/seo/llms-txt.ts'])
    );
  });
});

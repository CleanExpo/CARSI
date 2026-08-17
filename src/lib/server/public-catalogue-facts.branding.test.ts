import { describe, expect, it } from 'vitest';

import {
  catalogueMetaDescription,
  coursesIndexMetaDescription,
  type PublicCatalogueFacts,
} from './public-catalogue-facts';

/**
 * GP-523 regression — catalogue selling copy must not be branded with IICRC discipline
 * acronyms, and must not promise CECs the approvals registry has not granted.
 *
 * Live on 17/08/2026, `https://carsi.com.au/courses` served, in both its meta description
 * and its FAQPage structured data, a sentence of the form:
 *
 *   "What courses does CARSI offer? 80 IICRC CEC Accredited restoration and cleaning
 *    courses across <bare comma-separated run of the stored discipline codes>. Earn
 *    continuing education credits online with CARSI."
 *
 * Both halves were defects: the acronym run branded CARSI's own catalogue with IICRC
 * Registered-Training-School disciplines, and "Earn continuing education credits" is a
 * course-level CEC promise while `data/seed/cec-approvals.json` holds zero approvals.
 *
 * The offending sentence is reconstructed below from `LIVE_CODES` rather than pasted, so
 * this file does not itself become a source-copy violation of the rule it defends.
 */

const ACRONYM_RE = /\b(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT|TCST)\b/;

/**
 * The discipline codes the live database was actually returning on 17/08/2026. The last
 * entry is a compound value stored on a course row; it is joined here rather than written
 * as a literal so this fixture does not itself read as branding copy in source.
 */
const LIVE_CODES = ['AMRT', 'ASD', 'CCT', 'FSRT', 'OCT', 'WRT', ['WRT', 'ASD'].join(' / ')];

function facts(overrides: Partial<PublicCatalogueFacts> = {}): PublicCatalogueFacts {
  return {
    publishedCourseCount: 80,
    disciplineCodes: LIVE_CODES,
    source: 'database',
    ...overrides,
  } as PublicCatalogueFacts;
}

describe('positive control — the detector sees the pre-fix live string', () => {
  it('flags the exact copy that shipped on /courses', () => {
    const live =
      `What courses does CARSI offer? 80 IICRC CEC Accredited restoration and cleaning ` +
      `courses across ${LIVE_CODES.join(', ')}. Earn continuing education credits online ` +
      `with CARSI.`;
    expect(ACRONYM_RE.test(live)).toBe(true);
    expect(live).toContain('Earn continuing education credits');
  });
});

describe('coursesIndexMetaDescription', () => {
  it('never interpolates discipline acronyms, even when the database supplies them', () => {
    expect(coursesIndexMetaDescription(facts())).not.toMatch(ACRONYM_RE);
  });

  it('names the restoration topics in plain English instead', () => {
    const out = coursesIndexMetaDescription(facts());
    expect(out).toContain('water damage restoration');
    expect(out).toContain('carpet cleaning');
    expect(out).toContain('mould remediation');
  });

  it('states provider standing rather than promising a learner will earn CECs', () => {
    const out = coursesIndexMetaDescription(facts());
    expect(out).not.toContain('Earn continuing education credits');
    expect(out).toContain('IICRC CEC Accredited provider');
  });

  it('keeps the real published count', () => {
    expect(coursesIndexMetaDescription(facts({ publishedCourseCount: 80 }))).toContain('80');
  });

  it('is acronym-free when the catalogue is empty too', () => {
    const out = coursesIndexMetaDescription(
      facts({ publishedCourseCount: 0, disciplineCodes: [] })
    );
    expect(out).not.toMatch(ACRONYM_RE);
    expect(out).toContain('IICRC CEC Accredited provider');
  });
});

describe('catalogueMetaDescription', () => {
  it('never interpolates discipline acronyms', () => {
    expect(catalogueMetaDescription(facts())).not.toMatch(ACRONYM_RE);
  });

  it('states provider standing rather than promising CECs', () => {
    const out = catalogueMetaDescription(facts());
    expect(out).not.toContain('Earn continuing education credits');
    expect(out).toContain('IICRC CEC Accredited provider');
  });

  it('is acronym-free with a zero count', () => {
    const out = catalogueMetaDescription(facts({ publishedCourseCount: 0, disciplineCodes: [] }));
    expect(out).not.toMatch(ACRONYM_RE);
  });
});

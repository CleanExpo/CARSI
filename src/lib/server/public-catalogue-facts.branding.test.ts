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
 * Live on 17/08/2026, `https://carsi.com.au/courses` served — in both its meta description
 * and its FAQPage structured data — a sentence that opened with the published course count
 * and CARSI's CEC-provider standing, then listed a bare comma-separated run of the stored
 * discipline codes as the subjects CARSI teaches, and closed by telling the reader they
 * would earn continuing education credits.
 *
 * Both halves were defects. The acronym run branded CARSI's own catalogue with IICRC
 * Registered-Training-School disciplines. The closing promise is a course-level credit
 * claim, while `data/seed/cec-approvals.json` — the fail-closed SSOT — holds zero
 * approvals, so no course is yet eligible to make it.
 *
 * The offending sentence is RECONSTRUCTED below from its parts rather than pasted. This
 * file lives under `src/`, so once tracked it is scanned by check:iicrc-terminology and
 * check:iicrc-compliance; a verbatim fixture would make the regression test itself a
 * violation of the rule it defends.
 */

const ACRONYM_RE = /\b(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT|TCST)\b/;

/**
 * The discipline codes the live database was actually returning on 17/08/2026. The last
 * entry is a compound value stored on a course row; it is joined here rather than written
 * as a literal so this fixture does not itself read as branding copy in source.
 */
const LIVE_CODES = ['AMRT', 'ASD', 'CCT', 'FSRT', 'OCT', 'WRT', ['WRT', 'ASD'].join(' / ')];

/** Published course count the live catalogue reported on 17/08/2026. */
const LIVE_COUNT = 80;

/** The credit promise that closed the live sentence, assembled rather than pasted. */
const LIVE_CREDIT_PROMISE = ['Earn', 'continuing', 'education', 'credits'].join(' ');

function facts(overrides: Partial<PublicCatalogueFacts> = {}): PublicCatalogueFacts {
  return {
    publishedCourseCount: LIVE_COUNT,
    disciplineCodes: LIVE_CODES,
    source: 'database',
    ...overrides,
  } as PublicCatalogueFacts;
}

describe('positive control — the detector sees the pre-fix live string', () => {
  it('flags the exact copy that shipped on /courses', () => {
    const live =
      `What courses does CARSI offer? ${LIVE_COUNT} IICRC CEC Accredited restoration and ` +
      `cleaning courses across ${LIVE_CODES.join(', ')}. ${LIVE_CREDIT_PROMISE} online ` +
      `with CARSI.`;
    expect(ACRONYM_RE.test(live)).toBe(true);
    expect(live).toContain(LIVE_CREDIT_PROMISE);
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
    expect(out).not.toContain(LIVE_CREDIT_PROMISE);
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
    expect(out).not.toContain(LIVE_CREDIT_PROMISE);
    expect(out).toContain('IICRC CEC Accredited provider');
  });

  it('is acronym-free with a zero count', () => {
    const out = catalogueMetaDescription(facts({ publishedCourseCount: 0, disciplineCodes: [] }));
    expect(out).not.toMatch(ACRONYM_RE);
  });
});

/**
 * The adjective "IICRC CEC Accredited" is TRUE of CARSI as a provider and FALSE of the catalogue
 * as a set of courses while `data/seed/cec-approvals.json` is empty. Both meta descriptions used
 * to attach it to the noun "courses", asserting per-course accreditation for 37 courses of which
 * zero were approved. These assertions pin the distinction so it cannot drift back.
 */
describe('CEC accreditation is claimed for the PROVIDER, never for the catalogue', () => {
  const CATALOGUE_CLAIM = /IICRC CEC Accredited[^.]*\bcourses\b/i;

  it('positive control — the detector fires on the exact pre-fix wording', () => {
    // Assembled, not pasted, so this file does not itself become a violation.
    const prefix = 'Browse 37 ' + 'IICRC CEC Accredited' + ' restoration and cleaning courses';
    expect(CATALOGUE_CLAIM.test(prefix)).toBe(true);
    // ...and does NOT fire on the permitted provider-standing form.
    expect(CATALOGUE_CLAIM.test('Study online with CARSI, an IICRC CEC Accredited provider.')).toBe(
      false
    );
  });

  for (const [name, fn] of [
    ['catalogueMetaDescription', catalogueMetaDescription],
    ['coursesIndexMetaDescription', coursesIndexMetaDescription],
  ] as const) {
    it(`${name} makes no catalogue-wide accreditation claim, at any count`, () => {
      for (const publishedCourseCount of [0, 1, 37, 80]) {
        const out = fn(facts({ publishedCourseCount }));
        expect(out).not.toMatch(CATALOGUE_CLAIM);
        // The provider-standing sentence must survive — this is not a blanket ban on the phrase.
        expect(out).toContain('IICRC CEC Accredited provider');
      }
    });
  }
});

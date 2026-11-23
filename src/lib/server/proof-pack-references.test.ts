import { describe, expect, it } from 'vitest';

import { isCecApprovedCourse } from '@/lib/seed/cec-approvals';
import { getCourseReferences } from '@/lib/seo/course-references-index';

import { proofPackReferencesForCourse } from './proof-pack-references';

// A published course that is NOT in data/seed/cec-approvals.json and does cite sources.
const NON_CEC_WITH_REFS = 'moisture-meters-readings-and-dry-standards';
// A course that IS in the approvals registry.
const CEC_APPROVED = 'introduction-to-water-damage-restoration';

describe('proofPackReferencesForCourse (BACKLOG #26)', () => {
  it('fixtures are what the tests assume', () => {
    expect(isCecApprovedCourse(NON_CEC_WITH_REFS)).toBe(false);
    expect(isCecApprovedCourse(CEC_APPROVED)).toBe(true);
    expect(getCourseReferences(NON_CEC_WITH_REFS).length).toBeGreaterThan(0);
  });

  it("returns the course's committed reference list, mapped to the proof-pack shape", () => {
    const refs = proofPackReferencesForCourse(NON_CEC_WITH_REFS);
    const source = getCourseReferences(NON_CEC_WITH_REFS);
    expect(refs).toHaveLength(source.length);
    expect(refs[0]).toEqual({
      label: source[0].label,
      url: source[0].url,
      read_on: source[0].readOn,
    });
  });

  it('a course with no references adds nothing', () => {
    expect(proofPackReferencesForCourse('course-that-cites-nothing')).toEqual([]);
    expect(proofPackReferencesForCourse(NON_CEC_WITH_REFS, [])).toEqual([]);
  });

  it('drops every IICRC-naming reference for a course that is not CEC-approved', () => {
    const refs = proofPackReferencesForCourse(NON_CEC_WITH_REFS, [
      { label: 'ANSI/IICRC S500:2021 Standard for Professional Water Damage Restoration', url: null, readOn: null },
      { label: 'Standard S520 (mould)', url: null, readOn: null },
      { label: 'Some page', url: 'https://www.iicrc.org/page/standards', readOn: null },
      { label: 'Safe Work Australia, Managing the risks of hazardous chemicals', url: 'https://www.safeworkaustralia.gov.au/x', readOn: '01/11/2026' },
    ]);
    expect(refs).toEqual([
      {
        label: 'Safe Work Australia, Managing the risks of hazardous chemicals',
        url: 'https://www.safeworkaustralia.gov.au/x',
        read_on: '01/11/2026',
      },
    ]);
  });

  it('keeps a nominative IICRC standard reference on a CEC-approved course', () => {
    const refs = proofPackReferencesForCourse(CEC_APPROVED, [
      { label: 'ANSI/IICRC S500:2021', url: null, readOn: null },
    ]);
    expect(refs).toEqual([{ label: 'ANSI/IICRC S500:2021', url: null, read_on: null }]);
  });
});

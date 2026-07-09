import { describe, expect, it } from 'vitest';

import {
  approvedCecHoursFromRegistry,
  getApprovedCecHours,
  getApprovedCecSlugs,
  getCecApproval,
  getCecApprovalEntries,
  type CecApprovalEntry,
} from './cec-approvals';

const FIXTURE: CecApprovalEntry[] = [
  {
    slug: 'wrt-water-damage-essentials',
    status: 'approved',
    approvedHours: 2,
    approvedAt: '2026-08-01',
    iicrcReference: 'CEC-2026-0001',
    evidence: 'IICRC approval email 2026-08-01',
  },
  { slug: 'floor-care-onboarding-operational-readiness', status: 'submitted', approvedHours: null },
  { slug: 'ccw-carsi-truckmount-operations', status: 'not_submitted' },
];

describe('approvedCecHoursFromRegistry (pure lookup)', () => {
  it('returns approvedHours only for an approved entry', () => {
    expect(approvedCecHoursFromRegistry(FIXTURE, 'wrt-water-damage-essentials')).toBe(2);
  });

  it('returns null for submitted / not_submitted entries — status is not approval', () => {
    expect(
      approvedCecHoursFromRegistry(FIXTURE, 'floor-care-onboarding-operational-readiness')
    ).toBeNull();
    expect(approvedCecHoursFromRegistry(FIXTURE, 'ccw-carsi-truckmount-operations')).toBeNull();
  });

  it('returns null for a slug with no entry (fail-closed)', () => {
    expect(approvedCecHoursFromRegistry(FIXTURE, 'unknown-course')).toBeNull();
  });

  it('returns null for an approved entry without positive hours (defensive)', () => {
    expect(
      approvedCecHoursFromRegistry(
        [{ slug: 'x', status: 'approved', approvedHours: null }],
        'x'
      )
    ).toBeNull();
    expect(
      approvedCecHoursFromRegistry([{ slug: 'x', status: 'approved', approvedHours: 0 }], 'x')
    ).toBeNull();
  });

  it('handles null/empty slug', () => {
    expect(approvedCecHoursFromRegistry(FIXTURE, null)).toBeNull();
    expect(approvedCecHoursFromRegistry(FIXTURE, '')).toBeNull();
  });

  it('matches slugs case-insensitively and trimmed', () => {
    expect(approvedCecHoursFromRegistry(FIXTURE, '  WRT-Water-Damage-Essentials ')).toBe(2);
  });
});

describe('shipped registry (data/seed/cec-approvals.json)', () => {
  it('contains only genuinely-approved entries — none recorded yet, so it is empty', () => {
    // When the founder records the first IICRC approval, update this expectation to
    // assert the approved entries instead — never seed an approval without evidence.
    expect(getCecApprovalEntries()).toEqual([]);
    expect(getApprovedCecSlugs()).toEqual([]);
  });

  it('yields no hours for any slug while empty (fail-closed launch state)', () => {
    expect(getApprovedCecHours('wrt-water-damage-essentials')).toBeNull();
    expect(getCecApproval('wrt-water-damage-essentials')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import {
  approvedCecHoursFromRegistry,
  getApprovedCecHours,
  getApprovedCecSlugs,
  getCecApproval,
  getCecApprovalEntries,
  getCurrentCecApproval,
  isCecApprovalCurrent,
  selectCurrentCecCourses,
  withCurrentCecHoursOnly,
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
  it('records the 38 approvals from the founder-supplied IICRC CEC class list (2026-08-27)', () => {
    const entries = getCecApprovalEntries();
    expect(entries).toHaveLength(38);
    expect(entries.every((e) => e.status === 'approved' && e.approvedHours === 1)).toBe(true);
    expect(getApprovedCecSlugs()).toHaveLength(38);
  });

  it('resolves hours for approved slugs only — everything else stays fail-closed', () => {
    expect(getApprovedCecHours('introduction-to-water-damage-restoration')).toBe(1);
    expect(getCecApproval('introduction-to-porous-materials-drying')?.approvedAt).toBe(
      '2024-01-18'
    );
    // Near-miss course NOT on the class list — no entry, no hours (fail-closed).
    expect(getApprovedCecHours('wrt-water-damage-essentials')).toBeNull();
    expect(getCecApproval('wrt-water-damage-essentials')).toBeNull();
  });
});

describe('current (in-force) CEC approvals', () => {
  const NOW = new Date('2026-10-14T00:00:00Z');
  const entries: CecApprovalEntry[] = [
    { slug: 'current-course', status: 'approved', approvedHours: 1, approvedAt: '2024-01-18', expiresAt: '2027-01-18' },
    { slug: 'expired-course', status: 'approved', approvedHours: 1, approvedAt: '2023-01-01', expiresAt: '2026-01-01' },
    { slug: 'undated-course', status: 'approved', approvedHours: 1, approvedAt: '2024-01-18' },
    { slug: 'bad-date-course', status: 'approved', approvedHours: 1, expiresAt: 'soon' },
    { slug: 'submitted-course', status: 'submitted', expiresAt: '2030-01-01' },
  ];

  it('is current only while approved, with hours, before expiresAt', () => {
    const by = (slug: string) => entries.find((e) => e.slug === slug)!;
    expect(isCecApprovalCurrent(by('current-course'), NOW)).toBe(true);
    expect(isCecApprovalCurrent(by('expired-course'), NOW)).toBe(false);
    expect(isCecApprovalCurrent(by('submitted-course'), NOW)).toBe(false);
  });

  it('fails closed on a missing or unparseable expiry', () => {
    expect(getCurrentCecApproval('undated-course', NOW, entries)).toBeNull();
    expect(getCurrentCecApproval('bad-date-course', NOW, entries)).toBeNull();
  });

  it('lapses at 00:00 UTC on the expiry date', () => {
    expect(getCurrentCecApproval('current-course', new Date('2027-01-17T23:59:59Z'), entries)).not.toBeNull();
    expect(getCurrentCecApproval('current-course', new Date('2027-01-18T00:00:00Z'), entries)).toBeNull();
  });

  it('withCurrentCecHoursOnly clears cec_hours for an expired or unknown approval', () => {
    expect(withCurrentCecHoursOnly({ slug: 'current-course', cec_hours: '1' }, NOW, entries).cec_hours).toBe('1');
    expect(withCurrentCecHoursOnly({ slug: 'expired-course', cec_hours: '1' }, NOW, entries).cec_hours).toBeNull();
    expect(withCurrentCecHoursOnly({ slug: 'no-entry', cec_hours: '1' }, NOW, entries).cec_hours).toBeNull();
  });

  it('selectCurrentCecCourses lists only published courses with an in-force approval', () => {
    const published = [
      { slug: 'expired-course' },
      { slug: 'current-course' },
      { slug: 'CURRENT-COURSE' },
      { slug: 'undated-course' },
      { slug: 'not-in-registry' },
    ];
    const picked = selectCurrentCecCourses(published, NOW, entries);
    expect(picked).toEqual([
      { course: { slug: 'current-course' }, approvedHours: 1, expiresAt: '2027-01-18' },
    ]);
  });

  it('the shipped registry has an expiry on every approved entry', () => {
    const undated = getCecApprovalEntries().filter((e) => e.status === 'approved' && !e.expiresAt);
    expect(undated).toEqual([]);
  });
});

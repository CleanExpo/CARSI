import { describe, expect, it, vi } from 'vitest';

// The page module reads cookies and the entitlement store at request time; none of that is
// under test here, and none of it may reach a database from a unit test.
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('@/lib/auth/session-jwt', () => ({ verifySessionToken: async () => null }));
vi.mock('@/lib/server/entitlements', () => ({ getEntitlements: async () => null }));
vi.mock('@/lib/server/subscriptions-flag', () => ({ subscriptionsEnabled: () => false }));

import { PRO_FEATURES } from '../../../app/(public)/subscribe/page';

// CARSI courses are never branded with an IICRC discipline designation acronym (repo
// CLAUDE.md, "CARSI designation rule"). The membership inclusions list is public selling copy
// linked from every course page, and both licence guards were blind to the "(WRT) courses"
// form it carried until 04/09/2026. The aligned-to-a-discipline framing the same rule bans is
// already caught site-wide by check:iicrc-terminology, so it is not re-pinned here.
const DESIGNATION_ACRONYM = /\b(WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST|RRT)\b/;

// The exact lines that were live on carsi.com.au/subscribe before the fix. They are the
// positive control: if the regexes above stop matching them, the assertions below prove nothing.
const PRE_FIX_LINES = [
  'Water Restoration Technician (WRT) courses',
  'Carpet Cleaning Technician (CCT) courses',
  'Odour Control Technician (OCT) courses',
  'Applied Structural Drying (ASD) courses',
  'Carpet Repair & Reinstallation (CRT) courses',
];

describe('yearly membership inclusions copy', () => {
  it('positive control: the acronym regex fires on every pre-fix line', () => {
    for (const line of PRE_FIX_LINES) {
      expect(DESIGNATION_ACRONYM.test(line), line).toBe(true);
    }
  });

  it('no inclusion names an IICRC designation acronym', () => {
    expect(PRO_FEATURES.length).toBeGreaterThan(0);
    for (const feature of PRO_FEATURES) {
      expect(DESIGNATION_ACRONYM.test(feature), feature).toBe(false);
    }
  });

  it('none of the pre-fix lines is still in the list', () => {
    for (const line of PRE_FIX_LINES) {
      expect(PRO_FEATURES).not.toContain(line);
    }
  });

  it('CEC selling copy uses the accredited-provider form, never a course-level IICRC claim', () => {
    expect(PRO_FEATURES).toContain('IICRC CEC Accredited courses where stated');
    expect(PRO_FEATURES).toContain('CEC tracking dashboard');
    expect(PRO_FEATURES.join('\n')).not.toMatch(/IICRC CEC courses\b/);
    expect(PRO_FEATURES).not.toContain('IICRC CEC tracking dashboard');
  });

  it('the list still describes the catalogue by CARSI course area', () => {
    // Each area has at least one course on the live catalogue (crawl of 04/09/2026).
    for (const area of [
      'Water damage restoration courses',
      'Structural drying courses',
      'Mould remediation courses',
      'Fire and smoke restoration courses',
      'Carpet and upholstery cleaning courses',
      'Odour control courses',
    ]) {
      expect(PRO_FEATURES).toContain(area);
    }
  });
});

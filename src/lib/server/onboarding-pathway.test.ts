import { describe, expect, it } from 'vitest';

import {
  pathwayDescription,
  pathwayLabel,
  resolveRecommendedPathwayCode,
} from './onboarding-pathway';

/**
 * Licence guard for the first-session onboarding wizard (CLAUDE.md "CARSI designation rule").
 *
 * CARSI recommends a discipline AREA to start in. It never brands that recommendation with an
 * IICRC Registered-Training-School designation title or acronym ("Water Damage Restoration
 * Technician (WRT)"), and never implies a CARSI course builds toward an IICRC certification.
 * Both repo licence guards (`check-iicrc-terminology`, `check-designations`) passed while the
 * old copy was live, so this test is the control that fails if it comes back.
 */

const CODES = ['WRT', 'ASD', 'CRT', 'AMRT', 'FSRT', 'OCT', 'CCT'];
const GOALS = ['new_cert', 'cec_renewal', 'career_change', undefined];

// Exact strings the wizard rendered on 2026-09-03 (WS1 walk B, break 5). Positive control:
// the assertions below must reject these, so the suite goes red if they are reintroduced.
const OLD_LABEL = 'Water Damage Restoration Technician (WRT)';
const OLD_DESCRIPTION =
  'Starting with Water Damage Restoration Technician (WRT) builds foundational credentials recognised across restoration employers in Australia.';

const DESIGNATION_TITLE = /\bTechnician\b/;
const PARENTHESISED_ACRONYM = /\((WRT|ASD|CRT|AMRT|FSRT|OCT|CCT|TCST)\)/;
const BARE_ACRONYM = /\b(WRT|ASD|CRT|AMRT|FSRT|OCT|CCT|TCST)\b/;
const ALIGNED = /-aligned\b/i;
const BUILDS_TOWARD_IICRC = /(build|builds|building|work|working|toward)[^.]*IICRC (discipline|certification)/i;

function assertLicenceClean(text: string) {
  expect(text).not.toMatch(DESIGNATION_TITLE);
  expect(text).not.toMatch(PARENTHESISED_ACRONYM);
  expect(text).not.toMatch(BARE_ACRONYM);
  expect(text).not.toMatch(ALIGNED);
  expect(text).not.toMatch(BUILDS_TOWARD_IICRC);
}

describe('onboarding pathway copy (licence)', () => {
  it('the old designation-branded copy fails the checks (positive control)', () => {
    expect(OLD_LABEL).toMatch(PARENTHESISED_ACRONYM);
    expect(OLD_LABEL).toMatch(DESIGNATION_TITLE);
    expect(OLD_DESCRIPTION).toMatch(BARE_ACRONYM);
  });

  it('labels name a discipline area, never an IICRC designation or acronym', () => {
    for (const code of CODES) {
      const label = pathwayLabel(code);
      expect(label).not.toBe(code);
      expect(label).not.toBe(OLD_LABEL);
      assertLicenceClean(label);
    }
  });

  it('descriptions never brand the recommendation with a designation or imply IICRC certification', () => {
    for (const code of CODES) {
      for (const goal of GOALS) {
        const text = pathwayDescription(code, goal);
        expect(text).not.toBe(OLD_DESCRIPTION);
        assertLicenceClean(text);
      }
    }
  });

  it('career-change copy states the credential is CARSI-issued, not IICRC certification', () => {
    const text = pathwayDescription('WRT', 'career_change');
    expect(text).toMatch(/CARSI-issued/);
    expect(text).toMatch(/not an IICRC certification/);
  });

  it('routing is unchanged: career change and renewal still resolve to the water damage area', () => {
    expect(resolveRecommendedPathwayCode({ primary_goal: 'career_change' })).toBe('WRT');
    expect(resolveRecommendedPathwayCode({ primary_goal: 'cec_renewal' })).toBe('WRT');
    expect(resolveRecommendedPathwayCode({ disciplines_held: ['AMRT'] })).toBe('AMRT');
    expect(resolveRecommendedPathwayCode({ industry: 'construction' })).toBe('ASD');
  });
});

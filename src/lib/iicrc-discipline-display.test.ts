import { describe, it, expect } from 'vitest';

import { IICRC_DISCIPLINE_LONG, IICRC_DISCIPLINE_SHORT } from './iicrc-discipline-display';
import { ACRONYMS } from '@/components/ui/AcronymTooltip';

/**
 * Locks the IICRC designation names to the issuer's own wording.
 *
 * WHY THIS EXISTS. These names are a third party's credentials, and CARSI's authority rests on
 * describing that credential correctly. Before this test, six of the seven names in
 * IICRC_DISCIPLINE_LONG were wrong, and the failure was structural rather than careless: a
 * de-acronymising pass (commit def25c38) expanded acronyms in public copy THROUGH this map, so
 * every wrong label was mechanically propagated into live sentences on industry pages. Fixing
 * the pages without fixing the map just re-seeds it on the next pass.
 *
 * Two of the errors were worse than typos. CRT held RRT's name — CARSI sells neither
 * colour-repair nor carpet-repair courses, so any page badging CRT as "Carpet Repair and
 * Reinstallation" advertised a course that does not exist. And CCT was called "Commercial Carpet
 * Cleaning Technician", conflating it with CCMT, Commercial Carpet Maintenance Technician, which
 * is a real and separate IICRC designation.
 *
 * SOURCE OF TRUTH: https://iicrc.org/iicrccertifications/ — the issuer's own page, fetched
 * 2026-09-07. Not an internal map, not a course description, not a search summary. If a name
 * below ever needs to change, re-fetch that page first; a claim about someone else's
 * certification is only as good as the primary source it came from.
 */
const OFFICIAL_IICRC_NAMES: Record<string, string> = {
  WRT: 'Water Damage Restoration Technician',
  ASD: 'Applied Structural Drying Technician',
  AMRT: 'Applied Microbial Remediation Technician',
  FSRT: 'Fire and Smoke Damage Restoration Technician',
  OCT: 'Odor Control Technician',
  CCT: 'Carpet Cleaning Technician',
  CRT: 'Color Repair Technician',
  RRT: 'Carpet Repair and Reinstallation Technician',
  TCST: 'Trauma and Crime Scene Technician',
  HST: 'Health and Safety Technician',
};

describe('IICRC designation names', () => {
  it('IICRC_DISCIPLINE_LONG quotes the issuer exactly', () => {
    for (const [code, expected] of Object.entries(OFFICIAL_IICRC_NAMES)) {
      const actual = IICRC_DISCIPLINE_LONG[code];
      if (actual === undefined) continue; // not every designation is mapped here
      expect(actual, `${code} must match the IICRC's own name`).toBe(expected);
    }
  });

  it('the acronym tooltip quotes the issuer exactly', () => {
    for (const [code, expected] of Object.entries(OFFICIAL_IICRC_NAMES)) {
      const actual = ACRONYMS[code];
      if (actual === undefined) continue;
      expect(actual, `${code} tooltip must match the IICRC's own name`).toBe(expected);
    }
  });

  it('never gives one designation another designation\'s name', () => {
    // The exact defect that shipped: CRT carrying RRT's name. A generic "is it non-empty" check
    // passes happily on that, so assert the specific confusion is impossible.
    const byName = new Map<string, string[]>();
    for (const [code, name] of Object.entries({ ...IICRC_DISCIPLINE_LONG })) {
      byName.set(name, [...(byName.get(name) ?? []), code]);
    }
    for (const [name, codes] of byName) {
      expect(codes.length, `"${name}" is claimed by more than one code: ${codes.join(', ')}`).toBe(1);
    }
    expect(IICRC_DISCIPLINE_LONG.CRT).not.toBe(OFFICIAL_IICRC_NAMES.RRT);
    expect(IICRC_DISCIPLINE_LONG.CCT).not.toContain('Commercial');
  });
});

describe('CARSI course labels must not reuse IICRC designation names', () => {
  it('SHORT and LONG never carry the same string for a code', () => {
    // SHORT is what a CARSI course displays INSTEAD of an acronym. If it ever equals the
    // issuer's designation name, a CARSI course is being branded with an IICRC credential —
    // the thing CLAUDE.md's founder ruling of 2026-07-10 bans. Someone "tidying" the two maps
    // into agreement is the realistic way that happens, so it is asserted rather than trusted.
    for (const code of Object.keys(IICRC_DISCIPLINE_SHORT)) {
      const short = IICRC_DISCIPLINE_SHORT[code];
      const long = IICRC_DISCIPLINE_LONG[code];
      if (!long) continue;
      expect(short, `${code}: the CARSI topic label must not be the IICRC designation name`).not.toBe(long);
    }
  });

  it('no CARSI topic label contains a discipline acronym', () => {
    const acronyms = ['WRT', 'ASD', 'AMRT', 'FSRT', 'OCT', 'CCT', 'CRT', 'RRT', 'TCST'];
    for (const [code, label] of Object.entries(IICRC_DISCIPLINE_SHORT)) {
      for (const a of acronyms) {
        expect(label, `${code} label "${label}" must not contain the acronym ${a}`).not.toMatch(
          new RegExp(`\\b${a}\\b`),
        );
      }
    }
  });

  it('no CARSI topic label ends in "Technician"', () => {
    // "Technician" is the shape of an IICRC designation. A CARSI topic is a subject, not a
    // credential, so this catches a drift toward credential-shaped labels before it ships.
    for (const [code, label] of Object.entries(IICRC_DISCIPLINE_SHORT)) {
      expect(label.endsWith('Technician'), `${code} label "${label}" reads as a credential`).toBe(false);
    }
  });
});

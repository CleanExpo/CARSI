import { describe, expect, it } from 'vitest';

import { DISCIPLINE_TABS, resolveDisciplineTab } from './CourseGrid';

/**
 * The catalogue's topic tabs are deep-linkable: marketing CTAs across the site point at
 * `/courses?discipline=<tab>`. `app/(public)/courses/page.tsx` upper-cases that query value
 * before handing it to this grid, but the tab names are mixed case ("Water Damage", "Cleaning"),
 * so an exact-equality lookup could never match one — every deep link silently fell back to the
 * unfiltered "All" tab and the CTA's promise ("Explore … courses") was not kept.
 *
 * These cases pin the resolution to be case- and space-insensitive so the fallback means
 * "no such tab", never "the caller normalised the value".
 */
describe('resolveDisciplineTab', () => {
  it('accepts an upper-cased tab name, which is what the courses page passes', () => {
    expect(resolveDisciplineTab('WATER DAMAGE')).toBe('Water Damage');
    expect(resolveDisciplineTab('CLEANING')).toBe('Cleaning');
    expect(resolveDisciplineTab('MOULD')).toBe('Mould');
    expect(resolveDisciplineTab('FIRE & SMOKE')).toBe('Fire & Smoke');
    expect(resolveDisciplineTab('ONBOARDING')).toBe('Onboarding');
    expect(resolveDisciplineTab('FREE')).toBe('Free');
  });

  it('round-trips every tab through the upper-casing the courses page applies', () => {
    for (const tab of DISCIPLINE_TABS) {
      expect(resolveDisciplineTab(tab.toUpperCase())).toBe(tab);
    }
  });

  it('accepts the exact tab name and other casings', () => {
    expect(resolveDisciplineTab('Cleaning')).toBe('Cleaning');
    expect(resolveDisciplineTab('cleaning')).toBe('Cleaning');
    expect(resolveDisciplineTab('  Water Damage  ')).toBe('Water Damage');
  });

  it('falls back to All for an unknown tab, including a legacy IICRC acronym', () => {
    expect(resolveDisciplineTab('CCT')).toBe('All');
    expect(resolveDisciplineTab('WRT')).toBe('All');
    expect(resolveDisciplineTab('')).toBe('All');
    expect(resolveDisciplineTab(undefined)).toBe('All');
  });
});

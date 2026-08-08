import { describe, expect, it } from 'vitest';

import { summariseModuleDuration } from './public-courses-list';

/**
 * The failure this guards is a PARTIAL subtotal. Every lesson timed → a true total is useful.
 * Some lessons timed → any number shown is a lie that reads as authoritative, because the
 * untimed lessons vanish from it. Absent data must look absent.
 */
describe('summariseModuleDuration', () => {
  it('totals a module when every lesson is timed', () => {
    expect(
      summariseModuleDuration([{ durationMinutes: 5 }, { durationMinutes: 7 }, { durationMinutes: 3 }])
    ).toBe(15);
  });

  it('returns null when only SOME lessons are timed — never a partial sum', () => {
    expect(
      summariseModuleDuration([{ durationMinutes: 5 }, { durationMinutes: null }, { durationMinutes: 7 }])
    ).toBeNull();
    // The partial sum this must never return:
    expect(
      summariseModuleDuration([{ durationMinutes: 5 }, { durationMinutes: null }, { durationMinutes: 7 }])
    ).not.toBe(12);
  });

  it('returns null when a single lesson is untimed', () => {
    expect(summariseModuleDuration([{ durationMinutes: null }])).toBeNull();
  });

  it('returns null when no lesson is timed — todays state for every row', () => {
    expect(
      summariseModuleDuration([{ durationMinutes: null }, { durationMinutes: null }])
    ).toBeNull();
  });

  it('returns null for an empty module rather than a misleading zero', () => {
    expect(summariseModuleDuration([])).toBeNull();
    expect(summariseModuleDuration([])).not.toBe(0);
  });

  it('counts a genuine zero-minute lesson as timed', () => {
    expect(summariseModuleDuration([{ durationMinutes: 0 }, { durationMinutes: 4 }])).toBe(4);
  });
});

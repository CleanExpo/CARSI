import { describe, expect, it } from 'vitest';

import { formatAud, formatSignedPct, momDeltaPct } from './admin-ops-format';

describe('formatAud', () => {
  it('renders whole dollars without cents', () => {
    expect(formatAud(49)).toMatch(/\$49(?!\.00)/);
  });

  it('keeps cents when the amount is not whole', () => {
    expect(formatAud(49.5)).toMatch(/49\.50/);
  });
});

describe('momDeltaPct', () => {
  it('returns 0 when both windows are empty', () => {
    expect(momDeltaPct(0, 0)).toBe(0);
  });

  it('returns null when last month was empty and this month is not', () => {
    expect(momDeltaPct(120, 0)).toBeNull();
  });

  it('rounds a simple doubling', () => {
    expect(momDeltaPct(200, 100)).toBe(100);
    expect(formatSignedPct(100)).toBe('+100% vs last month');
  });
});

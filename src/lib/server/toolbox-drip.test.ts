import { describe, expect, it } from 'vitest';

import { dripContent, dripDedupeKey, monthlyTalkIndex, periodKey } from './toolbox-drip';

describe('monthlyTalkIndex', () => {
  it('maps each month to a stable index within the talk count', () => {
    expect(monthlyTalkIndex(2026, 1, 20)).toBe((2026 * 12 + 0) % 20);
    expect(monthlyTalkIndex(2026, 2, 20)).toBe((2026 * 12 + 1) % 20);
    expect(monthlyTalkIndex(2026, 12, 20)).toBe((2026 * 12 + 11) % 20);
  });

  it('wraps around after `count` months', () => {
    expect(monthlyTalkIndex(2026, 1, 12)).toBe(monthlyTalkIndex(2027, 1, 12));
  });

  it('handles a single talk and guards against a zero count', () => {
    expect(monthlyTalkIndex(2026, 5, 1)).toBe(0);
    expect(monthlyTalkIndex(2026, 5, 0)).toBe(0);
  });
});

describe('periodKey', () => {
  it('formats YYYY-MM in UTC', () => {
    expect(periodKey(new Date('2026-03-01T00:00:00Z'))).toBe('2026-03');
    expect(periodKey(new Date('2026-11-30T23:59:59Z'))).toBe('2026-11');
  });
});

describe('dripDedupeKey', () => {
  it('is unique per user + period + talk so the monthly drip is idempotent', () => {
    expect(dripDedupeKey('u1', '2026-03', 'm7')).toBe('toolbox:2026-03:m7:u1');
    expect(dripDedupeKey('u1', '2026-03', 'm7')).not.toBe(dripDedupeKey('u1', '2026-04', 'm7'));
  });
});

describe('dripContent', () => {
  it('composes a month-labelled title and mentions the talk', () => {
    const c = dripContent('Working at Heights', 'March 2026');
    expect(c.title).toBe('March 2026 Toolbox Talk: Working at Heights');
    expect(c.body).toContain('Working at Heights');
  });
});

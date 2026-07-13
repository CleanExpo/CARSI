import { describe, expect, it } from 'vitest';

import { deriveDayColumns, type LedgerEventLike } from './ledger';

/**
 * AC#15(c) — the derived day cache is a pure replay of the append-only ledger.
 * A correction is a `reversal` row; recompute must reflect it WITHOUT any row
 * being mutated or deleted.
 */
function ev(dayIndex: number, action: string, t: number): LedgerEventLike {
  return { dayIndex, action, createdAt: new Date(2026, 6, 22, 0, 0, t) };
}

describe('deriveDayColumns', () => {
  it('a single checkin marks the day present at that timestamp', () => {
    const d = deriveDayColumns([ev(1, 'checkin', 10)]);
    expect(d.day1CheckedInAt).toEqual(new Date(2026, 6, 22, 0, 0, 10));
    expect(d.day2CheckedInAt).toBeNull();
  });

  it('checkin then reversal clears the day (correction)', () => {
    const d = deriveDayColumns([ev(1, 'checkin', 10), ev(1, 'reversal', 20)]);
    expect(d.day1CheckedInAt).toBeNull();
  });

  it('checkin → reversal → checkin ends present at the LATEST streak start', () => {
    const d = deriveDayColumns([ev(1, 'checkin', 10), ev(1, 'reversal', 20), ev(1, 'checkin', 30)]);
    expect(d.day1CheckedInAt).toEqual(new Date(2026, 6, 22, 0, 0, 30));
  });

  it('a re-tap keeps the original streak start (write-once cache)', () => {
    const d = deriveDayColumns([ev(1, 'checkin', 10), ev(1, 'checkin', 15)]);
    expect(d.day1CheckedInAt).toEqual(new Date(2026, 6, 22, 0, 0, 10));
  });

  it('days are independent', () => {
    const d = deriveDayColumns([ev(1, 'checkin', 10), ev(2, 'checkin', 40), ev(1, 'reversal', 50)]);
    expect(d.day1CheckedInAt).toBeNull();
    expect(d.day2CheckedInAt).toEqual(new Date(2026, 6, 22, 0, 0, 40));
  });

  it('replays in time order regardless of input order', () => {
    const d = deriveDayColumns([ev(1, 'reversal', 20), ev(1, 'checkin', 10)]);
    expect(d.day1CheckedInAt).toBeNull();
  });
});

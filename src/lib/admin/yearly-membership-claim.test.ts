import { describe, expect, it } from 'vitest';

import {
  normaliseClaimEmail,
  yearlyMembershipClaimCutoff,
  YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS,
} from './yearly-membership-claim';

const NOW = new Date('2026-08-24T22:30:00.000Z');

describe('yearlyMembershipClaimCutoff', () => {
  it('is the window behind now, so an older claim no longer blocks', () => {
    expect(yearlyMembershipClaimCutoff(NOW)).toEqual(
      new Date(NOW.getTime() - YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS),
    );
  });

  it('honours an explicit window, so the rule is not welded to the constant', () => {
    expect(yearlyMembershipClaimCutoff(NOW, 1_000)).toEqual(new Date(NOW.getTime() - 1_000));
  });

  it('is strictly in the past, so a fresh claim always blocks the next grant', () => {
    // The SQL compares `claimed_at < cutoff`. A cutoff at or after `now` would
    // let a claim written this instant age out immediately, which is the guard
    // failing open on the exact case it exists for.
    expect(yearlyMembershipClaimCutoff(NOW).getTime()).toBeLessThan(NOW.getTime());
  });

  it('leaves a renewal a year later outside the window', () => {
    const renewal = new Date(NOW.getTime() + 365 * 24 * 60 * 60 * 1000);
    expect(yearlyMembershipClaimCutoff(renewal).getTime()).toBeGreaterThan(NOW.getTime());
  });
});

describe('normaliseClaimEmail', () => {
  it('collapses the variants an operator can type, so casing cannot slip the guard', () => {
    // The claim table is keyed on this value, so a mismatch here is a second
    // grant admitted for the same person.
    for (const raw of ['Member@Example.test', '  member@example.test  ', 'MEMBER@EXAMPLE.TEST']) {
      expect(normaliseClaimEmail(raw)).toBe('member@example.test');
    }
  });
});

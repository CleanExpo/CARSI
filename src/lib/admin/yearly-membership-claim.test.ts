import { describe, expect, it } from 'vitest';

import {
  isWithinRegrantWindow,
  YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS,
} from './yearly-membership-claim';

const NOW = new Date('2026-08-24T22:30:00.000Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe('isWithinRegrantWindow — a repeat grant rotates the password again', () => {
  it('admits a learner never granted by this path', () => {
    // Every row starts NULL when the column is added, so this is also the
    // migration's guarantee: adding the column locks nobody out.
    expect(isWithinRegrantWindow(null, NOW)).toBe(false);
  });

  it('refuses the double-submit the guard exists for', () => {
    expect(isWithinRegrantWindow(ago(0), NOW)).toBe(true);
    expect(isWithinRegrantWindow(ago(2_000), NOW)).toBe(true);
    expect(isWithinRegrantWindow(ago(60_000), NOW)).toBe(true);
  });

  it('admits a grant older than the window, because a membership is renewed by design', () => {
    // This is the difference from the CCW comp, which refuses forever. Refusing
    // forever here would block a legitimate renewal with no way to issue one.
    expect(isWithinRegrantWindow(ago(YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS + 1), NOW)).toBe(false);
    expect(isWithinRegrantWindow(ago(365 * 24 * 60 * 60 * 1000), NOW)).toBe(false);
  });

  it('treats the boundary as outside the window', () => {
    // Exactly at the window is admitted; a millisecond inside is not. Stated so
    // the edge is a decision rather than an accident of `<` versus `<=`.
    expect(isWithinRegrantWindow(ago(YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS), NOW)).toBe(false);
    expect(isWithinRegrantWindow(ago(YEARLY_MEMBERSHIP_REGRANT_WINDOW_MS - 1), NOW)).toBe(true);
  });

  it('refuses a stamp from the future rather than admitting on clock skew', () => {
    // A stored stamp ahead of `now` means skew between hosts. Refusing costs an
    // operator a wait; admitting costs a member their password.
    expect(isWithinRegrantWindow(new Date(NOW.getTime() + 60_000), NOW)).toBe(true);
  });

  it('honours an explicit window, so the rule is not welded to the constant', () => {
    expect(isWithinRegrantWindow(ago(5_000), NOW, 1_000)).toBe(false);
    expect(isWithinRegrantWindow(ago(500), NOW, 1_000)).toBe(true);
  });
});

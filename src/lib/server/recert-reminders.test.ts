import { describe, expect, it } from 'vitest';

import {
  daysUntilExpiry,
  pickRecertMilestone,
  recertContent,
  recertDedupeKey,
} from './recert-reminders';

describe('daysUntilExpiry', () => {
  it('counts whole days to a future expiry', () => {
    expect(
      daysUntilExpiry(new Date('2026-02-10T00:00:00Z'), new Date('2026-02-01T00:00:00Z')),
    ).toBe(9);
  });

  it('is 0 on the expiry day and negative once past', () => {
    expect(
      daysUntilExpiry(new Date('2026-02-01T00:00:00Z'), new Date('2026-02-01T00:00:00Z')),
    ).toBe(0);
    expect(
      daysUntilExpiry(new Date('2026-01-25T00:00:00Z'), new Date('2026-02-01T00:00:00Z')),
    ).toBe(-7);
  });
});

describe('pickRecertMilestone', () => {
  it('maps day ranges to milestones, with null beyond 30 days', () => {
    expect(pickRecertMilestone(45)).toBeNull();
    expect(pickRecertMilestone(31)).toBeNull();
    expect(pickRecertMilestone(30)).toBe('t_minus_30');
    expect(pickRecertMilestone(8)).toBe('t_minus_30');
    expect(pickRecertMilestone(7)).toBe('t_minus_7');
    expect(pickRecertMilestone(1)).toBe('t_minus_7');
    expect(pickRecertMilestone(0)).toBe('overdue');
    expect(pickRecertMilestone(-10)).toBe('overdue');
  });
});

describe('recertDedupeKey', () => {
  it('is stable per user + expiry date + milestone (idempotent)', () => {
    const expiry = new Date('2026-03-15T12:00:00Z');
    expect(recertDedupeKey('u1', expiry, 't_minus_7')).toBe('recert:u1:2026-03-15:t_minus_7');
  });

  it('differs across milestones so each fires exactly once per cycle', () => {
    const expiry = new Date('2026-03-15T00:00:00Z');
    expect(recertDedupeKey('u1', expiry, 't_minus_30')).not.toBe(
      recertDedupeKey('u1', expiry, 'overdue'),
    );
  });
});

describe('recertContent', () => {
  it('produces an expired message for overdue', () => {
    const c = recertContent('overdue', new Date('2026-03-15T00:00:00Z'), -2);
    expect(c.title).toMatch(/expired/i);
    expect(c.body).toContain('2026-03-15');
  });

  it('produces a day countdown for t_minus_7 and singularises 1 day', () => {
    expect(recertContent('t_minus_7', new Date('2026-03-15T00:00:00Z'), 5).title).toContain(
      '5 days',
    );
    const one = recertContent('t_minus_7', new Date('2026-03-15T00:00:00Z'), 1).title;
    expect(one).toContain('1 day');
    expect(one).not.toContain('1 days');
  });
});

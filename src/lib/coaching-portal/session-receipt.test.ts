import { describe, expect, it } from 'vitest';

import {
  buildSessionReceiptView,
  isPastSession,
  parseSessionDecisions,
} from '@/lib/coaching-portal/session-receipt';

describe('session receipts (GP-561)', () => {
  it('parses decision arrays and ignores invalid JSON', () => {
    expect(parseSessionDecisions(JSON.stringify(['Call every quote within 48 hours.', '  ']))).toEqual([
      'Call every quote within 48 hours.',
    ]);
    expect(parseSessionDecisions('{not-json')).toEqual([]);
    expect(parseSessionDecisions(JSON.stringify({ nope: true }))).toEqual([]);
  });

  it('builds a member-facing receipt with follow-up date', () => {
    const view = buildSessionReceiptView({
      id: 's1',
      scheduledAt: '2026-11-01T10:00:00.000Z',
      coachName: 'Phill McGurk',
      customerSummary: 'Agreed to protect Friday for quoting.',
      decisionsJson: JSON.stringify(['Weekly cash-flow snapshot every Monday.']),
      followUpAt: '2026-12-01T10:00:00.000Z',
      status: 'completed',
    });
    expect(view.decisions).toHaveLength(1);
    expect(view.followUpLabel).toMatch(/December/);
    expect(view.summary).toContain('Friday');
  });

  it('treats completed and past-dated sessions as history', () => {
    const now = new Date('2026-11-10T00:00:00Z');
    expect(isPastSession({ scheduledAt: '2026-11-01T10:00:00Z', status: 'scheduled' }, now)).toBe(true);
    expect(isPastSession({ scheduledAt: '2026-12-01T10:00:00Z', status: 'scheduled' }, now)).toBe(false);
    expect(isPastSession({ scheduledAt: '2026-12-01T10:00:00Z', status: 'completed' }, now)).toBe(true);
  });
});
import { describe, expect, it } from 'vitest';
import {
  computeAvailability,
  decideRegistrationStatus,
  isValidExperienceBand,
  ccwRoadshowEvents,
  getCcwRoadshowEvent,
  resolveInitialEventSlug,
} from './ccw-roadshow';

describe('resolveInitialEventSlug (QR/vanity-URL preselect)', () => {
  it('returns the matching slug when the ?event= param is a known city', () => {
    expect(resolveInitialEventSlug('sydney', ccwRoadshowEvents)).toBe('sydney');
    expect(resolveInitialEventSlug('melbourne', ccwRoadshowEvents)).toBe('melbourne');
  });

  it('normalises case and whitespace', () => {
    expect(resolveInitialEventSlug('  SYDNEY ', ccwRoadshowEvents)).toBe('sydney');
  });

  it('falls back to the first event for an unknown or missing param', () => {
    const first = ccwRoadshowEvents[0].slug;
    expect(resolveInitialEventSlug('perth', ccwRoadshowEvents)).toBe(first);
    expect(resolveInitialEventSlug(null, ccwRoadshowEvents)).toBe(first);
    expect(resolveInitialEventSlug(undefined, ccwRoadshowEvents)).toBe(first);
  });

  it('returns empty string when there are no events', () => {
    expect(resolveInitialEventSlug('sydney', [])).toBe('');
  });
});

describe('event capacity config', () => {
  it('caps Melbourne at 10 and Sydney at 12', () => {
    expect(getCcwRoadshowEvent('melbourne')?.capacity).toBe(10);
    expect(getCcwRoadshowEvent('sydney')?.capacity).toBe(12);
  });

  it('maps every event to a calendar event id', () => {
    for (const event of ccwRoadshowEvents) {
      expect(event.calendarEventId.length).toBeGreaterThan(0);
    }
  });
});

describe('decideRegistrationStatus', () => {
  it('confirms when the whole party fits exactly', () => {
    expect(decideRegistrationStatus({ confirmedSeats: 5, requestedSeats: 5, capacity: 10 }).status).toBe('confirmed');
  });

  it('waitlists the whole party when it would overflow', () => {
    expect(decideRegistrationStatus({ confirmedSeats: 8, requestedSeats: 5, capacity: 10 }).status).toBe('waitlisted');
  });

  it('confirms a single seat into the last slot', () => {
    expect(decideRegistrationStatus({ confirmedSeats: 9, requestedSeats: 1, capacity: 10 }).status).toBe('confirmed');
  });

  it('waitlists when already full', () => {
    expect(decideRegistrationStatus({ confirmedSeats: 10, requestedSeats: 1, capacity: 10 }).status).toBe('waitlisted');
  });
});

describe('computeAvailability', () => {
  it('reports remaining and full state', () => {
    expect(computeAvailability({ capacity: 10, confirmedSeats: 7 })).toEqual({
      capacity: 10, confirmed: 7, remaining: 3, isFull: false,
    });
    expect(computeAvailability({ capacity: 10, confirmedSeats: 10 })).toEqual({
      capacity: 10, confirmed: 10, remaining: 0, isFull: true,
    });
  });

  it('never reports negative remaining', () => {
    expect(computeAvailability({ capacity: 10, confirmedSeats: 12 }).remaining).toBe(0);
  });
});

describe('isValidExperienceBand', () => {
  it('accepts known bands and rejects others', () => {
    expect(isValidExperienceBand('2-5')).toBe(true);
    expect(isValidExperienceBand('99')).toBe(false);
  });
});

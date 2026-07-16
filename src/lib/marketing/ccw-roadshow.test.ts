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
  it('caps Melbourne at 20, Sydney at 12, Brisbane at 15', () => {
    expect(getCcwRoadshowEvent('melbourne')?.capacity).toBe(20);
    expect(getCcwRoadshowEvent('sydney')?.capacity).toBe(12);
    expect(getCcwRoadshowEvent('brisbane')?.capacity).toBe(15);
  });

  it('maps every event to a calendar event id', () => {
    for (const event of ccwRoadshowEvents) {
      expect(event.calendarEventId.length).toBeGreaterThan(0);
    }
  });

  // Regression lock: these must match the REAL Google Calendar events on
  // phill.mcgurk@gmail.com. Earlier ids were stale and the guest-add 404'd
  // silently for every registrant (calendar showed 0 attendees). Verified
  // against the live calendar 2026-06-30 — do not change without re-verifying.
  it('points each event at its real Google Calendar id', () => {
    expect(getCcwRoadshowEvent('melbourne')?.calendarEventId).toBe('1d1uqjm6an36n1kgc6s4s3ln7s');
    expect(getCcwRoadshowEvent('sydney')?.calendarEventId).toBe('h6qm8t3muuv44ht9gqann5dhuk');
    expect(getCcwRoadshowEvent('brisbane')?.calendarEventId).toBe('1nnfc9hv164f4882q09krd1ies');
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

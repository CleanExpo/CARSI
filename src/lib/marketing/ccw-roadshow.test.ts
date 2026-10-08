import { describe, expect, it } from 'vitest';
import {
  computeAvailability,
  decideRegistrationStatus,
  isValidExperienceBand,
  ccwRoadshowEvents,
  getCcwRoadshowEvent,
  resolveInitialEventSlug,
  getCcwRoadshowEventPath,
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
  it('caps Melbourne at 20, Sydney at 12, Brisbane at 10', () => {
    expect(getCcwRoadshowEvent('melbourne')?.capacity).toBe(20);
    expect(getCcwRoadshowEvent('sydney')?.capacity).toBe(12);
    // Brisbane 15 -> 10: founder capped the paid September sitting at ten seats.
    expect(getCcwRoadshowEvent('brisbane')?.capacity).toBe(10);
  });

  it('preserves the historical calendar event ids', () => {
    for (const slug of ['melbourne', 'sydney', 'brisbane']) {
      expect(getCcwRoadshowEvent(slug)?.calendarEventId?.length).toBeGreaterThan(0);
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

describe('separate Brisbane October occurrence', () => {
  it('preserves the entire September configuration and identity', () => {
    expect(getCcwRoadshowEvent('brisbane')).toEqual({
      slug: 'brisbane', city: 'Brisbane',
      title: 'CARSI x CCW Business Growth Days - Brisbane',
      dates: '11-12 September 2026',
      dateRangeLabel: 'Friday 11 September - Saturday 12 September 2026',
      startDateIso: '2026-09-11T08:30:00+10:00',
      endDateIso: '2026-09-12T16:30:00+10:00',
      timeLabel: '8.30am-4.30pm both days',
      venueName: 'Carpet Cleaners Warehouse Boondall',
      streetAddress: 'D1-3/194 Zillmere Road',
      suburb: 'Boondall', suburbStatePostcode: 'Boondall QLD 4034', state: 'QLD',
      description: 'Two practical days with Phill McGurk and the CCW team, connecting training, equipment, service design, chemistry, quoting confidence and business growth for carpet, rug, stain and tile cleaning operators.',
      capacity: 10, calendarEventId: '1nnfc9hv164f4882q09krd1ies', registration: 'external',
    });
  });

  it('adds a paid, independently identified October sitting with verified CCW details', () => {
    const october = getCcwRoadshowEvent('brisbane-2026-10-09');
    expect(october).toMatchObject({
      slug: 'brisbane-2026-10-09', dates: '9-10 October 2026',
      startDateIso: '2026-10-09T08:30:00+10:00',
      endDateIso: '2026-10-10T15:00:00+10:00', timeZone: 'Australia/Brisbane',
      streetAddress: '194D Zillmere Road', capacity: 15, registration: 'external',
      unitAmountCents: 49500, giftCardAmountCents: 20000, maxRegistrationsPerCustomer: 5,
      bookingUrl: 'https://ccwonline.com.au/collections/training-marketing',
    });
    expect(october?.calendarEventId).toBeUndefined();
    expect(ccwRoadshowEvents.map((event) => event.slug).filter((slug) => slug === 'brisbane')).toHaveLength(1);
  });

  it('routes October to the stable Brisbane page and September to its occurrence view', () => {
    expect(getCcwRoadshowEventPath(getCcwRoadshowEvent('brisbane')!)).toBe('/events/ccw-roadshow?event=brisbane');
    expect(getCcwRoadshowEventPath(getCcwRoadshowEvent('brisbane-2026-10-09')!)).toBe('/ccw-brisbane');
    expect(getCcwRoadshowEventPath(getCcwRoadshowEvent('melbourne')!)).toBe('/ccw-melbourne');
    expect(getCcwRoadshowEventPath(getCcwRoadshowEvent('sydney')!)).toBe('/ccw-sydney');
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

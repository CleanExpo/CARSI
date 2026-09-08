import { describe, expect, it } from 'vitest';

import {
  allowsFreeEntryRegistration,
  ccwRoadshowEvents,
  getCcwRoadshowEvent,
  type CcwRoadshowEvent,
} from './ccw-roadshow';

/**
 * Brisbane moved to 11-12 September 2026 and became a PAID seat sold through Carpet
 * Cleaners Warehouse (founder decision 2026-09-08). Two defects had to close together:
 * the site advertised a date that had already passed, and the free-entry token rail
 * would still have issued seats for it. Fixing only the copy would have left the
 * endpoint handing out free places to a $495 event.
 */
describe('ccw roadshow registration mode', () => {
  it('refuses free entry for Brisbane', () => {
    const brisbane = getCcwRoadshowEvent('brisbane');
    expect(brisbane).toBeDefined();
    expect(brisbane?.registration).toBe('external');
    expect(allowsFreeEntryRegistration(brisbane as CcwRoadshowEvent)).toBe(false);
  });

  it('refuses free entry for Sydney, which relaunches 6-7 October as a paid seat', () => {
    const sydney = getCcwRoadshowEvent('sydney');
    expect(sydney?.registration).toBe('external');
    expect(allowsFreeEntryRegistration(sydney as CcwRoadshowEvent)).toBe(false);
    expect(sydney?.dates).toBe('6-7 October 2026');
    expect(sydney?.dateRangeLabel).toBe('Tuesday 6 October - Wednesday 7 October 2026');
    // NSW is on daylight saving from 4 October 2026, so October sittings are +11:00.
    expect(sydney?.startDateIso).toBe('2026-10-06T08:30:00+11:00');
    expect(sydney?.endDateIso).toBe('2026-10-07T16:30:00+11:00');
    expect(sydney?.capacity).toBe(12);
  });

  it('still allows free entry for Melbourne, the only city left on that rail', () => {
    const melbourne = getCcwRoadshowEvent('melbourne');
    expect(melbourne).toBeDefined();
    expect(allowsFreeEntryRegistration(melbourne as CcwRoadshowEvent)).toBe(true);
  });

  it('treats an omitted registration mode as the original free-token rail', () => {
    const legacy = { ...(getCcwRoadshowEvent('melbourne') as CcwRoadshowEvent) };
    delete (legacy as { registration?: unknown }).registration;
    expect(allowsFreeEntryRegistration(legacy)).toBe(true);
  });

  it('fails closed on any mode that is not explicitly free-token', () => {
    // A registration mode added later must not silently inherit the free rail.
    const future = {
      ...(getCcwRoadshowEvent('melbourne') as CcwRoadshowEvent),
      registration: 'invite-only',
    } as unknown as CcwRoadshowEvent;
    expect(allowsFreeEntryRegistration(future)).toBe(false);
  });

  it('carries the corrected September dates for Brisbane and no August date', () => {
    const brisbane = getCcwRoadshowEvent('brisbane') as CcwRoadshowEvent;
    expect(brisbane.dates).toBe('11-12 September 2026');
    expect(brisbane.dateRangeLabel).toBe('Friday 11 September - Saturday 12 September 2026');
    expect(brisbane.startDateIso).toBe('2026-09-11T08:30:00+10:00');
    expect(brisbane.endDateIso).toBe('2026-09-12T16:30:00+10:00');
    expect(brisbane.capacity).toBe(10);
    expect(JSON.stringify(brisbane)).not.toMatch(/August/);
  });

  it('does not advertise Brisbane as a bookable free seat on a date that has passed', () => {
    // The defect class, stated as a property: an event may be past, and it may be on
    // the free rail, but it must never be both — that combination is what hands out
    // free places to an event that has already happened or is being sold elsewhere.
    const now = new Date('2026-09-08T00:00:00+10:00');
    const bookableButFinished = ccwRoadshowEvents.filter(
      (event) => allowsFreeEntryRegistration(event) && new Date(event.endDateIso) < now,
    );
    expect(bookableButFinished.map((event) => event.slug)).not.toContain('brisbane');

    const brisbane = getCcwRoadshowEvent('brisbane') as CcwRoadshowEvent;
    expect(new Date(brisbane.endDateIso).getTime()).toBeGreaterThan(now.getTime());
  });
});

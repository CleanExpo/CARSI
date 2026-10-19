import { describe, expect, it } from 'vitest';

import {
  buildCcwRoadshowEventJsonLd,
  ccwRoadshowEvents,
  getCcwRoadshowEvent,
  type CcwRoadshowEvent,
} from './ccw-roadshow';

// CCW's own store addresses, read from https://ccwonline.com.au/pages/contact-us on 19/10/2026.
const CCW_STORES = {
  VIC: { streetAddress: 'Unit 1/5 Gatwick Road', suburb: 'Bayswater North', postcode: '3153' },
  NSW: { streetAddress: '2/8 Tollis Place', suburb: 'Seven Hills', postcode: '2147' },
  QLD: { streetAddress: 'D1-3/194 Zillmere Road', suburb: 'Boondall', postcode: '4034' },
} as const;

const url = 'https://carsi.com.au/ccw-melbourne';
const image = 'https://carsi.com.au/og-image.png';

function event(slug: string): CcwRoadshowEvent {
  const found = getCcwRoadshowEvent(slug);
  if (!found) throw new Error(`missing fixture event ${slug}`);
  return found;
}

/** A clock one day before the event starts, so the session is in the future. */
function dayBefore(e: CcwRoadshowEvent): Date {
  return new Date(Date.parse(e.startDateIso) - 24 * 60 * 60 * 1000);
}

describe('CCW roadshow venues are the real CCW stores', () => {
  it('holds Melbourne at the CCW VIC store, not Club Kilsyth', () => {
    expect(event('melbourne')).toMatchObject({
      venueName: 'Carpet Cleaners Warehouse Melbourne',
      streetAddress: 'Unit 1/5 Gatwick Road',
      suburb: 'Bayswater North',
      suburbStatePostcode: 'Bayswater North VIC 3153',
      state: 'VIC',
    });
    expect(JSON.stringify(ccwRoadshowEvents)).not.toMatch(/kilsyth|canterbury road/i);
  });

  it('places every session at its state CCW store with a consistent suburb/state/postcode line', () => {
    for (const e of ccwRoadshowEvents) {
      const store = CCW_STORES[e.state];
      expect(e.venueName.startsWith('Carpet Cleaners Warehouse')).toBe(true);
      expect(e.suburb).toBe(store.suburb);
      expect(e.suburbStatePostcode).toBe(`${store.suburb} ${e.state} ${store.postcode}`);
      expect(e.streetAddress).toBe(store.streetAddress);
    }
  });
});

describe('buildCcwRoadshowEventJsonLd', () => {
  it('emits no Event markup once a session has started or finished', () => {
    const melbourne = event('melbourne');
    expect(
      buildCcwRoadshowEventJsonLd(melbourne, { now: new Date('2026-10-19T00:00:00Z'), url, image })
    ).toBeNull();
    // The exact start instant counts as started.
    expect(
      buildCcwRoadshowEventJsonLd(melbourne, { now: new Date(melbourne.startDateIso), url, image })
    ).toBeNull();
  });

  it('emits no Event markup for any current session on 19/10/2026 (all are past)', () => {
    const now = new Date('2026-10-19T00:00:00Z');
    for (const e of ccwRoadshowEvents) {
      expect(buildCcwRoadshowEventJsonLd(e, { now, url, image })).toBeNull();
    }
  });

  it('describes a future session with CARSI and CCW as separate organisers and the CCW store as the Place', () => {
    const melbourne = event('melbourne');
    const schema = buildCcwRoadshowEventJsonLd(melbourne, {
      now: dayBefore(melbourne),
      url,
      image,
    });

    expect(schema).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: melbourne.title,
      startDate: melbourne.startDateIso,
      endDate: melbourne.endDateIso,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      url,
      image,
      organizer: [
        { '@type': 'Organization', name: 'CARSI', url: 'https://carsi.com.au' },
        {
          '@type': 'Organization',
          name: 'Carpet Cleaners Warehouse',
          url: 'https://ccwonline.com.au',
        },
      ],
      location: {
        '@type': 'Place',
        name: 'Carpet Cleaners Warehouse Melbourne',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Unit 1/5 Gatwick Road',
          addressLocality: 'Bayswater North',
          addressRegion: 'VIC',
          postalCode: '3153',
          addressCountry: 'AU',
        },
      },
    });
    // No merged "CARSI + CCW" organiser entity.
    const organisers = (schema?.organizer ?? []) as Array<{ name: string }>;
    expect(organisers.some((o) => /\band\b|\+|&/.test(o.name))).toBe(false);
  });

  it('omits offers when the repo holds no real price for the session', () => {
    for (const slug of ['melbourne', 'sydney', 'brisbane']) {
      const e = event(slug);
      expect(e.unitAmountCents).toBeUndefined();
      const schema = buildCcwRoadshowEventJsonLd(e, { now: dayBefore(e), url, image });
      expect(schema).not.toBeNull();
      expect(schema).not.toHaveProperty('offers');
    }
  });

  it('adds an AUD offer with the real price when one is recorded', () => {
    const october = event('brisbane-2026-10-09');
    const schema = buildCcwRoadshowEventJsonLd(october, { now: dayBefore(october), url, image });
    expect(schema?.offers).toEqual({
      '@type': 'Offer',
      url: 'https://ccwonline.com.au/collections/training-marketing',
      price: '495.00',
      priceCurrency: 'AUD',
    });
  });

  it('fails closed (no markup) when the address line has no postcode', () => {
    const broken = { ...event('melbourne'), suburbStatePostcode: 'Bayswater North VIC' };
    expect(buildCcwRoadshowEventJsonLd(broken, { now: dayBefore(broken), url, image })).toBeNull();
  });

  it('serialises to valid JSON that round-trips unchanged', () => {
    const melbourne = event('melbourne');
    const schema = buildCcwRoadshowEventJsonLd(melbourne, {
      now: dayBefore(melbourne),
      url,
      image,
    });
    expect(JSON.parse(JSON.stringify(schema))).toEqual(schema);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BrisbanePage, { generateMetadata as brisbaneMetadata } from '../../../app/(public)/ccw-brisbane/page';
import { generateMetadata as melbourneMetadata } from '../../../app/(public)/ccw-melbourne/page';
import { generateMetadata as sydneyMetadata } from '../../../app/(public)/ccw-sydney/page';
import RoadshowPage, { generateMetadata as hubMetadata } from '../../../app/(public)/events/ccw-roadshow/page';
import * as brisbaneModule from '../../../app/(public)/ccw-brisbane/page';
import * as melbourneModule from '../../../app/(public)/ccw-melbourne/page';
import * as sydneyModule from '../../../app/(public)/ccw-sydney/page';
import * as hubModule from '../../../app/(public)/events/ccw-roadshow/page';
import { metadata as successMetadata } from '../../../app/(public)/events/ccw-roadshow/success/page';

vi.mock('@/lib/api/stripe', () => ({ getCheckoutSession: vi.fn() }));
vi.mock('@/lib/server/ccw-roadshow-booking-email', () => ({ processCcwRoadshowBookingConfirmation: vi.fn() }));

it('uses neutral success metadata for paid bookings and when no free sitting is open', () => {
  expect(successMetadata.title).toBe('Roadshow Booking Status');
  expect(successMetadata.description).toBe('Booking status for CARSI x CCW Business Growth Days.');
  expect(JSON.stringify(successMetadata)).not.toMatch(/\bfree\b/i);
});

describe('CCW routes render per request', () => {
  // Explicit, not incidental: the hub is dynamic today only because it awaits searchParams.
  it.each([
    ['/ccw-melbourne', melbourneModule],
    ['/ccw-sydney', sydneyModule],
    ['/ccw-brisbane', brisbaneModule],
    ['/events/ccw-roadshow', hubModule],
  ])('%s is force-dynamic with no ISR window', (_route, mod) => {
    const config = mod as { dynamic?: string; revalidate?: number };
    expect(config.dynamic).toBe('force-dynamic');
    expect(config.revalidate).toBeUndefined();
  });
});

describe('Brisbane occurrence routing and metadata', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('focuses the stable Brisbane URL on October without reusing the September identity', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    const metadata = brisbaneMetadata();
    expect(BrisbanePage().props.focusSlug).toBe('brisbane-2026-10-09');
    expect(metadata.title).toContain('9-10 October 2026');
    expect(metadata.description).toContain('book through CCW');
    expect(metadata.alternates?.canonical).toBe('https://carsi.com.au/ccw-brisbane');
  });

  it('resolves the historical occurrence query on the server', async () => {
    const page = await RoadshowPage({ searchParams: Promise.resolve({ event: '  BRISBANE ' }) });
    expect(page.props.focusSlug).toBe('brisbane');
  });

  it('resolves the October occurrence query separately', async () => {
    const page = await RoadshowPage({ searchParams: Promise.resolve({ event: 'brisbane-2026-10-09' }) });
    expect(page.props.focusSlug).toBe('brisbane-2026-10-09');
  });

  it.each([{ event: 'unknown' }, { event: ['brisbane', 'sydney'] }, {}])(
    'does not focus an unknown, repeated or absent query: %j', async (query) => {
      const page = await RoadshowPage({ searchParams: Promise.resolve(query) });
      expect(page.props.focusSlug).toBeUndefined();
    },
  );
});

describe('city page metadata after a sitting ends', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ['Melbourne', melbourneMetadata, '22-23 July', 'Carpet Cleaners Warehouse Melbourne'],
    ['Sydney', sydneyMetadata, '6-7 October', 'Carpet Cleaners Warehouse Sydney'],
    ['Brisbane', brisbaneMetadata, '9-10 October', 'Carpet Cleaners Warehouse Boondall'],
  ])('%s announces next dates as to be announced at the home venue', (city, build, pastDates, venue) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T00:00:00Z'));
    const metadata = build();
    const text = JSON.stringify(metadata);
    expect(text).not.toContain(pastDates);
    expect(text).not.toContain('Claim your free entry token');
    expect(text).not.toContain('$495');
    expect(String(metadata.description)).toContain(`Next ${city} dates to be announced`);
    expect(String(metadata.description)).toContain(venue);
  });

  it('keeps the dated Melbourne copy while the July sitting is still ahead', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    expect(String(melbourneMetadata().title)).toContain('22-23 July 2026');
  });
});

describe('roadshow hub metadata follows the free-entry rule', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mentions free CCW-customer entry only while a free sitting is ahead', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    expect(String(hubMetadata().description)).toContain('free for past and current CCW customers');
  });

  it('says seats are booked through CCW when only paid sittings are ahead', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
    const text = JSON.stringify(hubMetadata());
    expect(text).toContain('booked through Carpet Cleaners Warehouse');
    expect(text).not.toMatch(/\bfree\b/i);
  });

  it('gives the neutral pricing line when nothing is ahead', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T00:00:00Z'));
    const text = JSON.stringify(hubMetadata());
    expect(text).toContain('Pricing is confirmed with each new date');
    expect(text).not.toMatch(/\bfree\b/i);
  });
});

describe('/ccw-melbourne description advertises free entry only for an open free sitting', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Behaviour alone cannot catch a regression here while the ended branch returns first, so pin
  // the call site to the shared rule (same approach as ccw-roadshow-mint-guard.test.ts).
  it('decides the free sentence with the shared isOpenFreeEntrySitting rule', () => {
    const source = readFileSync(join(__dirname, '../../../app/(public)/ccw-melbourne/page.tsx'), 'utf8');
    expect(source).toContain('isOpenFreeEntrySitting(melbourne, new Date())');
    expect(source).not.toMatch(/allowsFreeEntryRegistration|registration \?\? 'free-token'/);
  });

  it('carries the free offer while the free July sitting is ahead (1/07/2026)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    expect(String(melbourneMetadata().description)).toContain('Free for CCW past and current customers');
  });

  it.each(['2026-07-24T00:00:00Z', '2026-10-19T00:00:00Z'])('drops it once that sitting has ended (%s)', (at) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(at));
    const text = JSON.stringify(melbourneMetadata());
    expect(text).not.toMatch(/\bfree\b/i);
    expect(text).not.toContain('Claim your free entry');
  });
});

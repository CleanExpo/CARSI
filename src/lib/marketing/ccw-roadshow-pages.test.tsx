import { afterEach, describe, expect, it, vi } from 'vitest';
import BrisbanePage, { generateMetadata as brisbaneMetadata } from '../../../app/(public)/ccw-brisbane/page';
import { generateMetadata as melbourneMetadata } from '../../../app/(public)/ccw-melbourne/page';
import { generateMetadata as sydneyMetadata } from '../../../app/(public)/ccw-sydney/page';
import RoadshowPage from '../../../app/(public)/events/ccw-roadshow/page';
import * as brisbaneModule from '../../../app/(public)/ccw-brisbane/page';
import * as melbourneModule from '../../../app/(public)/ccw-melbourne/page';
import * as sydneyModule from '../../../app/(public)/ccw-sydney/page';

describe('CCW city pages render per request', () => {
  it.each([
    ['melbourne', melbourneModule],
    ['sydney', sydneyModule],
    ['brisbane', brisbaneModule],
  ])('/ccw-%s is force-dynamic with no ISR window', (_city, mod) => {
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

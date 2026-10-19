import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/landing/HomeFaqSection', () => ({ HomeFaqSection: () => null }));
vi.mock('@/components/landing/HomeFinalCtaSection', () => ({ HomeFinalCtaSection: () => null }));
vi.mock('@/components/landing/HomeTrustStrip', () => ({
  HomeTrustStrip: ({ stats }: { stats: { value: string; label: string }[] }) =>
    stats.map((stat) => `[stat ${stat.value} | ${stat.label}]`).join(''),
}));

import { CcwRoadshowContent } from './CcwRoadshowPage';

describe('October Brisbane public presentation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the paid October booking and correct day times without a free-token form', () => {
    // Before the sitting: this is the presentation while seats are on sale.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug="brisbane-2026-10-09" />);
    expect(markup).toContain('9-10 October 2026');
    expect(markup).toContain('$495');
    expect(markup).toContain('including GST');
    expect(markup).toContain('$200');
    expect(markup).toContain('gift card per registration');
    expect(markup).toContain('after the course');
    expect(markup).toContain('8.30am-3pm');
    expect(markup).toContain('D1-3/194 Zillmere Road');
    expect(markup).toContain('href="https://ccwonline.com.au/collections/training-marketing"');
    expect(markup).not.toContain('carsi-2-day-carpet-upholstery-training-course');
    expect(markup).not.toContain('srsltid=');
    expect(markup).not.toContain('Claim your free entry token');
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('/ccw-brisbane-2026-10-09');
    expect(markup).toContain('/events/ccw-roadshow?event=brisbane');
    expect(markup).toContain('href="/ccw-brisbane"');
  });

  it('retains the historical September focused view without importing October commercial terms', () => {
    const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug="brisbane" />);
    expect(markup).toContain('11-12 September 2026');
    expect(markup).toContain('D1-3/194 Zillmere Road');
    expect(markup).not.toContain('$200');
    expect(markup).not.toContain('Claim your free entry token');
  });
});

describe('Event structured data on the roadshow pages', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function eventBlocks(markup: string) {
    return [...markup.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]) as Record<string, unknown>)
      .filter((block) => block['@type'] === 'Event');
  }

  it('emits no Event JSON-LD on any CCW page once every session is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T00:00:00Z'));
    for (const focusSlug of [undefined, 'melbourne', 'sydney', 'brisbane', 'brisbane-2026-10-09']) {
      const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug={focusSlug} />);
      expect(eventBlocks(markup)).toHaveLength(0);
    }
  });

  it('marks up the upcoming July Melbourne sitting at its real venue with separate organisers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    const [block, ...rest] = eventBlocks(renderToStaticMarkup(<CcwRoadshowContent focusSlug="melbourne" />));
    expect(rest).toHaveLength(0);
    expect(block).toMatchObject({
      organizer: [{ name: 'CARSI' }, { name: 'Carpet Cleaners Warehouse' }],
      location: {
        name: 'Club Kilsyth',
        address: { streetAddress: '1-15 Canterbury Road', postalCode: '3153' },
      },
    });
    expect(String(block.url)).toMatch(/\/ccw-melbourne$/);
    expect(block).not.toHaveProperty('offers');
  });
});

describe('venue named for where training is held', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function faqAnswers(markup: string): string {
    return [...markup.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]) as { '@type'?: string; mainEntity?: { acceptedAnswer?: { text?: string } }[] })
      .filter((block) => block['@type'] === 'FAQPage')
      .flatMap((block) => block.mainEntity ?? [])
      .map((q) => q.acceptedAnswer?.text ?? '')
      .join('\n');
  }

  it.each([undefined, 'melbourne'])('names Club Kilsyth while the July sitting is ahead (%s)', (focusSlug) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    const answers = faqAnswers(renderToStaticMarkup(<CcwRoadshowContent focusSlug={focusSlug} />));
    expect(answers).toContain('Melbourne is held at Club Kilsyth, 1-15 Canterbury Road, Bayswater North VIC 3153.');
    expect(answers).not.toContain('Gatwick Road');
  });

  it.each([undefined, 'melbourne'])('names the CCW Melbourne store once nothing is ahead (%s)', (focusSlug) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T00:00:00Z'));
    const answers = faqAnswers(renderToStaticMarkup(<CcwRoadshowContent focusSlug={focusSlug} />));
    expect(answers).toContain(
      'Melbourne is held at Carpet Cleaners Warehouse Melbourne, Unit 1/5 Gatwick Road, Bayswater North VIC 3153.'
    );
    expect(answers).not.toContain('Kilsyth');
  });

  it('points an ended sitting at the same city next sitting instead of announcing TBA', () => {
    vi.useFakeTimers();
    // September Brisbane has ended; the October Brisbane sitting has not.
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug="brisbane" />);
    expect(markup).toContain('Next Brisbane dates: 9-10 October 2026');
    expect(markup).not.toContain('Next Brisbane dates: to be announced');
    expect(markup).toMatch(
      /Where we train: (<!-- -->)?Carpet Cleaners Warehouse Boondall, D1-3\/194 Zillmere Road, Boondall QLD 4034/
    );
    expect(markup).toContain('View the next Brisbane sitting');
    expect(markup).toContain('href="/ccw-brisbane"');
    expect(markup).toContain('[stat 9-10 October 2026 | Brisbane]');
    expect(markup).not.toContain('<input');
  });
});

describe('past sittings are not presented as upcoming', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const afterEverySitting = new Date('2026-10-19T00:00:00Z');
  const melbourneInterestHref =
    'href="/contact?source=ccw-roadshow&amp;city=melbourne&amp;topic=the%20next%20Melbourne%20CARSI%20x%20CCW%20training%20dates"';

  it('shows next Melbourne dates as to be announced at the CCW Melbourne store once July has ended', () => {
    vi.useFakeTimers();
    vi.setSystemTime(afterEverySitting);
    const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug="melbourne" />);
    expect(markup).toContain('Next Melbourne dates: to be announced');
    expect(markup).toContain('Register your interest');
    expect(markup).toContain(melbourneInterestHref);
    expect(markup).toContain('Carpet Cleaners Warehouse Melbourne, Unit 1/5 Gatwick Road, Bayswater North VIC 3153');
    expect(markup).not.toContain(' · 22-23 July 2026');
    expect(markup).not.toContain('Claim your free entry token');
    expect(markup).not.toContain('<input');
    // The July sitting stays in the itinerary as it happened, labelled as past.
    expect(markup).toContain('Club Kilsyth, 1-15 Canterbury Road, Bayswater North VIC 3153');
    expect(markup).toContain('Past session');
  });

  it('treats the focused sitting as past even while other cities still have sittings ahead', () => {
    vi.useFakeTimers();
    // Melbourne (July) has ended; Sydney and Brisbane (October) have not.
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug="melbourne" />);
    expect(markup).toContain('Next Melbourne dates: to be announced');
    expect(markup).toContain(melbourneInterestHref);
    expect(markup).not.toContain(' · 22-23 July 2026');
    expect(markup).not.toContain('Claim your free entry token');
  });

  it('shows TBA, not the past sitting times or room size, in the stats strip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(afterEverySitting);
    for (const [focusSlug, label] of [
      ['melbourne', 'Melbourne'],
      [undefined, 'National stops'],
    ] as const) {
      const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug={focusSlug} />);
      expect(markup).toContain(`[stat Dates TBA | ${label}]`);
      expect(markup).toContain('[stat TBA | Entry]');
      expect(markup).toContain('[stat TBA | Times]');
      expect(markup).toContain('[stat TBA | Room size]');
      expect(markup).not.toMatch(/\[stat \d+ \| Room size\]/);
      expect(markup).not.toMatch(/\[stat [^\]]*\| [^\]]*(am|pm)[^\]]*\]/);
    }
  });

  it('keeps the real times and room size in the stats strip before the sitting ends', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug="melbourne" />);
    expect(markup).toContain('[stat 2 days | 8.30am-4.30pm both days]');
    expect(markup).toContain('[stat 20 | Room size]');
  });

  it('still shows the July dates and the free-entry form before the sitting ends', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug="melbourne" />);
    expect(markup).toContain(' · 22-23 July 2026');
    expect(markup).toContain('<input');
    expect(markup).not.toContain('to be announced');
  });

  it.each([
    [undefined, 'Next roadshow dates: to be announced'],
    ['melbourne', 'Next Melbourne dates: to be announced'],
    ['sydney', 'Next Sydney dates: to be announced'],
    ['brisbane', 'Next Brisbane dates: to be announced'],
    ['brisbane-2026-10-09', 'Next Brisbane dates: to be announced'],
  ])('offers no booking for an ended sitting on %s', (focusSlug, announcement) => {
    vi.useFakeTimers();
    vi.setSystemTime(afterEverySitting);
    const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug={focusSlug} />);
    expect(markup).toContain(announcement);
    expect(markup).toContain('Register your interest');
    expect(markup).not.toContain('Claim your free entry token');
    expect(markup).not.toContain('<input');
    expect(markup).not.toContain('href="https://ccwonline.com.au/collections/training-marketing"');
    expect(markup).not.toContain('Free CCW entry');
    expect(markup).not.toContain('Booked through CCW');
  });
});

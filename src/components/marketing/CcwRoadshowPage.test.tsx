import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/landing/HomeFaqSection', () => ({ HomeFaqSection: () => null }));
vi.mock('@/components/landing/HomeFinalCtaSection', () => ({ HomeFinalCtaSection: () => null }));
vi.mock('@/components/landing/HomeTrustStrip', () => ({
  HomeTrustStrip: ({ stats }: { stats: { value: string; label: string }[] }) =>
    stats.map((stat) => `[stat ${stat.value} | ${stat.label}]`).join(''),
}));

import { CcwRoadshowContent } from './CcwRoadshowPage';
import { CcwRoadshowBooking } from './CcwRoadshowBooking';
import { ccwRoadshowEvents, getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';

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

describe('CCW free-entry offer only while a free sitting is ahead', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function costAnswer(markup: string): string {
    const faq = [...markup.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]) as { '@type'?: string; mainEntity?: { name?: string; acceptedAnswer?: { text?: string } }[] })
      .find((block) => block['@type'] === 'FAQPage');
    return faq?.mainEntity?.find((q) => q.name === 'How much does it cost?')?.acceptedAnswer?.text ?? '';
  }

  const freeCopy = [
    'free for past and current CCW customers',
    'Free CCW customer entry',
    'Free CCW entry',
    'Claim your free entry token',
    'at no cost',
  ];

  it.each(['sydney', 'brisbane', 'brisbane-2026-10-09'])(
    'allows the %s paid comparison while a free sitting is open elsewhere', (focusSlug) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
      const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug={focusSlug} />);
      const event = getCcwRoadshowEvent(focusSlug)!;
      expect(markup).toContain(`${event.city} is not part of the free CCW entry offer.`);
      expect(markup).toContain(`Contact Carpet Cleaners Warehouse to book a place for ${event.dates}.`);
    },
  );

  it.each(['sydney', 'brisbane', 'brisbane-2026-10-09'])(
    'uses neutral paid copy for %s after the last free sitting ends', (focusSlug) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
      const markup = renderToStaticMarkup(<CcwRoadshowContent focusSlug={focusSlug} />);
      const event = getCcwRoadshowEvent(focusSlug)!;
      expect(markup).toContain(`Contact Carpet Cleaners Warehouse to book a place for ${event.dates}.`);
      expect(markup).not.toMatch(/\bfree\b/i);
    },
  );

  it.each([
    ['2026-07-23T06:29:59.999Z', true],
    ['2026-07-23T06:30:00.000Z', false],
    ['2026-09-01T00:00:00Z', false],
  ] as const)('guards the booking comparison at %s (free open: %s)', (clock, freeOpen) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(clock));
    const markup = renderToStaticMarkup(<CcwRoadshowBooking events={ccwRoadshowEvents} initialSlug="sydney" />);
    expect(markup).toContain('Book directly with Carpet Cleaners Warehouse.');
    expect(/\bfree\b/i.test(markup)).toBe(freeOpen);
    const page = renderToStaticMarkup(<CcwRoadshowContent focusSlug="sydney" />);
    expect(page.includes('Sydney is not part of the free CCW entry offer.')).toBe(freeOpen);
  });

  it('does not show an ended free sitting as bookable even when passed directly to the booking component', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T00:00:00Z'));
    const markup = renderToStaticMarkup(<CcwRoadshowBooking events={ccwRoadshowEvents} initialSlug="melbourne" />);
    expect(markup).not.toMatch(/\bfree\b/i);
    expect(markup).not.toContain('<form');
    expect(markup).toContain('Register your interest');
    expect(markup).toContain('/contact?source=ccw-roadshow&amp;city=melbourne');
  });

  it('shows the free offer on the hub while the free Melbourne sitting is ahead (1/07/2026)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    const markup = renderToStaticMarkup(<CcwRoadshowContent />);
    expect(costAnswer(markup)).toContain('free for past and current CCW customers');
    expect(costAnswer(markup)).toContain('Melbourne');
    expect(markup).toContain('Free CCW customer entry');
    expect(markup).toContain('Free CCW entry');
  });

  it('drops the free offer when only paid sittings are ahead (1/09/2026)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
    const markup = renderToStaticMarkup(<CcwRoadshowContent />);
    expect(costAnswer(markup)).toBe(
      'Seats for the upcoming sittings are booked through Carpet Cleaners Warehouse, not on this page.'
    );
    for (const copy of freeCopy) expect(markup).not.toContain(copy);
    expect(markup).toContain('Booked through CCW');
  });

  it('gives the neutral pricing answer when nothing is ahead (19/10/2026)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T00:00:00Z'));
    const markup = renderToStaticMarkup(<CcwRoadshowContent />);
    expect(costAnswer(markup)).toBe(
      "Pricing is confirmed with each new date. Register your interest and we'll send it with the dates."
    );
    for (const copy of freeCopy) expect(markup).not.toContain(copy);
  });
});

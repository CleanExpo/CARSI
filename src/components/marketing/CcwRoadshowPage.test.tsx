import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/landing/HomeFaqSection', () => ({ HomeFaqSection: () => null }));
vi.mock('@/components/landing/HomeFinalCtaSection', () => ({ HomeFinalCtaSection: () => null }));
vi.mock('@/components/landing/HomeTrustStrip', () => ({ HomeTrustStrip: () => null }));

import { CcwRoadshowContent } from './CcwRoadshowPage';

describe('October Brisbane public presentation', () => {
  it('shows the paid October booking and correct day times without a free-token form', () => {
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

  it('marks up an upcoming Melbourne session at the CCW store with separate organisers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    const [block, ...rest] = eventBlocks(renderToStaticMarkup(<CcwRoadshowContent focusSlug="melbourne" />));
    expect(rest).toHaveLength(0);
    expect(block).toMatchObject({
      organizer: [{ name: 'CARSI' }, { name: 'Carpet Cleaners Warehouse' }],
      location: { address: { streetAddress: 'Unit 1/5 Gatwick Road', postalCode: '3153' } },
    });
    expect(String(block.url)).toMatch(/\/ccw-melbourne$/);
    expect(block).not.toHaveProperty('offers');
  });
});

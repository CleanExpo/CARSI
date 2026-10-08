import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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
    expect(markup).toContain('194D Zillmere Road');
    expect(markup).toContain('https://ccwonline.com.au/collections/new-collection/products/carsi-2-day-carpet-upholstery-training-course');
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

import { describe, expect, it } from 'vitest';
import BrisbanePage, { metadata } from '../../../app/(public)/ccw-brisbane/page';
import RoadshowPage from '../../../app/(public)/events/ccw-roadshow/page';

describe('Brisbane occurrence routing and metadata', () => {
  it('focuses the stable Brisbane URL on October without reusing the September identity', () => {
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

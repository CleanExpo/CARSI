import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ResearchPage, { metadata } from '../../../app/(public)/research/page';

/** Claims the page cannot back when the article API returns nothing. */
const UNBACKED = /sourced|practitioner voice|NRPG|expert|deep research|analysis/i;

async function renderWith(fetchImpl: () => Promise<Response>): Promise<string> {
  vi.stubGlobal('fetch', vi.fn(fetchImpl));
  const page = await ResearchPage({ searchParams: Promise.resolve({}) });
  return renderToStaticMarkup(page);
}

afterEach(() => vi.unstubAllGlobals());

describe('research page claims', () => {
  it.each([
    ['a non-200 response', () => Promise.resolve(new Response('down', { status: 503 }))],
    ['a timeout or network error', () => Promise.reject(new Error('aborted'))],
  ])('makes no sourced or practitioner-voice claim after %s', async (_case, fetchImpl) => {
    const html = await renderWith(fetchImpl);
    expect(html).toContain('Research Articles');
    expect(html).toMatch(/on their way/i);
    expect(html).not.toMatch(UNBACKED);
  });

  it('lists fetched articles when the API returns them (positive control)', async () => {
    const article = {
      id: 'a1',
      slug: 'drying-records',
      title: 'Keeping drying records on residential jobs',
      excerpt: null,
      category: 'Water Damage',
      tags: [],
      author_name: null,
      status: 'published',
      published_at: null,
      view_count: 0,
      created_at: '2026-10-01T00:00:00Z',
    };
    const body = JSON.stringify({ data: [article], total: 1, limit: 20, offset: 0 });
    const html = await renderWith(() => Promise.resolve(new Response(body, { status: 200 })));
    expect(html).toContain('Keeping drying records on residential jobs');
    expect(html).not.toMatch(/on their way/i);
  });

  it('keeps the static metadata free of claims the empty state cannot back', () => {
    const text = JSON.stringify([
      metadata.description,
      metadata.openGraph?.description,
      metadata.keywords,
    ]);
    expect(text).not.toMatch(UNBACKED);
  });
});

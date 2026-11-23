import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import FreeResourcesPage from '../../../app/(public)/resources/page';
import { FREE_RESOURCES } from './free-resources';

/**
 * The /resources page renders each card's link and lists the same link in its ItemList JSON-LD.
 * Both must reach the document the card names (GP-652), never its licence notice page.
 */
const html = renderToStaticMarkup(createElement(FreeResourcesPage));

function itemListUrls(): string[] {
  const scripts = [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ];
  for (const [, body] of scripts) {
    const data = JSON.parse(body) as {
      '@type'?: string;
      itemListElement?: { url?: string; item?: { url?: string } }[];
    };
    if (data['@type'] === 'ItemList') {
      return (data.itemListElement ?? []).map((e) => e.url ?? e.item?.url ?? '');
    }
  }
  throw new Error('no ItemList JSON-LD on the resources page');
}

function hrefs(): string[] {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
}

describe('/resources page links', () => {
  const ncc = [
    'https://ncc.abcb.gov.au/editions/ncc-2025/adopted/housing-provisions',
    'https://ncc.abcb.gov.au/editions/ncc-2025/adopted/volume-two',
  ];

  it('renders the NCC 2025 cards linked to their edition landing pages', () => {
    const links = hrefs();
    for (const url of ncc) expect(links, url).toContain(url);
    expect(links.filter((h) => /\/front-matter\//.test(h))).toEqual([]);
  });

  it('lists every card url, and only card urls, in the ItemList JSON-LD', () => {
    const urls = itemListUrls();
    expect(urls).toEqual(FREE_RESOURCES.map((r) => r.url));
    for (const url of ncc) expect(urls, url).toContain(url);
    expect(urls.filter((u) => /copyright|front-matter/i.test(new URL(u).pathname))).toEqual([]);
  });
});

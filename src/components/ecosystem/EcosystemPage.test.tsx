import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import EcosystemPage, { metadata } from '../../../app/(public)/ecosystem/page';
import { findCopyViolations } from '@/lib/ecosystem/copy-guard';
import {
  ECOSYSTEM_PAGE_COPY,
  ECOSYSTEM_PRODUCTS,
  ecosystemHref,
  type EcosystemProduct,
} from '@/lib/ecosystem/products';

import { EcosystemCard } from './EcosystemCard';

/**
 * What a visitor actually receives from /ecosystem: assertions run over the rendered markup,
 * not over the data file, so a link, label or sentence added in JSX is checked too.
 */
const html = renderToStaticMarkup(<EcosystemPage />);

function anchors(markup: string): string[] {
  return markup.match(/<a\b[^>]*>/g) ?? [];
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

function visibleText(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('/ecosystem page markup', () => {
  it('renders the five product cards in order', () => {
    const cards = html.match(/data-testid="ecosystem-card"/g) ?? [];
    expect(cards.length).toBe(5);
    const titles = [...html.matchAll(/<h2[^>]*id="ecosystem-[a-z0-9-]+-title"[^>]*>([^<]+)</g)].map(
      (m) => m[1]
    );
    expect(titles).toEqual(ECOSYSTEM_PRODUCTS.map((p) => p.name));
  });

  it('shows each card’s "How CARSI connects" line', () => {
    const text = visibleText(html);
    for (const p of ECOSYSTEM_PRODUCTS) expect(text).toContain(p.connection);
    expect(text.split(ECOSYSTEM_PAGE_COPY.connectionLabel).length - 1).toBe(5);
  });

  it('tags every outbound link so the browser sends the UTM, and opens it safely', () => {
    const external = anchors(html).filter((a) => /href="https?:/.test(a));
    const expectedHrefs = ECOSYSTEM_PRODUCTS.flatMap((p) => p.links.map((l) => ecosystemHref(l.url)));
    expect(external.length).toBe(expectedHrefs.length);
    for (const a of external) {
      const href = attr(a, 'href')!;
      expect(expectedHrefs).toContain(href);
      const url = new URL(href);
      expect(url.protocol).toBe('https:');
      expect(url.searchParams.getAll('utm_source')).toEqual(['carsi']);
      expect(url.searchParams.get('utm_medium')).toBe('ecosystem');
      expect(attr(a, 'target')).toBe('_blank');
      expect(new Set((attr(a, 'rel') ?? '').split(/\s+/))).toEqual(new Set(['noopener', 'noreferrer']));
    }
  });

  it('keeps each data URL’s path, query and fragment in the rendered href', () => {
    for (const p of ECOSYSTEM_PRODUCTS) {
      for (const l of p.links) {
        const source = new URL(l.url);
        const rendered = new URL(ecosystemHref(l.url));
        expect(rendered.origin + rendered.pathname).toBe(source.origin + source.pathname);
        expect(rendered.hash).toBe(source.hash);
        for (const [k, v] of source.searchParams) {
          if (!k.startsWith('utm_')) expect(rendered.searchParams.get(k)).toBe(v);
        }
      }
    }
  });

  it('links internally to the contact page without a new tab', () => {
    const contact = anchors(html).filter((a) => attr(a, 'href') === ECOSYSTEM_PAGE_COPY.ctaHref);
    expect(ECOSYSTEM_PAGE_COPY.ctaHref).toBe('/contact');
    expect(contact.length).toBe(1);
    expect(attr(contact[0], 'target')).toBeNull();
  });

  it('declares every real image at its intrinsic size and hides placeholders from screen readers', () => {
    const imgs = html.match(/<img\b[^>]*>/g) ?? [];
    const real = ECOSYSTEM_PRODUCTS.filter((p) => p.image);
    expect(imgs.length).toBe(real.length);
    for (const p of real) {
      const tag = imgs.find((t) => (attr(t, 'src') ?? '').includes(p.image!.src));
      expect(tag, p.name).toBeDefined();
      expect(attr(tag!, 'width')).toBe(String(p.image!.width));
      expect(attr(tag!, 'height')).toBe(String(p.image!.height));
    }
    const placeholders = html.match(/<div\b[^>]*data-testid="ecosystem-placeholder"[^>]*>/g) ?? [];
    expect(placeholders.length).toBe(ECOSYSTEM_PRODUCTS.length - real.length);
    for (const tag of placeholders) expect(attr(tag, 'aria-hidden')).toBe('true');
  });

  it('renders no <main> of its own (the public layout supplies it)', () => {
    expect(html).not.toMatch(/<main\b/);
  });

  it('contains no banned claim or US spelling anywhere a visitor or search engine reads', () => {
    expect(findCopyViolations(visibleText(html))).toEqual([]);
    expect(findCopyViolations(String(metadata.title ?? ''))).toEqual([]);
    expect(findCopyViolations(String(metadata.description ?? ''))).toEqual([]);
  });

  it('sets its own canonical and Open Graph URL instead of inheriting the homepage’s', () => {
    expect(metadata.alternates?.canonical).toBe('/ecosystem');
    const og = metadata.openGraph as { url?: string; images?: unknown[] } | undefined;
    expect(og?.url).toBe('/ecosystem');
    expect(og?.images?.length ?? 0).toBeGreaterThan(0);
    expect(metadata.title).toBe(ECOSYSTEM_PAGE_COPY.metaTitle);
    expect(metadata.description).toBe(ECOSYSTEM_PAGE_COPY.metaDescription);
  });
});

describe('EcosystemCard — a product with no public site', () => {
  const fixture: EcosystemProduct = {
    slug: 'fixture',
    name: 'Fixture',
    status: 'in-development',
    summary: 'A fixture summary.',
    connection: 'A fixture connection to CARSI.',
    links: [],
    image: null,
    imageSource: 'Placeholder: fixture only.',
    lastVerified: '2026-10-19',
    evidence: ['https://example.com'],
  };

  it('renders no link at all and says so in words', () => {
    const markup = renderToStaticMarkup(<EcosystemCard product={fixture} />);
    expect(markup).not.toMatch(/<a\b/);
    expect(visibleText(markup)).toContain(ECOSYSTEM_PAGE_COPY.noPublicSite);
    expect(ECOSYSTEM_PAGE_COPY.noPublicSite.length).toBeGreaterThan(0);
  });

  it('labels the status in text, not colour alone', () => {
    const markup = renderToStaticMarkup(<EcosystemCard product={fixture} />);
    expect(visibleText(markup)).toContain('In development');
  });
});

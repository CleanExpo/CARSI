import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { readImageSize } from './image-size';
import {
  ECOSYSTEM_PAGE_COPY,
  ECOSYSTEM_PRODUCTS,
  MAX_VERIFIED_AGE_DAYS,
  ecosystemCopyText,
  ecosystemHref,
  isFutureDated,
  isStale,
  validateEcosystemProducts,
  type EcosystemProduct,
} from './products';

const PUBLIC_DIR = join(process.cwd(), 'public');
const MAX_IMAGE_SIDE = 480;
const MAX_IMAGE_BYTES = 80 * 1024;

describe('ECOSYSTEM_PRODUCTS — the five products, as each brand spells itself', () => {
  it('lists exactly the five products in the founder’s order', () => {
    expect(ECOSYSTEM_PRODUCTS.map((p) => p.name)).toEqual([
      'RestoreAssist',
      'NRPG',
      'Disaster Recovery',
      'Restoration World',
      'CleanExpo247',
    ]);
  });

  it('gives every product a unique, URL-safe slug', () => {
    const slugs = ECOSYSTEM_PRODUCTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('records where every image came from, or why it is a placeholder', () => {
    for (const p of ECOSYSTEM_PRODUCTS) {
      expect(p.imageSource.trim().length, p.name).toBeGreaterThan(20);
      if (p.image === null) expect(p.imageSource, p.name).toMatch(/^Placeholder/);
    }
  });

  it('declares each real image at its true pixel size, within the size and byte budget', () => {
    const withImages = ECOSYSTEM_PRODUCTS.filter((p) => p.image !== null);
    expect(withImages.length).toBeGreaterThan(0);
    for (const p of withImages) {
      const image = p.image!;
      expect(image.src, p.name).toMatch(/^\/images\/ecosystem\/[a-z0-9-]+\.(webp|png)$/);
      const file = join(PUBLIC_DIR, image.src);
      const size = readImageSize(new Uint8Array(readFileSync(file)));
      expect({ width: image.width, height: image.height }, p.name).toEqual({
        width: size.width,
        height: size.height,
      });
      expect(Math.max(size.width, size.height), p.name).toBeLessThanOrEqual(MAX_IMAGE_SIDE);
      expect(statSync(file).size, p.name).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
    }
  });

  it('says how CARSI connects to every product', () => {
    for (const p of ECOSYSTEM_PRODUCTS) {
      expect(p.connection.trim().length, p.name).toBeGreaterThan(30);
      expect(p.connection, p.name).toMatch(/CARSI/);
    }
  });

  it('passes its own status-truth validator', () => {
    expect(() => validateEcosystemProducts(ECOSYSTEM_PRODUCTS)).not.toThrow();
  });
});

describe('validateEcosystemProducts — a status must match what a visitor can actually reach', () => {
  const base: EcosystemProduct = {
    slug: 'fixture',
    name: 'Fixture',
    status: 'live',
    summary: 'A fixture.',
    connection: 'A fixture connection.',
    links: [{ label: 'Visit', url: 'https://example.com' }],
    image: null,
    imageSource: 'Placeholder: fixture only, never rendered.',
    lastVerified: '2026-10-19',
    evidence: ['https://example.com'],
  };

  it.each<[string, Partial<EcosystemProduct>]>([
    ['live with no link', { status: 'live', links: [] }],
    ['in development with a link', { status: 'in-development' }],
    ['an http: link', { links: [{ label: 'Visit', url: 'http://example.com' }] }],
    ['an unparseable link', { links: [{ label: 'Visit', url: 'not a url' }] }],
    ['a malformed date', { lastVerified: '19/10/2026' }],
    ['no evidence', { evidence: [] }],
    ['no connection line', { connection: ' ' }],
  ])('rejects %s', (_label, patch) => {
    expect(() => validateEcosystemProducts([{ ...base, ...patch }])).toThrow();
  });

  it('rejects a duplicate slug', () => {
    expect(() => validateEcosystemProducts([base, { ...base, name: 'Other' }])).toThrow();
  });

  it('accepts a preview with or without a link', () => {
    expect(() => validateEcosystemProducts([{ ...base, status: 'preview', links: [] }])).not.toThrow();
    expect(() => validateEcosystemProducts([{ ...base, status: 'preview' }])).not.toThrow();
  });
});

describe('staleness — a status must never outlive its evidence', () => {
  it('treats day 90 as fresh and day 91 as stale, in UTC', () => {
    expect(MAX_VERIFIED_AGE_DAYS).toBe(90);
    expect(isStale('2026-07-01', new Date('2026-09-29T23:59:00Z'))).toBe(false); // day 90
    expect(isStale('2026-07-01', new Date('2026-09-30T00:00:00Z'))).toBe(true); // day 91
  });

  it('does not let an Australian late-evening clock tip a fresh date into stale', () => {
    // 23:30 AEST on 29 Sep = 13:30 UTC on 29 Sep: still day 90.
    expect(isStale('2026-07-01', new Date('2026-09-29T23:30:00+10:00'))).toBe(false);
  });

  it('flags a lastVerified date more than a day in the future (a typo that would never go stale)', () => {
    const now = new Date('2026-10-19T00:00:00Z');
    expect(isFutureDated('2026-10-20', now)).toBe(false);
    expect(isFutureDated('2026-10-21', now)).toBe(true);
    expect(isFutureDated('2027-10-19', now)).toBe(true);
  });

  it('every product was re-verified within 90 days of today (real clock)', () => {
    expect(vi.isFakeTimers()).toBe(false);
    const now = new Date();
    for (const p of ECOSYSTEM_PRODUCTS) {
      const how =
        `${p.name}: lastVerified ${p.lastVerified} is older than ${MAX_VERIFIED_AGE_DAYS} days. ` +
        'Re-check the status and facts against the evidence URLs in src/lib/ecosystem/products.ts, ' +
        'run `npx tsx scripts/check-ecosystem-links.ts`, then update lastVerified. Do not bump the date without re-checking.';
      expect(isStale(p.lastVerified, now), how).toBe(false);
      expect(isFutureDated(p.lastVerified, now), `${p.name}: lastVerified is in the future`).toBe(false);
    }
  });
});

describe('ecosystemHref — UTM tags that a browser actually sends', () => {
  it('tags a bare home URL', () => {
    const url = new URL(ecosystemHref('https://restoreassist.app'));
    expect(url.searchParams.getAll('utm_source')).toEqual(['carsi']);
    expect(url.searchParams.get('utm_medium')).toBe('ecosystem');
    expect(url.origin).toBe('https://restoreassist.app');
  });

  it('keeps the path, existing query and fragment, with the tags before the fragment', () => {
    const out = ecosystemHref('https://example.com/a/b?x=1#section');
    const url = new URL(out);
    expect(url.pathname).toBe('/a/b');
    expect(url.searchParams.get('x')).toBe('1');
    expect(url.hash).toBe('#section');
    expect(url.searchParams.getAll('utm_source')).toEqual(['carsi']);
    expect(out.indexOf('utm_source')).toBeLessThan(out.indexOf('#'));
  });

  it('is idempotent and overrides a different source rather than stacking one', () => {
    const once = ecosystemHref('https://example.com/?utm_source=other');
    expect(ecosystemHref(once)).toBe(once);
    expect(new URL(once).searchParams.getAll('utm_source')).toEqual(['carsi']);
  });
});

describe('ecosystemCopyText — the one string every copy gate reads', () => {
  it('contains every public string the page renders', () => {
    const text = ecosystemCopyText();
    const c = ECOSYSTEM_PAGE_COPY;
    const expected = [
      c.metaTitle,
      c.metaDescription,
      c.eyebrow,
      c.heading,
      c.lead,
      c.noPublicSite,
      c.connectionLabel,
      c.visionHeading,
      ...c.visionParagraphs,
      c.ctaLabel,
      c.footerLinkLabel,
      ...ECOSYSTEM_PRODUCTS.flatMap((p) => [
        p.name,
        p.summary,
        p.connection,
        ...p.links.map((l) => l.label),
      ]),
    ];
    for (const s of expected) {
      expect(s.trim().length).toBeGreaterThan(0);
      expect(text).toContain(s);
    }
  });
});

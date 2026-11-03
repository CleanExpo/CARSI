import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { findComplianceIssues } from './compliance';
import { isGoogleBusinessLink, reviewWebsite } from './site-review';

const fixture = (name: string) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

const voice = {
  businessName: 'Downs Carpet Care',
  trade: 'Carpet & upholstery',
  town: 'Toowoomba',
  services: 'Carpet cleaning, rug cleaning, upholstery',
};

describe('reviewWebsite', () => {
  it('ranks fixes for a weak fixture site, highest impact and lowest effort first', () => {
    const review = reviewWebsite({
      websiteUrl: 'http://example-carpets.test/',
      fetch: { ok: true, status: 200, html: fixture('weak-trade-site.html') },
      googleBusinessUrl: null,
      voice,
    });

    const ids = review.fixes.map((f) => f.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'title-generic',
        'meta-description-missing',
        'h1-missing',
        'town-not-mentioned',
        'local-business-schema-missing',
        'phone-not-clickable',
        'viewport-missing',
        'https-missing',
        'images-missing-alt',
        'gbp-missing',
      ])
    );

    // Ranked: rank is 1..n with no gaps and score never increases down the list.
    review.fixes.forEach((fix, i) => expect(fix.rank).toBe(i + 1));
    for (let i = 1; i < review.fixes.length; i += 1) {
      expect(review.fixes[i].score).toBeLessThanOrEqual(review.fixes[i - 1].score);
    }
    // A missing Google Business Profile is the top local-search fix for a trade business.
    expect(review.fixes[0].id).toBe('gbp-missing');

    // Every fix is plain English with a why and a how.
    for (const fix of review.fixes) {
      expect(fix.title.length).toBeGreaterThan(5);
      expect(fix.why.length).toBeGreaterThan(20);
      expect(fix.how.length).toBeGreaterThan(20);
      expect(findComplianceIssues(`${fix.title} ${fix.why} ${fix.how}`)).toEqual([]);
    }
    expect(review.summary).toMatch(/Toowoomba/);
  });

  it('finds no on-page fixes for a strong fixture site', () => {
    const review = reviewWebsite({
      websiteUrl: 'https://downscarpetcare.test/',
      fetch: { ok: true, status: 200, html: fixture('strong-trade-site.html') },
      googleBusinessUrl: 'https://g.page/r/downs-carpet-care',
      voice,
    });
    expect(review.fixes.map((f) => f.id)).toEqual([]);
    expect(review.checks.find((c) => c.id === 'local-business-schema')?.passed).toBe(true);
  });

  it('reports an unreadable site honestly instead of inventing page findings', () => {
    const review = reviewWebsite({
      websiteUrl: 'https://down.test/',
      fetch: { ok: false, status: 503, html: null, error: 'HTTP 503' },
      googleBusinessUrl: null,
      voice,
    });
    expect(review.siteReadable).toBe(false);
    expect(review.fixes.map((f) => f.id)).toEqual(['gbp-missing', 'site-unreachable']);
    expect(review.summary).toMatch(/could not read/i);
  });

  it('asks for a website when the member has none', () => {
    const review = reviewWebsite({
      websiteUrl: null,
      fetch: null,
      googleBusinessUrl: 'https://maps.app.goo.gl/abc',
      voice,
    });
    expect(review.fixes.map((f) => f.id)).toEqual(['website-missing']);
  });

  it('flags a Google Business Profile link that is not a Google link', () => {
    const review = reviewWebsite({
      websiteUrl: null,
      fetch: null,
      googleBusinessUrl: 'https://facebook.com/downs',
      voice,
    });
    expect(review.fixes.map((f) => f.id)).toContain('gbp-link-invalid');
  });
});

describe('isGoogleBusinessLink (Codex P1, head bc601506)', () => {
  it.each([
    'https://google.com.evil.example/maps',
    'https://www.google.co.evil.example/maps/place/x',
    'https://maps.google.attacker.test/',
    'https://evilgoogle.com/maps',
    'https://google.com@evil.example/maps',
    'https://notg.page/r/x',
    'https://business.site.evil.example/',
    'https://www.google.com/',
  ])('rejects %s', (url) => {
    expect(isGoogleBusinessLink(url)).toBe(false);
  });

  it.each([
    'https://g.page/r/downs-carpet-care',
    'https://maps.app.goo.gl/abc',
    'https://goo.gl/maps/abc',
    'https://www.google.com/maps/place/Downs+Carpet+Care',
    'https://www.google.com.au/maps/place/Downs+Carpet+Care',
    'https://maps.google.com.au/?cid=123',
    'https://www.google.co.nz/search?q=downs&ludocid=123',
    'https://business.google.com/dashboard/l/123',
    'https://downs-carpet-care.business.site/',
  ])('accepts %s', (url) => {
    expect(isGoogleBusinessLink(url)).toBe(true);
  });

  it('a spoofed host gets the invalid-link fix in the review', () => {
    const review = reviewWebsite({
      websiteUrl: null,
      fetch: null,
      googleBusinessUrl: 'https://google.com.evil.example/maps',
      voice,
    });
    expect(review.fixes.map((f) => f.id)).toContain('gbp-link-invalid');
  });
});

describe('page title check (Codex P1, head 0b717beb)', () => {
  const page = (title: string) => ({
    ok: true,
    status: 200,
    html: `<html><head><title>${title}</title></head><body><h1>Hi</h1></body></html>`,
    finalUrl: 'https://mackay-plumbing.test/',
  });
  const plumber = { businessName: 'Acme', trade: 'Plumbing', town: 'Mackay QLD', services: '' };
  const titleCheck = (title: string) =>
    reviewWebsite({
      websiteUrl: 'https://mackay-plumbing.test/',
      fetch: page(title),
      googleBusinessUrl: null,
      voice: plumber,
    });

  it('fails a non-generic title that names neither the trade nor the town', () => {
    const review = titleCheck('Contact us for more details');
    expect(review.checks.find((c) => c.id === 'title')?.passed).toBe(false);
    expect(review.fixes.map((f) => f.id)).toContain('title-generic');
  });

  it('fails a title that names the trade but not the town', () => {
    expect(
      titleCheck('Plumbing services you can book').checks.find((c) => c.id === 'title')?.passed
    ).toBe(false);
  });

  it('passes a title that names both the trade and the town', () => {
    const review = titleCheck('Plumber Mackay | Acme Plumbing');
    expect(review.checks.find((c) => c.id === 'title')?.passed).toBe(true);
    expect(review.fixes.map((f) => f.id)).not.toContain('title-generic');
  });
});

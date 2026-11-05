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
    expect(review.summary).toMatch(/Toowoomba|your area/);
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
    // Generic roots, dashboards and searches name no listing (Codex P1, head 4119a2a2).
    'https://g.page/',
    'https://maps.app.goo.gl/',
    'https://goo.gl/maps/',
    'https://business.google.com/',
    'https://business.google.com/dashboard',
    'https://maps.google.com/',
    'https://www.google.com/maps',
    'https://www.google.com/search?q=carpet+cleaner',
    'https://business.site/',
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

describe('generic Google pages are not a linked Business Profile (Codex P1, head 4119a2a2)', () => {
  it.each(['https://g.page/', 'https://maps.app.goo.gl/', 'https://business.google.com/'])(
    '%s gets the invalid-link fix and does not pass the GBP check',
    (url) => {
      const review = reviewWebsite({
        websiteUrl: null,
        fetch: null,
        googleBusinessUrl: url,
        voice,
      });
      expect(review.fixes.map((f) => f.id)).toContain('gbp-link-invalid');
    }
  );
});

describe('isGoogleBusinessLink short-link shapes (Codex P1, head 6735fbf0)', () => {
  it.each([
    'https://g.page/r/',
    'https://g.page/r',
    'ftp://g.page/r/listing',
    'ftp://maps.app.goo.gl/abc',
    'javascript://g.page/listing',
    'https://maps.app.goo.gl/abc/extra',
    'https://goo.gl/maps/',
    'https://.business.site/',
    'https://a.b.business.site/',
  ])('rejects %s', (url) => {
    expect(isGoogleBusinessLink(url)).toBe(false);
  });

  it.each([
    'https://g.page/r/CabcDEF123',
    'https://g.page/downs-carpet-care',
    'http://maps.app.goo.gl/abc123',
    'https://goo.gl/maps/xyz789',
    'https://downs.business.site/',
  ])('accepts %s', (url) => {
    expect(isGoogleBusinessLink(url)).toBe(true);
  });

  it('reports gbp-link-invalid for a bare g.page/r/ link in the review', () => {
    const review = reviewWebsite({
      websiteUrl: null,
      fetch: null,
      googleBusinessUrl: 'https://g.page/r/',
      voice,
    });
    expect(review.fixes.map((f) => f.id)).toEqual(expect.arrayContaining(['gbp-link-invalid']));
    expect(review.checks.find((c) => c.id === 'google-business-profile')?.passed).toBe(false);
  });
});

describe('isGoogleBusinessLink rejects the private dashboard (Codex P1, head 22a64240)', () => {
  it.each(['https://business.google.com/dashboard/l/123', 'https://business.google.com/l/123'])(
    'rejects %s',
    (url) => {
      expect(isGoogleBusinessLink(url)).toBe(false);
    }
  );
});

describe('business.google.com never counts, even with a cid (Codex P1, head ce8eb97f)', () => {
  it.each([
    'https://business.google.com/dashboard/l/123?cid=456',
    'https://business.google.com/?ludocid=456',
    'https://business.google.com/maps/place/x',
  ])('rejects %s', (url) => {
    expect(isGoogleBusinessLink(url)).toBe(false);
  });
});

describe('a listing marker counts only on a listing path (Codex P1, head 7c3a51b7)', () => {
  // Class: a cid/ludocid or place path anywhere on a Google host was taken as a listing.
  const hosts = ['google.com', 'www.google.com', 'maps.google.com', 'www.google.com.au', 'maps.google.co.nz'];
  const unrelated = [
    '/robots.txt?cid=123',
    '/url?q=https://evil.example&cid=123',
    '/search?cid=123',
    '/maps/dir?cid=123',
    '/travel?ludocid=123',
    '/imgres?ludocid=123',
    '/maps?cid=123abc',
    '/maps?cid=',
    '/robots.txt/maps/place/x',
    '/maps/placex/Downs',
  ];
  it.each(hosts.flatMap((h) => unrelated.map((p) => `https://${h}${p}`)))('rejects %s', (url) => {
    expect(isGoogleBusinessLink(url)).toBe(false);
  });

  it.each([
    'https://www.google.com/maps?cid=123',
    'https://www.google.com.au/maps?cid=456',
    'https://maps.google.com/?cid=123',
    'https://maps.google.com/maps?cid=123',
    'https://www.google.com/search?q=downs+carpet&ludocid=123',
    'https://www.google.com/maps/place/Downs+Carpet+Care/@-27.5,151.9,15z',
  ])('accepts %s', (url) => {
    expect(isGoogleBusinessLink(url)).toBe(true);
  });

  it('the review gives the invalid-link fix for robots.txt?cid=123', () => {
    const review = reviewWebsite({
      websiteUrl: null,
      fetch: null,
      googleBusinessUrl: 'https://www.google.com/robots.txt?cid=123',
      voice,
    });
    expect(review.fixes.map((f) => f.id)).toContain('gbp-link-invalid');
  });
});

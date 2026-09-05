// @vitest-environment jsdom

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PublicFooter } from '@/components/landing/PublicFooter';

import RefundPolicyPage from '../../../app/(public)/refund-policy/page';
import SupportPage from '../../../app/(public)/support/page';

/**
 * Both pages were written on 18/08/2026 and never merged, so `/refund-policy` and
 * `/support` returned 404 on carsi.com.au while the site linked to neither. A
 * learner deciding whether to buy could not find the refund terms at all, which
 * the Australian Consumer Law expects to be available before purchase.
 *
 * Two failures caused that, so this pins both: the route must render, and the
 * footer must point at it. Either one alone leaves the defect half-present — a
 * page nobody can reach is not shipped, and a link to a missing page is worse
 * than no link.
 */

describe('refund policy and support pages', () => {
  it('the refund policy route renders and states the consumer-law position', () => {
    const html = renderToStaticMarkup(createElement(RefundPolicyPage));
    expect(html).toContain('Refund Policy');
    // The guarantees that cannot be excluded are the point of the page; if this
    // sentence is ever edited away the page stops doing its legal job.
    expect(html).toContain('Australian');
    expect(html).toContain('Consumer Law');
    expect(html).toContain('5 to 10 business days');
    expect(html).not.toContain('5–10');
    expect(html).not.toContain('5&ndash;10');
  });

  it('the support route renders and routes billing questions to the refund policy', () => {
    const html = renderToStaticMarkup(createElement(SupportPage));
    expect(html).toContain('Support');
    expect(html).toContain('/refund-policy');
    expect(html).toContain('Australian Consumer Law');
    expect(html).toContain('IICRC CEC Accredited');
  });

  // PublicFooter renders one of two independent markup trees and defaults to
  // 'chrome', but every current public caller passes tone="light"
  // (app/page.tsx and app/(public)/layout.tsx). A test that renders only the
  // default therefore proves nothing about the footer users actually see: an
  // independent review deleted the light strip's two links and this suite still
  // passed. Both variants are asserted separately, by name, so a deletion from
  // either one fails.
  const TONES = ['chrome', 'light'] as const;

  it.each(TONES)('the %s footer links to both new pages', (tone) => {
    const html = renderToStaticMarkup(createElement(PublicFooter, { tone }));
    expect(html).toContain('href="/refund-policy"');
    expect(html).toContain('href="/support"');
    expect(html).toContain('Refund policy');
  });

  it.each(TONES)('the %s footer keeps its existing legal links', (tone) => {
    // Guards the edit itself: adding two links must not displace the two that
    // were already there.
    const html = renderToStaticMarkup(createElement(PublicFooter, { tone }));
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
  });

  it('the two footer variants really are distinct markup, so neither assertion is redundant', () => {
    // If the variants ever collapse into one, the per-tone tests above stop
    // being two checks and quietly become one. This fails when that happens.
    const chrome = renderToStaticMarkup(createElement(PublicFooter, { tone: 'chrome' }));
    const light = renderToStaticMarkup(createElement(PublicFooter, { tone: 'light' }));
    expect(chrome).not.toEqual(light);
  });

  it('neither page links to a route that does not exist', () => {
    const refund = renderToStaticMarkup(createElement(RefundPolicyPage));
    const support = renderToStaticMarkup(createElement(SupportPage));
    const hrefs = [...refund.matchAll(/href="(\/[^"]*)"/g), ...support.matchAll(/href="(\/[^"]*)"/g)]
      .map((m) => m[1])
      .filter((h) => !h.startsWith('/#'));

    // Every internal target these two pages point at, verified present on main
    // or added by this change. A new link must be added here deliberately.
    const known = new Set([
      '/terms',
      '/privacy',
      '/contact',
      '/support',
      '/refund-policy',
      '/dashboard/courses',
    ]);

    expect(hrefs.length).toBeGreaterThan(0);
    const unknown = hrefs.filter((h) => !known.has(h));
    expect(unknown).toEqual([]);
  });
});

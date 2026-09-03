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
  });

  it('the support route renders and routes billing questions to the refund policy', () => {
    const html = renderToStaticMarkup(createElement(SupportPage));
    expect(html).toContain('Support');
    expect(html).toContain('/refund-policy');
  });

  it('the public footer links to both, so they are reachable from every public page', () => {
    const html = renderToStaticMarkup(createElement(PublicFooter));
    expect(html).toContain('href="/refund-policy"');
    expect(html).toContain('href="/support"');
  });

  it('the footer keeps its existing legal links', () => {
    // Guards the edit itself: adding two links must not displace the two that
    // were already there.
    const html = renderToStaticMarkup(createElement(PublicFooter));
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
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

import { describe, expect, it } from 'vitest';

import {
  PROFESSIONAL_DIRECTORY_NOTIFY_HREF,
  PROFESSIONAL_DIRECTORY_SUBMIT_HREF,
} from './professional-directory-links';
import { buildSubmissionLeadContext } from './submission-lead-context';

/**
 * Launch-funnel integrity for the Professional Directory coming-soon page (BACKLOG #12).
 *
 * The coming-soon gate has two calls to action — "Notify me at launch" and "Submit a
 * professional profile". Both are plain string hrefs, so a rename of the submit `[type]`
 * segment or of the contact page's `intent` discriminator would break the funnel silently,
 * with no type error. These tests pin each href to the route contract it depends on, so the
 * launch path cannot rot while the directory sits behind its gate.
 */

function parse(href: string): { pathname: string; params: Record<string, string> } {
  const url = new URL(href, 'https://carsi.com.au');
  return { pathname: url.pathname, params: Object.fromEntries(url.searchParams) };
}

describe('professional-directory coming-soon CTAs resolve to live routes', () => {
  it('the submit CTA targets a submission type generateStaticParams actually builds', async () => {
    const { pathname, params } = parse(PROFESSIONAL_DIRECTORY_SUBMIT_HREF);
    expect(pathname).toBe('/submit/professional');

    const { generateStaticParams } = await import('../../app/(public)/submit/[type]/page');
    const types = generateStaticParams().map((p) => p.type);
    expect(types).toContain('professional');

    // The lead context must survive the hop so the form copy and the admin lead know the
    // submission came from the directory launch queue.
    const ctx = buildSubmissionLeadContext(params);
    expect(ctx?.source).toBe('professional-directory');
    expect(ctx?.pageUrl).toBe('/professional-directory');
  });

  it('the notify CTA targets /contact with the directory-notify intent the contact page keys on', () => {
    const { pathname, params } = parse(PROFESSIONAL_DIRECTORY_NOTIFY_HREF);
    expect(pathname).toBe('/contact');
    // app/(public)/contact/page.tsx branches on exactly this (source, intent) pair to render the
    // directory-notify confirmation variant. Keep all three in lockstep.
    expect(params.source).toBe('professional-directory');
    expect(params.intent).toBe('directory-notify');
    expect(params.topic).toBeTruthy();
  });
});

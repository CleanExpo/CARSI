import { describe, expect, it } from 'vitest';

import { catalogueCourseTitle } from '@/lib/marketing/authority-catalogue-titles';
import { getAuthorityPage } from '@/lib/marketing/authority-pages';
import {
  roleGuideEmployerTrustLinks,
  roleGuideSecondaryCtas,
  roleGuideStartHereCourses,
  WHS_FUNDAMENTALS_SLUG,
} from '@/lib/marketing/role-guide-conversion';

describe('roleGuideStartHereCourses', () => {
  it('returns at most three live slugs in bundle order', () => {
    const entry = getAuthorityPage('commercial-cleaning-contractors');
    const live = new Set(entry.bundle.publishedSlugs.slice(0, 2));
    const rows = roleGuideStartHereCourses(entry, live, catalogueCourseTitle);
    expect(rows.length).toBe(2);
    expect(rows[0].href).toMatch(/^\/courses\//);
  });
});

describe('roleGuideSecondaryCtas', () => {
  it('includes partner demo for operator guides', () => {
    const ctas = roleGuideSecondaryCtas('commercial-cleaning-contractors');
    expect(ctas.some((c) => c.href.includes('partner-demo'))).toBe(true);
  });
});

describe('roleGuideEmployerTrustLinks', () => {
  it('includes WHS when slug is live', () => {
    const links = roleGuideEmployerTrustLinks(new Set([WHS_FUNDAMENTALS_SLUG]));
    expect(links[0].href).toContain(WHS_FUNDAMENTALS_SLUG);
  });
});
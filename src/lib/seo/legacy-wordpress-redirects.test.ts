import { describe, expect, it } from 'vitest';

import nextConfig from '../../../next.config';
import { LEGACY_WORDPRESS_REDIRECTS } from './legacy-wordpress-redirects';

/**
 * Sister sites still link to carsi.com.au's old WordPress URLs. Each one 404'd on 19/10/2026
 * (curl -L): Disaster Recovery's minimum-training and hazmat pages link six /product/ courses,
 * and its contractor onboarding links /membership/. These tests pin the evidenced mapping:
 * each WordPress product's title (data/wordpress-export/courses.json) equals the live course
 * page title at the destination. An unmatched /product/ goes to the catalogue, never a guess.
 */
const EXPECTED: Record<string, string> = {
  '/product/safety-procedures': '/courses/introduction-to-safety-procedures-for-water-damage-work',
  '/product/risk-assessment-course': '/courses/risk-assessment-course',
  '/product/safe-work-method-statements-swms-course': '/courses/safe-work-method-statements-swms-course',
  '/product/safety-data-sheet-sds-course': '/courses/safety-data-sheet-sds-course',
  '/product/standard-operating-procedures-sop-course': '/courses/standard-operating-procedures-sop-course',
  '/product/asbestos': '/courses/introduction-to-asbestos-asbestos-awareness',
  '/membership': '/subscribe',
  '/product/:slug*': '/courses',
};

describe('LEGACY_WORDPRESS_REDIRECTS', () => {
  it('maps exactly the evidenced legacy paths, each as a 301', () => {
    const table = Object.fromEntries(LEGACY_WORDPRESS_REDIRECTS.map((r) => [r.source, r.destination]));
    expect(table).toEqual(EXPECTED);
    for (const r of LEGACY_WORDPRESS_REDIRECTS) expect(r.statusCode).toBe(301);
  });

  it('lists every specific /product/ rule before the catalogue catch-all', () => {
    const sources = LEGACY_WORDPRESS_REDIRECTS.map((r) => r.source);
    const catchAll = sources.indexOf('/product/:slug*');
    expect(catchAll).toBe(sources.length - 1);
  });

  it('never points a redirect at another redirect source (no chains or loops)', () => {
    const sources = new Set(LEGACY_WORDPRESS_REDIRECTS.map((r) => r.source));
    for (const r of LEGACY_WORDPRESS_REDIRECTS) {
      expect(sources.has(r.destination)).toBe(false);
      expect(r.destination.startsWith('/product')).toBe(false);
    }
  });

  it('is wired into next.config redirects() ahead of nothing that could shadow it', async () => {
    const rules = (await nextConfig.redirects?.()) ?? [];
    for (const r of LEGACY_WORDPRESS_REDIRECTS) {
      const hit = rules.find((x) => x.source === r.source);
      expect(hit, r.source).toBeDefined();
      expect(hit).toMatchObject({ destination: r.destination, statusCode: 301 });
    }
  });
});

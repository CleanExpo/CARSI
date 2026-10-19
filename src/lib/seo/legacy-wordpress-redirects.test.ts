import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { describe, expect, it } from 'vitest';

import nextConfig from '../../../next.config';
import { LEGACY_WORDPRESS_REDIRECTS, findRedirectChains } from './legacy-wordpress-redirects';
import { RENAMED_COURSE_SLUGS } from './renamed-course-slugs';

/**
 * Sister sites still link to carsi.com.au's old WordPress URLs. Each one 404'd on 19/10/2026
 * (curl -L): Disaster Recovery's minimum-training and hazmat pages link six /product/ courses,
 * and its contractor onboarding links /membership/. These tests pin the evidenced mapping:
 * each WordPress product's title (data/wordpress-export/courses.json) equals the live course
 * page title at the destination. An unmatched /product/ goes to the catalogue, never a guess.
 *
 * Routing is checked with Next's own matcher, walking the FULL redirects() list in order, the
 * way the router does (server/lib/router-utils/filesystem.js buildCustomRoute: strict,
 * removeUnnamedParams, case-insensitive). Whether a destination exists live is not a unit
 * question; scripts/check-ecosystem-links.ts --redirect-destinations checks that.
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

type Rule = { source: string; destination: string; statusCode?: number; permanent?: boolean };

async function configRules(): Promise<Rule[]> {
  return ((await nextConfig.redirects?.()) ?? []) as Rule[];
}

function matcher(source: string) {
  return getPathMatch(source, { strict: true, removeUnnamedParams: true, sensitive: false });
}

/** The first redirect rule Next would apply to `path` (already slashless), or null. */
function firstMatch(rules: Rule[], path: string): Rule | null {
  return rules.find((r) => matcher(r.source)(path) !== false) ?? null;
}

describe('LEGACY_WORDPRESS_REDIRECTS', () => {
  it('maps exactly the evidenced legacy paths, each as a 301 and never as permanent', () => {
    const table = Object.fromEntries(LEGACY_WORDPRESS_REDIRECTS.map((r) => [r.source, r.destination]));
    expect(table).toEqual(EXPECTED);
    for (const r of LEGACY_WORDPRESS_REDIRECTS) {
      expect(r.statusCode).toBe(301);
      expect('permanent' in r).toBe(false);
    }
  });

  it('sends each real legacy URL to its mapped page — the first rule Next matches', async () => {
    const rules = await configRules();
    const cases: Record<string, string> = {
      '/product/safety-procedures': EXPECTED['/product/safety-procedures'],
      '/product/risk-assessment-course': EXPECTED['/product/risk-assessment-course'],
      '/product/safe-work-method-statements-swms-course':
        EXPECTED['/product/safe-work-method-statements-swms-course'],
      '/product/safety-data-sheet-sds-course': EXPECTED['/product/safety-data-sheet-sds-course'],
      '/product/standard-operating-procedures-sop-course':
        EXPECTED['/product/standard-operating-procedures-sop-course'],
      '/product/asbestos': EXPECTED['/product/asbestos'],
      '/product/ASBESTOS': EXPECTED['/product/asbestos'],
      '/membership': '/subscribe',
      '/product/unknown-course': '/courses',
      '/product/asbestos/extra': '/courses',
      '/product': '/courses',
    };
    for (const [path, destination] of Object.entries(cases)) {
      const hit = firstMatch(rules, path);
      expect(hit, path).not.toBeNull();
      expect({ path, destination: hit!.destination, statusCode: hit!.statusCode }).toEqual({
        path,
        destination,
        statusCode: 301,
      });
    }
  });

  it('leaves current pages alone', async () => {
    const rules = await configRules();
    for (const path of ['/courses', '/subscribe', '/products', '/membership-plans', '/ecosystem']) {
      expect(firstMatch(rules, path), path).toBeNull();
    }
  });

  it('never points at something that redirects again (config rule, renamed course, trailing slash)', async () => {
    const rules = await configRules();
    const matchesConfig = (path: string) => firstMatch(rules, path) !== null;
    expect(findRedirectChains(LEGACY_WORDPRESS_REDIRECTS, matchesConfig, RENAMED_COURSE_SLUGS)).toEqual([]);
  });

  it('catches a chain when one is planted (positive control for the check above)', async () => {
    const rules = await configRules();
    const matchesConfig = (path: string) => firstMatch(rules, path) !== null;
    const planted = [
      { destination: '/courses/wrt-water-damage-essentials' },
      { destination: '/membership' },
      { destination: '/courses/' },
    ];
    expect(findRedirectChains(planted, matchesConfig, RENAMED_COURSE_SLUGS)).toHaveLength(3);
  });

  it('uses sources Next can match and that cannot redirect away an app route', async () => {
    const appRules = (await configRules()).filter(
      (r) => !LEGACY_WORDPRESS_REDIRECTS.some((l) => l === (r as unknown))
    );
    const appSources = new Set(appRules.map((r) => r.source));
    for (const r of LEGACY_WORDPRESS_REDIRECTS) {
      // Next 308s a trailing slash away before any config rule, so a slash source never matches.
      expect(r.source.endsWith('/'), r.source).toBe(false);
      expect(r.source, r.source).not.toMatch(/^\/(?:api|_next|dashboard|admin)(?:\/|$)/);
      expect(appSources.has(r.source), `${r.source} duplicates an existing redirect`).toBe(false);
    }
  });

  it('keeps every destination on the catalogue, a course page or the membership page', () => {
    for (const r of LEGACY_WORDPRESS_REDIRECTS) {
      expect(r.destination).toMatch(/^(?:\/courses(?:\/[a-z0-9-]+)?|\/subscribe)$/);
    }
  });
});

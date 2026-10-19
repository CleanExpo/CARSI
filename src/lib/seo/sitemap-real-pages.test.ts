/**
 * sitemap.xml must list only real, indexable pages. Live on 18/10/2026 it listed /ccw-materials,
 * whose page only calls permanentRedirect(): inside the streamed App Router response that is
 * served as HTTP 200 + <meta http-equiv="refresh"> (a soft redirect), so crawlers saw a
 * duplicate page instead of a 308. Every static sitemap path must resolve to a page file that
 * renders content, and must not be the source of a next.config redirect.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import { getRedirectStatus, modifyRouteRegex } from 'next/dist/lib/redirect-status';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';

// The directory flag is ON for this file: the sitemap must still leave the noindex
// coming-soon page out while there are no verified listings (review P1, 18/10/2026).
vi.hoisted(() => {
  process.env.PROFESSIONAL_DIRECTORY_LIVE = 'true';
});

const db = vi.hoisted(() => ({
  courses: [] as Array<{ slug: string; updated_at: string; category?: string | null }>,
}));
vi.mock('@/lib/server/public-courses-list', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/public-courses-list')>()),
  getPublishedCourseSlugsFromDatabase: vi.fn(async () => db.courses),
}));

const directory = vi.hoisted(() => ({ verifiedListings: 0 }));
vi.mock('@/lib/server/professional-directory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/professional-directory')>();
  return {
    ...actual,
    getProfessionalDirectoryStatus: vi.fn(async () => ({
      live: actual.isProfessionalDirectoryLive() && directory.verifiedListings > 0,
      listingCount: directory.verifiedListings,
      source: directory.verifiedListings > 0 ? 'nrpg_registry' : 'none',
    })),
  };
});

import { FLOOR_CARE_ONBOARDING_SLUG, ONBOARDING_BRAND } from '@/lib/onboarding/enterprise';

import nextConfig from '../../../next.config';
import sitemap from '../../../app/sitemap';
import { DEFAULT_PATHS as INDEXNOW_DEFAULT_PATHS } from '../../../scripts/submit-indexnow.mjs';
import { hasPublicCoursePage } from './public-course-page';

const APP = join(process.cwd(), 'app');

type PageRoute = { segments: string[]; file: string };

function pageRoutes(dir = APP, out: PageRoute[] = []): PageRoute[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) pageRoutes(full, out);
    else if (/^page\.tsx?$/.test(name)) {
      const segments = relative(APP, dir)
        .split(sep)
        .filter((s) => s && !/^\(.*\)$/.test(s));
      out.push({ segments, file: full });
    }
  }
  return out;
}

/** Static routes win over dynamic ones, as in Next's router. */
function resolvePage(pathname: string, routes: PageRoute[]): PageRoute | undefined {
  const parts = pathname.split('/').filter(Boolean);
  const candidates = routes.filter(
    (r) =>
      r.segments.length === parts.length &&
      r.segments.every((seg, i) => seg === parts[i] || /^\[[^.\]]+\]$/.test(seg))
  );
  return candidates.sort(
    (a, b) =>
      b.segments.filter((s) => !s.startsWith('[')).length -
      a.segments.filter((s) => !s.startsWith('[')).length
  )[0];
}

/** A page that redirects and renders no element of its own is a redirect, not a page. */
export function isRedirectOnlyPage(source: string): boolean {
  const redirects = /\b(permanentRedirect|redirect)\(/.test(source);
  const rendersElement = /<[A-Za-z][\w.]*[\s/>]/.test(source);
  return redirects && !rendersElement;
}

type Redirect = { source: string; destination: string; permanent?: boolean; statusCode?: number };

async function redirectFor(pathname: string) {
  const routes = ((await nextConfig.redirects?.()) ?? []) as Redirect[];
  for (const route of routes) {
    const match = getPathMatch(route.source, {
      strict: true,
      removeUnnamedParams: true,
      regexModifier: (regex) => modifyRouteRegex(regex, ['/_next']),
      sensitive: false,
    });
    if (match(pathname) !== false) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { destination: route.destination, statusCode: getRedirectStatus(route as any) };
    }
  }
  return null;
}

async function sitemapPaths(): Promise<string[]> {
  const entries = await sitemap();
  return entries.map((e) => new URL(e.url).pathname);
}

describe('sitemap lists only real pages', () => {
  it('classifies a redirect-only page, and not a page that redirects conditionally', () => {
    expect(isRedirectOnlyPage("export default function P() { permanentRedirect('/x'); }")).toBe(
      true
    );
    expect(
      isRedirectOnlyPage(
        "export default function P() { if (!ok) redirect('/x'); return <main />; }"
      )
    ).toBe(false);
  });

  it('every static sitemap path resolves to a page that renders content', async () => {
    const routes = pageRoutes();
    const offenders: string[] = [];
    for (const path of await sitemapPaths()) {
      const page = resolvePage(path, routes);
      if (!page) offenders.push(`${path} (no page file)`);
      else if (isRedirectOnlyPage(readFileSync(page.file, 'utf8')))
        offenders.push(`${path} (redirect-only page ${relative(process.cwd(), page.file)})`);
    }
    expect(offenders).toEqual([]);
  });

  it('no sitemap path is the source of a next.config redirect', async () => {
    const offenders: string[] = [];
    for (const path of await sitemapPaths()) {
      const hit = await redirectFor(path);
      if (hit) offenders.push(`${path} -> ${hit.destination}`);
    }
    expect(offenders).toEqual([]);
  });

  it('the legacy /ccw-materials URL is a real 308 to the workshop materials section', async () => {
    expect(await redirectFor('/ccw-materials')).toEqual({
      destination: '/ccw-training/workshop?section=materials',
      statusCode: 308,
    });
  });

  /**
   * Review P1 (18/10/2026): /courses/floor-care-onboarding-operational-readiness was in the live
   * sitemap, but the course page redirects onboarding courses to the dashboard (200 + meta
   * refresh, then login). A published course is listed only if its public page renders.
   */
  it('leaves out published courses whose page redirects (onboarding), keeps the rest', async () => {
    db.courses = [
      {
        slug: 'water-damage-essentials',
        updated_at: '2026-10-01T00:00:00.000Z',
        category: 'Water',
      },
      { slug: FLOOR_CARE_ONBOARDING_SLUG, updated_at: '2026-10-01T00:00:00.000Z', category: null },
      {
        slug: 'acme-onboarding',
        updated_at: '2026-10-01T00:00:00.000Z',
        category: ONBOARDING_BRAND,
      },
    ];
    try {
      const paths = await sitemapPaths();
      expect(paths).toContain('/courses/water-damage-essentials');
      expect(paths).not.toContain(`/courses/${FLOOR_CARE_ONBOARDING_SLUG}`);
      expect(paths).not.toContain('/courses/acme-onboarding');
    } finally {
      db.courses = [];
    }
  });

  it('every /courses/<slug> URL in the sitemap passes the course page predicate', async () => {
    const offenders = (await sitemapPaths())
      .map((p) => p.match(/^\/courses\/([^/]+)$/)?.[1])
      .filter((slug): slug is string => Boolean(slug))
      .filter((slug) => !hasPublicCoursePage({ slug }));
    expect(offenders).toEqual([]);
  });

  it('the course page redirects on exactly that predicate, and the /courses ItemList filters on it', () => {
    const page = readFileSync(join(APP, '(public)/courses/[slug]/page.tsx'), 'utf8');
    expect(page).toMatch(
      /if \(!hasPublicCoursePage\(\{ slug: course\.slug, category: course\.category \}\)\)/
    );
    expect(page).not.toMatch(/isOnboardingCourse\(/);
    const index = readFileSync(join(APP, '(public)/courses/page.tsx'), 'utf8');
    expect(index).toMatch(/const courseListItems = displayCourses\.filter\(hasPublicCoursePage\)/);
  });

  it('lists the professional directory only when it has verified listings, not on the flag alone', async () => {
    expect(await sitemapPaths()).not.toContain('/professional-directory');
    directory.verifiedListings = 3;
    try {
      expect(await sitemapPaths()).toContain('/professional-directory');
    } finally {
      directory.verifiedListings = 0;
    }
  });

  it('IndexNow submits by default only pages the sitemap lists (indexable pages)', async () => {
    const sitemapSet = new Set(await sitemapPaths());
    const pagePaths = (INDEXNOW_DEFAULT_PATHS as string[]).filter((p) => !/\.[a-z]+$/.test(p));
    expect(pagePaths.length).toBeGreaterThan(5);
    expect(pagePaths.filter((p) => !sitemapSet.has(p))).toEqual([]);
  });
});

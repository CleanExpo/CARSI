/**
 * GP-730: a draft course's field tools and diagrams under public/courses/<folder>/ must not be
 * served by direct address. Covers both halves: the proxy matcher must reach the file (static
 * files skipped the proxy before), and the proxy must answer 404 unless the course is published
 * (database first, seed catalogue only when the database cannot be asked). The guard walks the
 * real public/courses tree, so a new draft folder is covered the moment it lands. Staff and
 * learner sessions are covered in course-asset-staff.test.ts.
 */
import fs from 'node:fs';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CourseSlugState } from '@/lib/seo/renamed-course-slugs';

import catalog from '../../../data/seed/courses-catalog.json';

import {
  cachedCourseSlugLookup,
  courseAssetDecision,
  courseAssetFolder,
  courseSlugForAssetFolder,
  publishedCatalogSlugs,
} from './course-asset-access';

/**
 * The live database as observed on 21/11/2026: every course the seed publishes, plus
 * level-3 mould, which the seed still marks draft while carsi.com.au lists and serves it.
 */
const LIVE_PUBLISHED = new Set([
  ...publishedCatalogSlugs(catalog.courses),
  'level-3-mould-remediation-c5797369',
]);
const liveDatabase = async (slug: string): Promise<CourseSlugState> =>
  LIVE_PUBLISHED.has(slug) ? 'published' : 'unpublished';

const mocks = vi.hoisted(() => ({
  updateSession: vi.fn(),
  renamed: vi.fn(),
  lookup: vi.fn(),
}));
vi.mock('@/lib/api/middleware', () => ({ updateSession: mocks.updateSession }));
vi.mock('@/lib/seo/renamed-course-slugs', () => ({
  renamedCourseRedirect: mocks.renamed,
  lookupCourseSlugInDatabase: mocks.lookup,
}));

const { proxy, config } = await import('../../../proxy');

const ROOT = path.resolve(__dirname, '../../..');
const PUBLIC_COURSES = path.join(ROOT, 'public', 'courses');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const allCourseFiles = walk(PUBLIC_COURSES).map(
  (abs) => '/' + path.relative(path.join(ROOT, 'public'), abs).split(path.sep).join('/')
);
const isLive = (url: string) => LIVE_PUBLISHED.has(courseSlugForAssetFolder(url.split('/')[2]));
const draftFiles = allCourseFiles.filter((u) => !isLive(u));
const publishedFiles = allCourseFiles.filter(isLive);

const DRAFT_FIELD_TOOL = '/courses/hard-floor-care/field-tools/floor-family-and-surface-layer-card.md';
const LEVEL_3_FILE = allCourseFiles.find((u) =>
  u.startsWith('/courses/level-3-mould-remediation-c5797369/')
)!;

async function fetchThroughProxy(url: string) {
  return proxy(new NextRequest(`https://carsi.com.au${encodeURI(url)}`));
}

beforeEach(() => {
  mocks.renamed.mockReset();
  mocks.renamed.mockResolvedValue(null);
  mocks.updateSession.mockReset();
  mocks.updateSession.mockImplementation(async () => NextResponse.next());
  mocks.lookup.mockReset();
  mocks.lookup.mockImplementation(liveDatabase);
});

describe('the fixture is real', () => {
  it('public/courses holds draft and published course files', () => {
    // A guard that scans nothing passes vacuously (CLAUDE.md: a guard's silence is not a pass).
    expect(draftFiles.length).toBeGreaterThan(20);
    expect(publishedFiles.length).toBeGreaterThan(20);
    expect(fs.existsSync(path.join(ROOT, 'public', DRAFT_FIELD_TOOL))).toBe(true);
    expect(LEVEL_3_FILE).toBeTruthy();
  });

  it('every file under public/courses is a course file the proxy decides on', () => {
    // An extension-less file would be treated as a page and slip past the gate.
    for (const url of allCourseFiles) expect(courseAssetFolder(url), url).toBeTruthy();
  });
});

describe('GP-730: draft course files are not served by direct address', () => {
  it('runs the proxy for a draft field tool and answers 404', async () => {
    expect(unstable_doesMiddlewareMatch({ config, url: DRAFT_FIELD_TOOL })).toBe(true);
    const res = await fetchThroughProxy(DRAFT_FIELD_TOOL);
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it('every file of an unpublished course is reached by the proxy and refused', async () => {
    for (const url of draftFiles) {
      expect(unstable_doesMiddlewareMatch({ config, url: encodeURI(url) }), url).toBe(true);
      const res = await fetchThroughProxy(url);
      expect(res.status, url).toBe(404);
    }
  });

  it('every file of a published course is still served untouched', async () => {
    for (const url of publishedFiles) {
      expect(unstable_doesMiddlewareMatch({ config, url: encodeURI(url) }), url).toBe(true);
      const res = await fetchThroughProxy(url);
      expect(res.status, url).toBe(200);
      expect(res.headers.get('x-middleware-next'), url).toBe('1');
      expect(res.headers.get('cache-control'), url).toBeNull();
    }
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it('serves a course the database publishes even when the seed still says draft (level 3 mould)', async () => {
    const seed = catalog.courses.find((c) => c.slug === 'level-3-mould-remediation-c5797369');
    expect(seed?.status).not.toBe('published');
    const res = await fetchThroughProxy(LEVEL_3_FILE);
    expect(res.status).toBe(200);
  });
});

describe('only a fresh database answer opens a file; the seed only where no database exists', () => {
  const url = '/courses/hard-floor-care/diagrams/hf-1.svg';
  const anon = { isStaff: async () => false };

  it('opens once the database publishes the course, and closes again on unpublish', async () => {
    expect(await courseAssetDecision(url, { ...anon, lookup: async () => 'unpublished' })).toBe(
      'refuse'
    );
    expect(await courseAssetDecision(url, { ...anon, lookup: async () => 'absent' })).toBe(
      'refuse'
    );
    expect(await courseAssetDecision(url, { ...anon, lookup: async () => 'published' })).toBe(
      'serve'
    );
  });

  it('the database wins over the seed in both directions', async () => {
    const seedPublishes = new Set(['hard-floor-care']);
    expect(
      await courseAssetDecision(url, {
        ...anon,
        lookup: async () => 'unpublished',
        seedWhenNoDatabase: seedPublishes,
      })
    ).toBe('refuse');
    expect(
      await courseAssetDecision(url, {
        ...anon,
        lookup: async () => 'published',
        seedWhenNoDatabase: new Set(),
      })
    ).toBe('serve');
  });

  it('a failed lookup with a database configured refuses, even for a seed-published course', async () => {
    // Review round 1, P1: a transient query error must not open a course the live database
    // unpublished. The proxy passes no seed when DATABASE_URL is set.
    const lookup = async () => null;
    const seedPublished = [...publishedCatalogSlugs(catalog.courses)][0];
    expect(seedPublished).toBeTruthy();
    expect(
      await courseAssetDecision(`/courses/${seedPublished}/field-tools/x.md`, { ...anon, lookup })
    ).toBe('refuse');
    // Staff can still review while the database is down.
    expect(
      await courseAssetDecision(`/courses/${seedPublished}/field-tools/x.md`, {
        lookup,
        isStaff: async () => true,
      })
    ).toBe('serve-private');
  });

  it('with no database configured, the seed decides and an unknown course stays closed', async () => {
    const lookup = async () => null;
    expect(
      await courseAssetDecision(url, { ...anon, lookup, seedWhenNoDatabase: new Set() })
    ).toBe('refuse');
    expect(
      await courseAssetDecision(url, {
        ...anon,
        lookup,
        seedWhenNoDatabase: new Set(['hard-floor-care']),
      })
    ).toBe('serve');
  });

  it('follows the canonical status rule (#137) for the seed fallback', () => {
    const slugs = publishedCatalogSlugs([
      { slug: 'a', status: 'published' },
      { slug: 'b', status: 'PUBLISHED' },
      { slug: 'c', status: 'draft' },
      { slug: 'd', status: 'archived' },
      { slug: 'e', status: null },
    ]);
    expect([...slugs]).toEqual(['a', 'b']);
  });

  it('maps an aliased folder to its course before asking', async () => {
    const lookup = vi.fn(async () => 'published' as const);
    await courseAssetDecision('/courses/ccw-carsi-truckmount/course-pack.html', {
      ...anon,
      lookup,
    });
    expect(lookup).toHaveBeenCalledWith('ccw-carsi-truckmount-operations');
  });
});

describe('the publication cache', () => {
  it('never caches a published answer, so unpublishing closes the files on the next request', async () => {
    // Review round 1, P1: a cached 'published' kept files public after unpublish.
    let state: CourseSlugState = 'published';
    const inner = vi.fn(async () => state);
    const cached = cachedCourseSlugLookup(inner, { ttlMs: 60_000, now: () => 0 });
    const decide = () =>
      courseAssetDecision('/courses/some-course/diagrams/x.svg', {
        lookup: cached,
        isStaff: async () => false,
      });
    expect(await decide()).toBe('serve');
    state = 'unpublished';
    expect(await decide()).toBe('refuse');
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it('caches closed answers within the TTL, asks again after it, and never caches a failure', async () => {
    let t = 0;
    const inner = vi.fn<(slug: string) => Promise<CourseSlugState | null>>();
    inner.mockResolvedValueOnce(null).mockResolvedValue('unpublished');
    const cached = cachedCourseSlugLookup(inner, { ttlMs: 1000, now: () => t });
    expect(await cached('x')).toBeNull();
    expect(await cached('x')).toBe('unpublished');
    expect(await cached('X')).toBe('unpublished');
    expect(inner).toHaveBeenCalledTimes(2);
    t = 1500;
    await cached('x');
    expect(inner).toHaveBeenCalledTimes(3);
  });

  it('stays bounded when callers invent folders', async () => {
    const inner = vi.fn(async () => 'absent' as const);
    const cached = cachedCourseSlugLookup(inner, { maxEntries: 3 });
    for (const s of ['a', 'b', 'c', 'd']) await cached(s);
    await cached('a');
    expect(inner).toHaveBeenCalledTimes(5);
  });
});

describe('course pages and odd addresses', () => {
  it('leaves course pages to the normal page flow', () => {
    expect(courseAssetFolder('/courses')).toBeNull();
    expect(courseAssetFolder('/courses/hard-floor-care')).toBeNull();
    expect(courseAssetFolder('/courses/hard-floor-care/payment-success')).toBeNull();
    expect(courseAssetFolder('/other/hard-floor-care/x.md')).toBeNull();
  });

  it('a draft course page still goes through the session flow', async () => {
    const res = await proxy(new NextRequest('https://carsi.com.au/courses/hard-floor-care'));
    expect(res.status).toBe(200);
    expect(mocks.updateSession).toHaveBeenCalledTimes(1);
  });

  it('refuses percent-encoded, traversal and doubled-slash forms of a draft file', async () => {
    for (const url of [
      '/courses/hard%2Dfloor%2Dcare/field-tools/x.md',
      '/courses//hard-floor-care/field-tools/x.md',
      '/courses/water-damage-restoration-fundamentals/%2e%2e/hard-floor-care/x.md',
      '/courses/water-damage-restoration-fundamentals/..%2fhard-floor-care/x.md',
      '/courses/water-damage-restoration-fundamentals/%E0%A4%A/x.md',
    ]) {
      expect(
        await courseAssetDecision(url, { lookup: liveDatabase, isStaff: async () => false }),
        url
      ).toBe('refuse');
    }
  });

  it('refuses a draft file addressed with encoded slashes, which the static server decodes', async () => {
    // Observed on next dev 16.4.6: /courses/<folder>%2F<path> served the draft file while the
    // proxy saw a single segment.
    for (const url of [
      '/courses/hard-floor-care%2Ffield-tools%2Ffloor-family-and-surface-layer-card.md',
      '/courses/hard-floor-care%2ffield-tools/floor-family-and-surface-layer-card.md',
      '/courses/hard-floor-care%5Cfield-tools%5Cx.md',
    ]) {
      expect(unstable_doesMiddlewareMatch({ config, url }), url).toBe(true);
      const res = await proxy(new NextRequest(`https://carsi.com.au${url}`));
      expect(res.status, url).toBe(404);
    }
  });
});

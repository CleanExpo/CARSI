/**
 * GP-730: a draft course's field tools and diagrams under public/courses/<folder>/ must not be
 * served by direct address. Covers both halves: the proxy matcher must reach the file (static
 * files skipped the proxy before), and the proxy must answer 404 unless the catalogue marks the
 * course published. The guard walks the real public/courses tree against the real catalogue, so
 * a new draft folder is covered the moment it lands.
 */
import fs from 'node:fs';
import path from 'node:path';

import { NextRequest, NextResponse } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import catalog from '../../../data/seed/courses-catalog.json';

import {
  courseAssetDecision,
  courseAssetFolder,
  isCourseAssetFolderPublished,
  publishedCatalogSlugs,
} from './course-asset-access';

const mocks = vi.hoisted(() => ({ updateSession: vi.fn(), renamed: vi.fn() }));
vi.mock('@/lib/api/middleware', () => ({ updateSession: mocks.updateSession }));
vi.mock('@/lib/seo/renamed-course-slugs', () => ({
  renamedCourseRedirect: mocks.renamed,
  lookupCourseSlugInDatabase: vi.fn(),
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
const folderOf = (url: string) => url.split('/')[2];
const published = publishedCatalogSlugs(catalog.courses);
const draftFiles = allCourseFiles.filter((u) => !isCourseAssetFolderPublished(folderOf(u)));
const publishedFiles = allCourseFiles.filter((u) => isCourseAssetFolderPublished(folderOf(u)));

const DRAFT_FIELD_TOOL = '/courses/hard-floor-care/field-tools/floor-family-and-surface-layer-card.md';

async function fetchThroughProxy(url: string) {
  return proxy(new NextRequest(`https://carsi.com.au${encodeURI(url)}`));
}

beforeEach(() => {
  mocks.renamed.mockReset();
  mocks.renamed.mockResolvedValue(null);
  mocks.updateSession.mockReset();
  mocks.updateSession.mockImplementation(async () => NextResponse.next());
});

describe('the fixture is real', () => {
  it('public/courses holds draft and published course files', () => {
    // A guard that scans nothing passes vacuously (CLAUDE.md: a guard's silence is not a pass).
    expect(draftFiles.length).toBeGreaterThan(20);
    expect(publishedFiles.length).toBeGreaterThan(20);
    expect(fs.existsSync(path.join(ROOT, 'public', DRAFT_FIELD_TOOL))).toBe(true);
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

  it('every file of a course the catalogue does not publish is reached by the proxy and refused', async () => {
    for (const url of draftFiles) {
      expect(unstable_doesMiddlewareMatch({ config, url: encodeURI(url) }), url).toBe(true);
      const res = await fetchThroughProxy(url);
      expect(res.status, url).toBe(404);
    }
  });

  it('every file of a published course is still served untouched', async () => {
    for (const url of publishedFiles) {
      const res = await fetchThroughProxy(url);
      expect(res.status, url).toBe(200);
      expect(res.headers.get('x-middleware-next'), url).toBe('1');
    }
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it('serves the published courses that link to their files today', () => {
    for (const url of [
      '/courses/level-2-mould-remediation-30ee3492/diagrams/l2-1-2-hierarchy-of-controls.svg',
      '/courses/water-damage-restoration-fundamentals/field-tools/x.md',
      '/courses/moisture-meters-readings-and-dry-standards/diagrams/x.svg',
      // Folder name differs from the catalogue slug (ccw-carsi-truckmount-operations).
      '/courses/ccw-carsi-truckmount/course-pack.html',
    ]) {
      expect(courseAssetDecision(url), url).toBe('serve');
    }
  });
});

describe('the decision follows the catalogue, not a hand list', () => {
  it('a draft folder opens once its course is published, and closes again on unpublish', () => {
    const url = '/courses/hard-floor-care/diagrams/hf-1.svg';
    expect(courseAssetDecision(url, new Set())).toBe('refuse');
    expect(courseAssetDecision(url, new Set(['hard-floor-care']))).toBe('serve');
  });

  it('follows the canonical status rule (#137), never the legacy isPublished column alone', () => {
    const slugs = publishedCatalogSlugs([
      { slug: 'a', status: 'published' },
      { slug: 'b', status: 'PUBLISHED' },
      { slug: 'c', status: 'draft' },
      { slug: 'd', status: 'archived' },
      { slug: 'e', status: null },
    ]);
    expect([...slugs]).toEqual(['a', 'b']);
    expect(published.has('hard-floor-care')).toBe(false);
  });

  it('refuses a folder that has no catalogue course at all', () => {
    expect(courseAssetDecision('/courses/not-a-course/field-tools/x.md')).toBe('refuse');
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

  it('refuses percent-encoded, traversal and doubled-slash forms of a draft file', () => {
    for (const url of [
      '/courses/hard%2Dfloor%2Dcare/field-tools/x.md',
      '/courses//hard-floor-care/field-tools/x.md',
      '/courses/water-damage-restoration-fundamentals/%2e%2e/hard-floor-care/x.md',
      '/courses/water-damage-restoration-fundamentals/..%2fhard-floor-care/x.md',
      '/courses/water-damage-restoration-fundamentals/%E0%A4%A/x.md',
    ]) {
      expect(courseAssetDecision(url), url).toBe('refuse');
    }
  });
});

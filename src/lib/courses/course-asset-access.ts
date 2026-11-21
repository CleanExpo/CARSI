/**
 * Who may fetch a file under `public/courses/<folder>/...` (GP-730).
 *
 * Next.js serves `public/` as static files, so a draft course's field tools and diagrams were
 * reachable by anyone with the exact address before the course was published. The proxy now
 * asks this module first. A course file is served to everyone only when its course is
 * published by the same rule the course page uses: the database row, through
 * `lookupCourseSlugInDatabase` (`lmsPublishedCourseWhere`, status canonical per #137). The seed
 * catalogue is not the live truth: on 21/11/2026 `level-3-mould-remediation-c5797369` was
 * `draft` in `data/seed/courses-catalog.json` while the live page and course list served it.
 *
 * One design rule: only a fresh, successful database answer can open a file to the public.
 * Every other source (a failed query, a cached answer, the seed) can only keep it closed.
 *
 * - Published in the database (asked on this request): served to everyone.
 * - Draft, archived or no row: served only to staff (a valid admin cookie, or a verified session
 *   whose role opens the admin panel), never cached; everyone else gets 404.
 * - Database configured but the query failed: refused (staff still served). Fail closed.
 * - No database configured at all (local runs, CI): the seed catalogue decides. The proxy only
 *   passes the seed when `DATABASE_URL` is unset.
 * - An undecodable address, or a `.`/`..`/backslash segment: refused for everyone.
 */
import catalog from '../../../data/seed/courses-catalog.json';
import { ADMIN_COOKIE_NAME } from '@/lib/admin/admin-constants';
import { isLmsClaimsAllowedAdminPanel } from '@/lib/admin/admin-panel-access';
import { isValidAdminSessionCookie } from '@/lib/admin/admin-session-edge';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import type { CourseSlugState, LookupCourseSlug } from '@/lib/seo/renamed-course-slugs';

import { isPublishedCourseStatus } from './course-status';

type CatalogPublicationFields = { slug: string; status?: string | null };

/**
 * Asset folders whose name differs from the slug of the course they belong to. This maps a
 * folder to its course; it does not decide access. The course's publication state still does.
 */
export const COURSE_ASSET_FOLDER_ALIASES: Readonly<Record<string, string>> = {
  // Course pack linked from /ccw-truckmount-operations (src/lib/ccw/truckmount-course.ts).
  'ccw-carsi-truckmount': 'ccw-carsi-truckmount-operations',
};

export function isPublishedCatalogCourse(course: CatalogPublicationFields): boolean {
  return isPublishedCourseStatus(course.status);
}

/** Slugs of the courses the seed catalogue marks as published. */
export function publishedCatalogSlugs(
  courses: readonly CatalogPublicationFields[]
): ReadonlySet<string> {
  return new Set(courses.filter(isPublishedCatalogCourse).map((c) => c.slug));
}

export const CATALOG_PUBLISHED_SLUGS = publishedCatalogSlugs(
  (catalog as { courses: CatalogPublicationFields[] }).courses
);

/**
 * The asset folder a request path names, or null when the path is not a course file.
 * A course file is `/courses/<folder>/<...>/<name>.<ext>`: at least one segment after the folder,
 * the last one carrying an extension. `/courses/<slug>` and `/courses/<slug>/payment-success`
 * are pages, not files, and return null. Returns `''` (refuse) when the path cannot be read
 * safely: bad percent-encoding, or a `.`/`..`/backslash segment.
 */
export function courseAssetFolder(pathname: string): string | null {
  const raw = pathname.split('/').filter((s) => s.length > 0);
  if (raw[0] !== 'courses' || raw.length < 2) return null;
  let segments: string[];
  try {
    segments = raw.map((s) => decodeURIComponent(s));
  } catch {
    return '';
  }
  // Checked before the segment count: the static file server decodes `%2F`, so
  // `/courses/<folder>%2F<path>` reaches a real file while looking like one segment here.
  if (segments.some((s) => s === '.' || s === '..' || s.includes('/') || s.includes('\\'))) {
    return '';
  }
  if (segments.length < 3) return null;
  const last = segments[segments.length - 1];
  if (!/\.[^./]+$/.test(last)) return null;
  return segments[1];
}

/** The course slug that owns an asset folder. */
export function courseSlugForAssetFolder(folder: string): string {
  return Object.prototype.hasOwnProperty.call(COURSE_ASSET_FOLDER_ALIASES, folder)
    ? COURSE_ASSET_FOLDER_ALIASES[folder]
    : folder;
}

/**
 * `serve`: anyone may have it. `serve-private`: an unpublished course's file, answered for staff
 * only and never cached. `refuse`: 404.
 */
export type CourseAssetDecision = 'not-a-course-asset' | 'serve' | 'serve-private' | 'refuse';

export type CourseAssetAccessDeps = {
  /** Publication state of a slug in the database; null when the database cannot be asked. */
  lookup: LookupCourseSlug;
  /** True when the request carries a staff (admin) session. Asked only for unpublished files. */
  isStaff: () => Promise<boolean>;
  /**
   * Seed catalogue published slugs, used only when NO database is configured (local runs, CI).
   * Leave it out where a database exists: a failed lookup must then refuse, never fall back.
   */
  seedWhenNoDatabase?: ReadonlySet<string>;
};

export async function courseAssetDecision(
  pathname: string,
  deps: CourseAssetAccessDeps
): Promise<CourseAssetDecision> {
  const folder = courseAssetFolder(pathname);
  if (folder === null) return 'not-a-course-asset';
  if (!folder) return 'refuse';
  const slug = courseSlugForAssetFolder(folder);
  const state = await deps.lookup(slug);
  const publiclyPublished =
    state === null ? Boolean(deps.seedWhenNoDatabase?.has(slug)) : state === 'published';
  if (publiclyPublished) return 'serve';
  return (await deps.isStaff()) ? 'serve-private' : 'refuse';
}

/**
 * Wraps a lookup with a short in-process cache of CLOSED answers only ('unpublished', 'absent').
 * A 'published' answer is never cached, so unpublishing closes the files on the next request;
 * a failed lookup (null) is never cached either. Caching closed answers only delays opening a
 * newly published course by up to the TTL, and stops invented folder names from costing a
 * database round trip each time.
 */
export function cachedCourseSlugLookup(
  lookup: LookupCourseSlug,
  { ttlMs = 60_000, maxEntries = 500, now = () => Date.now() } = {}
): LookupCourseSlug {
  const cache = new Map<string, { state: CourseSlugState; at: number }>();
  return async (slug) => {
    const key = slug.toLowerCase();
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.state;
    const state = await lookup(key);
    if (state === null || state === 'published') return state;
    // Unknown folders are chosen by the caller; bound the map rather than let it grow.
    if (cache.size >= maxEntries) cache.clear();
    cache.set(key, { state, at: now() });
    return state;
  };
}

/**
 * Staff session check for the proxy: a valid admin cookie, or a verified `auth_token` whose
 * role opens the admin panel (the same two checks the /admin gate in `updateSession` uses).
 */
export async function hasStaffSession(cookies: {
  get(name: string): { value: string } | undefined;
}): Promise<boolean> {
  if (await isValidAdminSessionCookie(cookies.get(ADMIN_COOKIE_NAME)?.value)) return true;
  const token = cookies.get('auth_token')?.value;
  if (!token) return false;
  const claims = await verifySessionToken(token);
  return claims ? isLmsClaimsAllowedAdminPanel(claims) : false;
}
